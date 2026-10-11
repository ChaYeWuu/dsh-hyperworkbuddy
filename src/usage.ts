/**
 * 本地请求流水与用量聚合。
 *
 * 上游每个响应都带 usage 块，回环端点顺手把它记成一行 JSONL——这是面板上所有
 * 统计的唯一数据来源。落盘保证重启后历史不丢，内存里同时维护增量聚合，面板
 * 每次轮询只是拼装现成的桶，不会重扫文件。
 *
 * @module dsh-hyperworkbuddy/usage
 */

import { mkdir, open, rm, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'

/** 落盘文件名。 */
export const USAGE_FILENAME = '.hyperworkbuddy-usage.jsonl'

/** 启动时最多读入的文件体积；更大时只读尾部。 */
const MAX_LOAD_BYTES = 32 * 1024 * 1024

/** 明细保留天数：够面板展示「近 7 天」即可。 */
const KEEP_DAYS = 8

/** 一条流水。 */
export interface UsageRow {
  /** 记录时刻（毫秒）。 */
  atMs: number
  /** 变体 id。 */
  variantId: string
  /** 账号标识。 */
  account: string
  /** 模型 id。 */
  model: string
  /** 是否成功。 */
  ok: boolean
  /** 失败类别；成功时省略。 */
  kind?: string
  promptTokens: number
  completionTokens: number
  cachedTokens: number
  totalTokens: number
  /** 从发出到结束的墙钟耗时（毫秒）。 */
  elapsedMs: number
}

/** 一组累计值。 */
export interface UsageTotals {
  requests: number
  errors: number
  promptTokens: number
  completionTokens: number
  cachedTokens: number
  totalTokens: number
}

/** 面板消费的用量汇总。 */
export interface UsageSummary {
  /** 全部历史。 */
  all: UsageTotals
  /** 今日。 */
  today: UsageTotals
  /** 缓存命中率（0–1）；没有输入 token 时为 undefined。 */
  cacheHitRate?: number
  /** 今日分账号；`nickname` 由 host 侧用账号池补齐，流水本身只记 id。 */
  byAccount: { account: string; nickname?: string; variantId: string; totals: UsageTotals }[]
  /** 今日分模型。 */
  byModel: { model: string; totals: UsageTotals }[]
  /** 近 7 天，按日期升序。 */
  daily: { day: string; totals: UsageTotals }[]
}

function emptyTotals(): UsageTotals {
  return { requests: 0, errors: 0, promptTokens: 0, completionTokens: 0, cachedTokens: 0, totalTokens: 0 }
}

/** 本地日期键 `YYYY-MM-DD`。 */
export function localDay(atMs: number): string {
  const date = new Date(atMs)
  const pad = (n: number): string => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

function addRow(target: UsageTotals, row: UsageRow): void {
  target.requests += 1
  if (!row.ok) target.errors += 1
  target.promptTokens += row.promptTokens
  target.completionTokens += row.completionTokens
  target.cachedTokens += row.cachedTokens
  target.totalTokens += row.totalTokens
}

/** 账号维度上额外记住它属于哪个版本。 */
type AccountTotals = UsageTotals & { variantId: string }

/** 一天的明细桶。 */
interface DayBucket {
  totals: UsageTotals
  accounts: Map<string, AccountTotals>
  models: Map<string, UsageTotals>
}

function numberField(value: unknown): number {
  const n = Number(value)
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 0
}

/** 校验并归一化一条落盘流水。 */
function parseRow(value: unknown): UsageRow | undefined {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return undefined
  const row = value as Record<string, unknown>
  const atMs = Number(row['atMs'])
  if (!Number.isFinite(atMs) || atMs <= 0) return undefined
  return {
    atMs,
    variantId: typeof row['variantId'] === 'string' ? row['variantId'] : '',
    account: typeof row['account'] === 'string' ? row['account'] : '',
    model: typeof row['model'] === 'string' ? row['model'] : '',
    ok: row['ok'] !== false,
    ...typeof row['kind'] === 'string' && row['kind'] !== '' ? { kind: row['kind'] } : {},
    promptTokens: numberField(row['promptTokens']),
    completionTokens: numberField(row['completionTokens']),
    cachedTokens: numberField(row['cachedTokens']),
    totalTokens: numberField(row['totalTokens']),
    elapsedMs: numberField(row['elapsedMs']),
  }
}

/**
 * 用量流水。
 *
 * 写入是「先落盘再入桶」：聚合错了顶多面板数字难看，流水错了就再也补不回来。
 */
export class UsageLedger {
  private readonly path: string
  private readonly all = emptyTotals()
  private readonly days = new Map<string, DayBucket>()
  /** 跳过写入（落盘失败时置位，避免每次请求都重复报错）。 */
  private writeDisabled = false

  constructor(homeDir: string) {
    this.path = join(homeDir, USAGE_FILENAME)
  }

  /** 流水文件路径。 */
  get filePath(): string {
    return this.path
  }

  /** 从磁盘折入历史流水。 */
  async load(): Promise<void> {
    const text = await this.readTail()
    if (text === '') return
    for (const line of text.split('\n')) {
      const trimmed = line.trim()
      if (trimmed === '') continue
      try {
        const row = parseRow(JSON.parse(trimmed) as unknown)
        if (row !== undefined) this.fold(row)
      } catch {
        // 半行或损坏行直接跳过，不影响其余记录。
      }
    }
  }

  /** 读取文件内容；超大时只取尾部，并丢弃首个残行。 */
  private async readTail(): Promise<string> {
    let handle
    try {
      handle = await open(this.path, 'r')
    } catch {
      return ''
    }
    try {
      const size = (await handle.stat()).size
      if (size === 0) return ''
      const start = size > MAX_LOAD_BYTES ? size - MAX_LOAD_BYTES : 0
      const buffer = Buffer.alloc(size - start)
      await handle.read(buffer, 0, buffer.length, start)
      const text = buffer.toString('utf8')
      if (start === 0) return text
      const firstBreak = text.indexOf('\n')
      return firstBreak < 0 ? '' : text.slice(firstBreak + 1)
    } catch {
      return ''
    } finally {
      await handle.close().catch(() => undefined)
    }
  }

  /** 记一条流水：先落盘，再入内存桶。 */
  async record(row: UsageRow): Promise<void> {
    this.fold(row)
    if (this.writeDisabled) return
    try {
      await mkdir(dirname(this.path), { recursive: true })
      await writeFile(this.path, `${JSON.stringify(row)}\n`, { encoding: 'utf8', flag: 'a' })
    } catch {
      // 落盘不可用不该让请求失败；停掉写入，面板仍显示内存里的本次会话数据。
      this.writeDisabled = true
    }
  }

  /** 折进内存聚合。 */
  private fold(row: UsageRow): void {
    addRow(this.all, row)
    const day = localDay(row.atMs)
    let bucket = this.days.get(day)
    if (bucket === undefined) {
      bucket = { totals: emptyTotals(), accounts: new Map(), models: new Map() }
      this.days.set(day, bucket)
      this.prune()
    }
    addRow(bucket.totals, row)
    if (row.account !== '') {
      const totals = bucket.accounts.get(row.account) ?? { ...emptyTotals(), variantId: row.variantId }
      addRow(totals, row)
      bucket.accounts.set(row.account, totals)
    }
    if (row.model !== '') {
      const totals = bucket.models.get(row.model) ?? emptyTotals()
      addRow(totals, row)
      bucket.models.set(row.model, totals)
    }
  }

  /** 丢掉过期的日桶，内存占用不随运行时长增长。 */
  private prune(): void {
    if (this.days.size <= KEEP_DAYS) return
    const cutoff = localDay(Date.now() - (KEEP_DAYS - 1) * 86_400_000)
    for (const day of [...this.days.keys()]) {
      if (day < cutoff) this.days.delete(day)
    }
  }

  /** 面板用的汇总。 */
  summary(): UsageSummary {
    const today = this.days.get(localDay(Date.now()))
    const daily: { day: string; totals: UsageTotals }[] = []
    for (let back = 6; back >= 0; back--) {
      const day = localDay(Date.now() - back * 86_400_000)
      daily.push({ day, totals: this.days.get(day)?.totals ?? emptyTotals() })
    }
    const todayTotals = today?.totals ?? emptyTotals()
    return {
      all: { ...this.all },
      today: { ...todayTotals },
      ...todayTotals.promptTokens === 0
        ? {}
        : { cacheHitRate: todayTotals.cachedTokens / todayTotals.promptTokens },
      byAccount: [...(today?.accounts ?? new Map<string, AccountTotals>()).entries()]
        .map(([account, totals]) => ({
          account,
          variantId: totals.variantId,
          totals: {
            requests: totals.requests,
            errors: totals.errors,
            promptTokens: totals.promptTokens,
            completionTokens: totals.completionTokens,
            cachedTokens: totals.cachedTokens,
            totalTokens: totals.totalTokens,
          },
        }))
        .sort((a, b) => b.totals.totalTokens - a.totals.totalTokens || b.totals.requests - a.totals.requests),
      byModel: [...(today?.models ?? new Map<string, UsageTotals>()).entries()]
        .map(([model, totals]) => ({ model, totals: { ...totals } }))
        .sort((a, b) => b.totals.totalTokens - a.totals.totalTokens || b.totals.requests - a.totals.requests),
      daily,
    }
  }

  /** 清空流水与聚合。 */
  async clear(): Promise<void> {
    this.all.requests = 0
    this.all.errors = 0
    this.all.promptTokens = 0
    this.all.completionTokens = 0
    this.all.cachedTokens = 0
    this.all.totalTokens = 0
    this.days.clear()
    await rm(this.path, { force: true }).catch(() => undefined)
  }
}

/** 从上游 usage 块里取三个可计数字段。 */
export function readUsageBlock(usage: unknown): {
  promptTokens: number
  completionTokens: number
  cachedTokens: number
  totalTokens: number
} | undefined {
  if (typeof usage !== 'object' || usage === null || Array.isArray(usage)) return undefined
  const block = usage as Record<string, unknown>
  const promptTokens = numberField(block['prompt_tokens'] ?? block['input_tokens'])
  const completionTokens = numberField(block['completion_tokens'] ?? block['output_tokens'])
  const totalTokens = numberField(block['total_tokens']) || promptTokens + completionTokens
  if (promptTokens === 0 && completionTokens === 0 && totalTokens === 0) return undefined
  return {
    promptTokens,
    completionTokens,
    cachedTokens: cachedTokenCount(block),
    totalTokens,
  }
}

/**
 * SSE 里的 usage 采集器。
 *
 * 上游对 `stream_options.include_usage` 的响应有两处习惯：末尾一个只带 usage 的
 * 事件块，或在每个块里重复整份累计 usage。两种情况都取「最后一个非空快照」——
 * 累计值不能用求和，否则会被算成翻倍。
 */
export function createUsageTap(): { feed(chunk: Buffer | string): void; usage(): UsageFields | undefined } {
  let buffer = ''
  let last: UsageFields | undefined
  return {
    feed(chunk: Buffer | string): void {
      buffer += typeof chunk === 'string' ? chunk : chunk.toString('utf8')
      let index = buffer.indexOf('\n')
      while (index >= 0) {
        const line = buffer.slice(0, index).trim()
        buffer = buffer.slice(index + 1)
        index = buffer.indexOf('\n')
        if (!line.startsWith('data:')) continue
        const payload = line.slice(5).trim()
        if (payload === '' || payload === '[DONE]') continue
        let parsed: unknown
        try {
          parsed = JSON.parse(payload)
        } catch {
          continue
        }
        const usage = readUsageBlock((parsed as Record<string, unknown>)['usage'])
        if (usage !== undefined) last = usage
      }
      // 缓冲区不该无界增长：长行不可能是合法的 data 事件。
      if (buffer.length > 1_048_576) buffer = ''
    },
    usage: () => last,
  }
}

/** usage 三个可计数字段。 */
export type UsageFields = NonNullable<ReturnType<typeof readUsageBlock>>

/**
 * 缓存命中数。
 *
 * 上游在不同路由下用过好几套字段名，取值顺序照抄面板口径：明细对象优先，
 * 再退到平铺字段。
 */
function cachedTokenCount(block: Record<string, unknown>): number {
  const details = typeof block['prompt_tokens_details'] === 'object' && block['prompt_tokens_details'] !== null
    ? block['prompt_tokens_details'] as Record<string, unknown>
    : {}
  const inputDetails = typeof block['input_tokens_details'] === 'object' && block['input_tokens_details'] !== null
    ? block['input_tokens_details'] as Record<string, unknown>
    : {}
  const candidates = [
    details['cached_tokens'],
    inputDetails['cached_tokens'],
    block['prompt_cache_hit_tokens'],
    block['cache_read_input_tokens'],
    block['cached_tokens'],
  ]
  for (const candidate of candidates) {
    const value = numberField(candidate)
    if (value > 0) return value
  }
  return 0
}
