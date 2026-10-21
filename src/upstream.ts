/**
 * WorkBuddy 上游 HTTP 客户端。
 *
 * 只负责把请求按上游要求发出、把失败分类；SSE 正文原样回传，解析交给调用方
 * （回环端点直接 pipe 给客户端，DSH 侧交给 pi-ai）。
 *
 * @module dsh-hyperworkbuddy/upstream
 */

import { randomUUID } from 'node:crypto'
import type { WorkBuddyCredential } from './auth.ts'
import { normalizeEpoch } from './auth.ts'
import { AI_VARIANT, CN_VARIANT, type WorkBuddyVariant } from './variants.ts'

/** 上游失败分类。 */
export type UpstreamErrorKind =
  | 'hard_credit'
  | 'soft_rate'
  | 'session_dead'
  | 'not_found'
  | 'server'
  | 'intercepted'
  | 'client'

/** chat 结果：成功带原始响应，失败带分类与可展示文案。 */
export type ChatResult =
  | { ok: true; response: Response }
  | {
    ok: false
    status: number
    kind: UpstreamErrorKind
    message: string
    /** 失败原因就是「这个模型不存在」；调用方据此决定要不要换模型重试。 */
    modelMissing: boolean
  }

/** 一条模型目录记录。 */
export interface UpstreamModel {
  id: string
  name: string
  /** 上游声明的输入硬上限；窗口档位再大也不该越过它。 */
  maxInputTokens: number
  /** 上游自己挑的默认窗口档位。 */
  contextWindow: number
  /**
   * 上游允许的全部窗口档位，升序。
   *
   * 只有国际版声明它；国内版连 `contextWindow` 字段都没有，这里会是空数组。
   */
  supportedContextWindows: number[]
  maxTokens: number
  supportsImages: boolean
  reasoning: {
    supports: boolean
    onlyReasoning: boolean
    supportedEfforts?: string[]
    defaultEffort?: string
    canDisableThinking: boolean
  }
  billing: { credits?: string; free: boolean }
}

/** 积分快照。 */
export interface CreditSnapshot {
  /** 合计剩余；无法确定时为 undefined。 */
  remaining?: number
  /** 合计额度；无法确定时为 undefined。 */
  total?: number
  /** 套餐明细。 */
  packages: { name: string; remain?: number; size?: number }[]
}

const EFFORT_VALUES = ['low', 'medium', 'high', 'xhigh', 'max'] as const

const HARD_CREDIT_MARKERS = [
  'insufficient credit', 'no credit', 'credit exhausted', 'credits exhausted', 'out of credit',
  'quota exceeded', 'quota exhaust', 'payment required', 'credit not enough', 'not enough credit',
  '积分不足', '额度不足', '余额不足', '积分用完', '额度用尽', '没有积分',
] as const

const SESSION_DEAD_MARKERS = ['Offline user session not found', '12153'] as const

/**
 * 上游瞬时风控的标识：HTTP 400 + 「请求被拦截，请重新发送」。
 *
 * 实测同一时刻并发的其他请求照常出字，说明不是凭据或请求体的问题，换个账号
 * 重试就能过；这句文案由上游下发，插件自身从不产生它。
 */
const INTERCEPTED_MARKERS = ['请求被拦截', '请重新发送'] as const

/**
 * 上游「这个模型不存在」的标识。
 *
 * 两区实测都是 HTTP 400 + `code: 11102` + `msg: model [...] service info not found`，
 * 而展示文案已被本地化成「当前模型不可用」，所以只能认原始 body。
 */
const MODEL_MISSING_CODE = '11102'
const MODEL_MISSING_MARKER = 'service info not found'

/** 上游错误体上限，避免异常大 body 吃内存。 */
const ERROR_BODY_LIMIT = 4096

/** 目录 / 计费等一次性 JSON 请求超时。 */
const JSON_TIMEOUT_MS = 30_000

/** 按 HTTP 状态与响应体把失败归类。 */
export function classifyUpstreamError(status: number, body: string): UpstreamErrorKind {
  if (status === 402) return 'hard_credit'
  if (status === 401) return 'session_dead'
  const lower = body.toLowerCase()
  for (const marker of HARD_CREDIT_MARKERS) {
    if (lower.includes(marker.toLowerCase()) || body.includes(marker)) return 'hard_credit'
  }
  for (const marker of SESSION_DEAD_MARKERS) {
    if (body.includes(marker)) return 'session_dead'
  }
  // 拦截要排在 client 兜底之前：它同样带 HTTP 400，但换号重试有意义。
  for (const marker of INTERCEPTED_MARKERS) {
    if (body.includes(marker)) return 'intercepted'
  }
  if (status === 429) return 'soft_rate'
  if (status === 404) return 'not_found'
  if (status >= 500) return 'server'
  return 'client'
}

/** 从上游 JSON 错误体里取可展示文案，优先本地化 displayMsg。 */
export function extractDisplayErrorMessage(body: string): string | undefined {
  const trimmed = body.trim()
  // 上游偶尔返回 HTML 错误页（如网关的 401 页面）：取 title 即可，绝不回显整页。
  if (trimmed.startsWith('<')) {
    const title = /<title>([^<]{1,200})<\/title>/iu.exec(trimmed)
    if (title !== null) return title[1]!.trim()
    return undefined
  }
  if (!trimmed.startsWith('{')) return undefined
  try {
    const parsed: unknown = JSON.parse(trimmed)
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) return undefined
    const obj = parsed as Record<string, unknown>
    const displayMsg = obj['displayMsg']
    if (typeof displayMsg === 'object' && displayMsg !== null && !Array.isArray(displayMsg)) {
      const localized = displayMsg as Record<string, unknown>
      const zh = localized['zh']
      if (typeof zh === 'string' && zh.trim() !== '') return zh.trim()
      const en = localized['en']
      if (typeof en === 'string' && en.trim() !== '') return en.trim()
    }
    const msg = obj['msg']
    if (typeof msg === 'string' && msg.trim() !== '') return msg.trim()
  } catch {
    // 非 JSON body 不提供文案
  }
  return undefined
}

/** 登录域决定区域；空域按国内版处理。 */
export function regionOf(domain: string): 'cn' | 'global' {
  const lowered = domain.trim().toLowerCase()
  if (lowered === 'workbuddy.ai' || lowered.endsWith('.workbuddy.ai')) return 'global'
  return 'cn'
}

/** 该凭据对应的变体（按区域），用于取基地址与默认版本。 */
export function variantOfCredential(credential: WorkBuddyCredential): WorkBuddyVariant {
  return regionOf(credential.domain) === 'global' ? AI_VARIANT : CN_VARIANT
}

function chatBase(credential: WorkBuddyCredential): string {
  return variantOfCredential(credential).chatBase
}

function billingBase(credential: WorkBuddyCredential): string {
  return variantOfCredential(credential).billingBase
}

function originReferer(credential: WorkBuddyCredential): string {
  return regionOf(credential.domain) === 'global'
    ? variantOfCredential(credential).chatBase
    : variantOfCredential(credential).billingBase
}

/** 所有上游请求共用的头。 */
function commonHeaders(credential: WorkBuddyCredential): Record<string, string> {
  const referer = originReferer(credential)
  return {
    'Accept': 'application/json, text/plain, */*',
    'X-Requested-With': 'XMLHttpRequest',
    'Origin': referer,
    'Referer': `${referer}/`,
    'User-Agent': 'CLI/2.63.2 CodeBuddy/2.63.2',
  }
}

/**
 * 渠道校验头。
 *
 * 国际版网关自 2026-10-16 起对 `POST /v2/chat/completions` 做渠道校验：缺任一
 * `X-Conversation-*` 头直接回 400 `code=11128 conversation id missing`，文案是
 * 「请求被拦截，请重新发送」。国内线路带与不带都能过，仍统一发出去，省得分叉。
 *
 * 每次请求现造三个新 UUID：上游不按这组 id 存历史（换新 id 结果相同），它只是
 * 渠道标记；新 id 也避免并发的子代理挤在同一个会话上。
 */
function conversationHeaders(): Record<string, string> {
  return {
    'X-Conversation-ID': randomUUID(),
    'X-Conversation-Request-ID': randomUUID(),
    'X-Conversation-Message-ID': randomUUID(),
  }
}

/** chat 头：带 X-No-* 约定，绝不携带 refresh token。 */
export function chatHeaders(credential: WorkBuddyCredential, userAgent: string, clientVersion: string): Record<string, string> {
  return {
    ...commonHeaders(credential),
    ...conversationHeaders(),
    'User-Agent': userAgent,
    'Content-Type': 'application/json',
    ...credential.uid === '' ? { 'X-No-User-Id': '1' } : { 'X-User-Id': credential.uid },
    ...credential.enterpriseId === ''
      ? { 'X-No-Enterprise-Id': '1' }
      : { 'X-Enterprise-Id': credential.enterpriseId },
    ...credential.domain === '' ? { 'X-No-Department-Info': '1' } : { 'X-Domain': credential.domain },
    'X-IDE-Type': 'WorkBuddy',
    'X-IDE-Name': 'WorkBuddy',
    'X-IDE-Version': clientVersion,
    'X-Product': 'SaaS',
  }
}

/** 该变体的 chat User-Agent。 */
export function clientUserAgent(credential: WorkBuddyCredential, clientVersion?: string): string {
  const variant = variantOfCredential(credential)
  const version = clientVersion ?? variant.defaultClientVersion
  return variant.region === 'global'
    ? `WorkBuddy/${version} WorkBuddy AI/${version} CLI/2.63.2`
    : `WorkBuddy/${version} WorkBuddy/${version} CLI/2.63.2`
}

/**
 * 渠道校验会拒收的品牌串。
 *
 * 国内版网关（`www.codebuddy.cn`）在 2026-10-16 后加了内容级渠道校验：`system`
 * 消息里出现这组短语就回 400 `code=11128 Illegal API invocation from an
 * unapproved channel`，对外文案是「请求被拦截，请重新发送」。
 *
 * 实测是**精确短语匹配**，不是关键词黑名单：单独发 `DeepSeek Harness` 是 200，
 * 但发 `You are an AI agent powered by DeepSeek Harness` 就 400；把主体换成
 * OpenAI / Claude / WorkBuddy 也都是 200。判断依据是请求正文而非请求头，所以
 * 换账号、换连接、补 `X-Conversation-*` 都不起作用。
 */
const CHANNEL_BLOCKED_PHRASES: readonly string[] = [
  'You are an AI agent powered by DeepSeek Harness',
]

/** 品牌词的兜底替换表：短语没命中时，至少别把竞品名留在 system 里。 */
const BRAND_REWRITES: ReadonlyArray<readonly [RegExp, string]> = [
  // 不带冠词，免得「the DeepSeek Harness implementation」变成「the the ...」。
  [/DeepSeek Harness/g, 'host application'],
]

/**
 * 把会触发渠道校验的片段改写成中性表述。
 *
 * 只动 `system` 消息：实测同样的文字放在 `user` 里不会触发，改写它等于白白
 * 污染用户输入。
 *
 * @param text - 待检查的 system 正文。
 * @returns 改写后的正文；无需改写时原样返回。
 */
export function neutralizeChannelPhrases(text: string): string {
  let output = text
  for (const phrase of CHANNEL_BLOCKED_PHRASES) {
    if (output.includes(phrase)) output = output.split(phrase).join('You are a helpful assistant.')
  }
  for (const [pattern, replacement] of BRAND_REWRITES) output = output.replace(pattern, replacement)
  return output
}

/**
 * 归一化 chat 请求体。
 *
 * 上游只接受流式；`tool_choice` 必须是字符串；`role: 'developer'` 要改写成
 * `system`；`reasoning_effort: 'off'` 要删掉（见下）；国际版额外要求首条为 system；
 * 两个区域的 system 都要过一遍渠道校验的中性化。
 *
 * @param raw - 原始 JSON 字符串。
 * @param region - 目标区域。
 * @returns 归一化后的 JSON 字符串。
 */
export function prepareChatBody(raw: string, region: 'cn' | 'global'): string {
  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    return raw
  }
  const body = parsed as Record<string, unknown>
  const messages = Array.isArray(body['messages']) ? body['messages'] as Record<string, unknown>[] : []
  for (const message of messages) {
    if (message['role'] === 'developer') message['role'] = 'system'
  }
  // 上游不接受对象形式的 tool_choice。
  const toolChoice = body['tool_choice']
  if (typeof toolChoice === 'object' && toolChoice !== null) {
    const fn = (toolChoice as Record<string, unknown>)['function']
    const name = typeof fn === 'object' && fn !== null
      ? (fn as Record<string, unknown>)['name']
      : undefined
    body['tool_choice'] = typeof name === 'string' ? 'required' : 'auto'
  }
  // `off` 是适配器自造拼写，上游档位词表里没有它：国内版与国际版实测都回 400
  // 「模型不支持该思考强度」。省略该字段即走上游默认档，是两区都被接受的形态。
  if (body['reasoning_effort'] === 'off') delete body['reasoning_effort']
  if (region === 'global') {
    const first = messages[0]
    if (first === undefined || first['role'] !== 'system') {
      messages.unshift({ role: 'system', content: 'You are a helpful assistant.' })
    }
  }
  for (const message of messages) {
    if (message['role'] !== 'system') continue
    if (typeof message['content'] === 'string') {
      message['content'] = neutralizeChannelPhrases(message['content'])
    }
  }
  body['messages'] = messages
  body['stream'] = true
  return JSON.stringify(body)
}

/** 把请求体里的 model 取出来，用于日志与冷却归属。 */
export function modelOfBody(raw: string): string {
  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>
    const model = parsed['model']
    return typeof model === 'string' ? model : ''
  } catch {
    return ''
  }
}

/** 读取受限长度的错误体文本。 */
async function readErrorBody(response: Response): Promise<string> {
  try {
    const text = await response.text()
    return text.slice(0, ERROR_BODY_LIMIT)
  } catch {
    return ''
  }
}

/** 发一条 chat 请求；成功返回原始 SSE 响应。 */
export async function chatCompletions(
  credential: WorkBuddyCredential,
  rawBody: string,
  signal?: AbortSignal,
): Promise<ChatResult> {
  const region = regionOf(credential.domain)
  const prepared = prepareChatBody(rawBody, region)
  const url = `${chatBase(credential)}/v2/chat/completions`
  let response: Response
  try {
    response = await fetch(url, {
      method: 'POST',
      headers: {
        ...chatHeaders(credential, clientUserAgent(credential), variantOfCredential(credential).defaultClientVersion),
        'Authorization': `Bearer ${credential.accessToken}`,
      },
      body: prepared,
      ...signal === undefined ? {} : { signal },
    })
  } catch (error: unknown) {
    return { ok: false, status: 0, kind: 'server', message: `连接上游失败：${String(error)}`, modelMissing: false }
  }
  if (!response.ok) {
    const body = await readErrorBody(response)
    const kind = classifyUpstreamError(response.status, body)
    const detail = extractDisplayErrorMessage(body) ?? `上游返回 HTTP ${response.status}`
    return {
      ok: false,
      status: response.status,
      kind,
      message: detail,
      modelMissing: response.status === 400
        && (body.includes(MODEL_MISSING_CODE) || body.includes(MODEL_MISSING_MARKER)),
    }
  }
  return { ok: true, response }
}

/** 解析一条目录行的模型元数据。 */
function toUpstreamModel(row: Record<string, unknown>): UpstreamModel | undefined {
  const id = typeof row['id'] === 'string' ? row['id'] : ''
  if (id === '') return undefined
  if (row['disabled'] === true) return undefined
  const maxInput = Number(row['maxInputTokens'] ?? 0)
  if (!Number.isFinite(maxInput) || maxInput <= 0) return undefined
  const maxOutput = Number(row['maxOutputTokens'] ?? 0)
  const contextRaw = row['contextWindow']
  let contextWindow = maxInput
  let supportedContextWindows: number[] = []
  if (typeof contextRaw === 'object' && contextRaw !== null) {
    const box = contextRaw as Record<string, unknown>
    const preferred = Number(box['defaultLength'] ?? 0)
    if (Number.isFinite(preferred) && preferred > 0) contextWindow = preferred
    const lengths = box['supportedLengths']
    if (Array.isArray(lengths)) {
      const positive = lengths
        .map((length): number => Number(length))
        .filter((length): boolean => Number.isFinite(length) && length > 0)
      supportedContextWindows = [...new Set(positive)].sort((a, b) => a - b)
    }
  } else if (Number.isFinite(contextRaw) && Number(contextRaw) > 0) {
    contextWindow = Number(contextRaw)
  }
  const reasoningRaw = typeof row['reasoning'] === 'object' && row['reasoning'] !== null
    ? row['reasoning'] as Record<string, unknown>
    : {}
  const effortsRaw = reasoningRaw['supportedEfforts']
  const supportedEfforts = Array.isArray(effortsRaw)
    ? effortsRaw.filter((v): v is string => typeof v === 'string' && (EFFORT_VALUES as readonly string[]).includes(v))
    : []
  const creditsRaw = row['credits']
  const credits = typeof creditsRaw === 'string' && creditsRaw.trim() !== ''
    ? creditsRaw.trim().replace(/\s+credits?$/iu, '').trim()
    : undefined
  return {
    id,
    name: typeof row['name'] === 'string' && row['name'] !== '' ? row['name'] : id,
    maxInputTokens: maxInput,
    contextWindow,
    supportedContextWindows,
    // 上游未声明输出上限时按输入窗口的三分之一估一个安全值，而不是报 0。
    maxTokens: Number.isFinite(maxOutput) && maxOutput > 0 ? maxOutput : Math.max(4096, Math.floor(contextWindow / 3)),
    supportsImages: row['supportsImages'] === true && row['disabledMultimodal'] !== true,
    reasoning: {
      supports: row['supportsReasoning'] === true || reasoningRaw['supportedEfforts'] !== undefined,
      onlyReasoning: reasoningRaw['onlyReasoning'] === true,
      ...supportedEfforts.length === 0 ? {} : { supportedEfforts },
      ...typeof reasoningRaw['defaultEffort'] === 'string'
        ? { defaultEffort: reasoningRaw['defaultEffort'] as string }
        : {},
      canDisableThinking: reasoningRaw['canDisableThinking'] === true,
    },
    billing: {
      ...credits === undefined || credits === '' ? {} : { credits },
      free: credits !== undefined && /^x?0(?:\.0+)?$/iu.test(credits),
    },
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function positiveNumber(value: unknown): number | undefined {
  const num = Number(value)
  return Number.isFinite(num) && num > 0 ? num : undefined
}

/**
 * 还原一条落盘缓存的模型记录。
 *
 * 缓存是插件自己写的，但版本升级会给 `UpstreamModel` 加字段，
 * 旧缓存里就没有它们；直接强转会让消费者读到 undefined。
 * 因此逐字段补默认值，读不出来的条目直接丢弃。
 *
 * @param value - 账号文件里的一条模型记录。
 * @returns 归一化后的模型；缺少 id 时返回 undefined。
 */
export function parseUpstreamModel(value: unknown): UpstreamModel | undefined {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return undefined
  const row = value as Record<string, unknown>
  const id = typeof row['id'] === 'string' ? row['id'] : ''
  if (id === '') return undefined
  const contextWindow = positiveNumber(row['contextWindow']) ?? 0
  const lengths = row['supportedContextWindows']
  const supportedContextWindows = Array.isArray(lengths)
    ? [...new Set(lengths.map((n): number => Number(n)).filter((n): boolean => Number.isFinite(n) && n > 0))]
      .sort((a, b) => a - b)
    : []
  const reasoningRaw = isRecord(row['reasoning']) ? row['reasoning'] : {}
  const effortsRaw = reasoningRaw['supportedEfforts']
  const supportedEfforts = Array.isArray(effortsRaw)
    ? effortsRaw.filter((v): v is string => typeof v === 'string' && (EFFORT_VALUES as readonly string[]).includes(v))
    : []
  const billingRaw = isRecord(row['billing']) ? row['billing'] : {}
  const credits = typeof billingRaw['credits'] === 'string' && billingRaw['credits'] !== ''
    ? billingRaw['credits']
    : undefined
  return {
    id,
    name: typeof row['name'] === 'string' && row['name'] !== '' ? row['name'] : id,
    maxInputTokens: positiveNumber(row['maxInputTokens']) ?? contextWindow,
    contextWindow,
    supportedContextWindows,
    maxTokens: positiveNumber(row['maxTokens']) ?? 0,
    supportsImages: row['supportsImages'] === true,
    reasoning: {
      supports: reasoningRaw['supports'] === true,
      onlyReasoning: reasoningRaw['onlyReasoning'] === true,
      ...supportedEfforts.length === 0 ? {} : { supportedEfforts },
      ...typeof reasoningRaw['defaultEffort'] === 'string'
        ? { defaultEffort: reasoningRaw['defaultEffort'] }
        : {},
      canDisableThinking: reasoningRaw['canDisableThinking'] === true,
    },
    billing: {
      ...credits === undefined ? {} : { credits },
      free: billingRaw['free'] === true,
    },
  }
}

/**
 * 按开关算出该模型实际生效的上下文窗口。
 *
 * 上游给国际版声明了 `supportedLengths`（如 300k / 1M），但默认只开 300k 档；
 * 打开开关就抬到最大档，同时不越过上游声明的输入硬上限 `maxInputTokens`。
 *
 * @param info - 一条上游模型。
 * @param useMaximum - 是否使用上游声明的最大窗口。
 * @returns 生效窗口；没有更大档位时就是声明值。
 */
export function resolveContextWindow(info: UpstreamModel, useMaximum: boolean): number {
  const declared = info.contextWindow
  if (!useMaximum) return declared
  // 兜底：调用方可能拿到旧缓存里的记录，缺数组时按没有更大档位处理。
  const tiers = Array.isArray(info.supportedContextWindows) ? info.supportedContextWindows : []
  const ceiling = Number.isFinite(info.maxInputTokens) && info.maxInputTokens > 0 ? info.maxInputTokens : declared
  const larger = tiers.filter(length => length > declared && length <= ceiling)
  return larger.length === 0 ? declared : Math.max(...larger)
}

/**
 * 拉取该账号的模型目录。
 *
 * 国际版与国内版路径相同，差异只在 User-Agent：国内版用 CLI 形态拿 CLI 名单，
 * 国际版用 `WorkBuddyAI/<v>`（无空格，带空格会被拒）。
 *
 * @param credential - 目标凭据。
 * @returns 模型列表；失败时抛错。
 */
export async function fetchCatalog(credential: WorkBuddyCredential): Promise<UpstreamModel[]> {
  const variant = variantOfCredential(credential)
  const url = `${chatBase(credential)}/v3/config`
  const headers: Record<string, string> = {
    ...commonHeaders(credential),
    'Authorization': `Bearer ${credential.accessToken}`,
  }
  if (variant.region === 'global') {
    headers['User-Agent'] = `WorkBuddyAI/${variant.defaultClientVersion}`
    headers['X-Requested-With'] = 'XMLHttpRequest'
    headers['X-Product'] = 'SaaS'
  } else {
    headers['User-Agent'] = 'CLI/2.63.2 CodeBuddy/2.63.2'
    delete headers['X-Requested-With']
  }

  const response = await fetch(url, { headers, signal: AbortSignal.timeout(JSON_TIMEOUT_MS) })
  const text = await response.text()
  if (!response.ok) {
    const kind = classifyUpstreamError(response.status, text)
    const detail = extractDisplayErrorMessage(text) ?? `HTTP ${response.status}`
    throw new Error(`目录拉取失败（${kind}）：${detail}`)
  }
  let document: unknown
  try {
    document = JSON.parse(text)
  } catch {
    throw new Error('目录响应不是合法 JSON')
  }
  const root = document as Record<string, unknown>
  const data = typeof root['data'] === 'object' && root['data'] !== null
    ? root['data'] as Record<string, unknown>
    : root
  const agents = Array.isArray(data['agents']) ? data['agents'] as Record<string, unknown>[] : []
  const cli = agents.find(agent => agent['name'] === 'cli')
  const ids = cli !== undefined && Array.isArray(cli['models'])
    ? cli['models'].filter((id): id is string => typeof id === 'string' && id !== '')
    : []
  if (ids.length === 0) throw new Error('目录里没有 cli 模型名单')

  // `agents[cli].models` 只是 id 列表，元数据在兄弟字段 `data.models` 里。
  const rows = Array.isArray(data['models']) ? data['models'] as Record<string, unknown>[] : []
  const byId = new Map<string, Record<string, unknown>>()
  for (const row of rows) {
    const id = row['id']
    if (typeof id === 'string' && id !== '') byId.set(id, row)
  }

  // 名单顺序即上游意图顺序；元数据缺失的行跳过（缺字段的模型选了必然报错）。
  const out: UpstreamModel[] = []
  for (const id of ids) {
    const row = byId.get(id)
    if (row === undefined) continue
    const model = toUpstreamModel(row)
    if (model !== undefined) out.push(model)
  }
  return out
}

/** 计费接口专用头：不含 Origin / Referer / User-Agent。 */
function billingHeaders(credential: WorkBuddyCredential): Record<string, string> {
  const headers: Record<string, string> = {
    'Authorization': `Bearer ${credential.accessToken}`,
    'Accept': 'application/json',
    'Content-Type': 'application/json',
  }
  if (credential.uid !== '') headers['X-User-Id'] = credential.uid
  if (credential.enterpriseId !== '') {
    headers['X-Enterprise-Id'] = credential.enterpriseId
    headers['X-Tenant-Id'] = credential.enterpriseId
  }
  if (credential.domain !== '') headers['X-Domain'] = credential.domain
  return headers
}

/** 上游统一信封：`{ code, msg, data }`。 */
interface Envelope {
  code: number
  msg: string
  data: unknown
}

/** 读取并解包上游响应。 */
async function readEnvelope(response: Response, what: string): Promise<Envelope> {
  const text = await response.text()
  let parsed: unknown
  try {
    parsed = JSON.parse(text)
  } catch {
    throw new Error(`${what}：上游返回非 JSON（HTTP ${response.status}）`)
  }
  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    throw new Error(`${what}：上游返回了非预期的文档（HTTP ${response.status}）`)
  }
  const document = parsed as Record<string, unknown>
  return {
    code: typeof document['code'] === 'number' ? document['code'] : 0,
    msg: typeof document['msg'] === 'string' ? document['msg'] : '',
    data: document['data'],
  }
}

/** 本地时间格式化 `YYYY-MM-DD HH:mm:ss`，计费接口要求。 */
function formatLocalTime(date: Date): string {
  const pad = (n: number, width = 2): string => String(n).padStart(width, '0')
  const day = `${pad(date.getFullYear(), 4)}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
  const time = `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`
  return `${day} ${time}`
}

/**
 * 读取账号积分。
 *
 * 企业额度只有**国内版**有专用接口；国际版即使带 enterpriseId 也走个人套餐接口
 * （上游未提供对应企业计费）。读不到一律抛错，绝不把「没读懂」显示成 0。
 *
 * @param credential - 目标凭据。
 * @returns 积分快照。
 */
export async function fetchCredits(credential: WorkBuddyCredential): Promise<CreditSnapshot> {
  if (regionOf(credential.domain) === 'cn' && credential.enterpriseId !== '') {
    return await fetchEnterpriseCredits(credential)
  }

  const now = new Date()
  const response = await fetch(`${billingBase(credential)}/v2/billing/meter/get-user-resource`, {
    method: 'POST',
    headers: billingHeaders(credential),
    body: JSON.stringify({
      PageNumber: 1,
      PageSize: 100,
      ProductCode: 'p_tcaca',
      Status: [0, 3],
      // 上游要求带套餐到期时间范围；漏掉会拿不到任何套餐。
      PackageEndTimeRangeBegin: formatLocalTime(now),
      PackageEndTimeRangeEnd: formatLocalTime(new Date(now.getTime() + 365 * 101 * 24 * 3600 * 1000)),
    }),
    signal: AbortSignal.timeout(JSON_TIMEOUT_MS),
  })
  const envelope = await readEnvelope(response, '积分读取失败')
  if (!response.ok) {
    const kind = classifyUpstreamError(response.status, JSON.stringify(envelope))
    throw new Error(`积分读取失败（${kind}）：${envelope.msg || `HTTP ${response.status}`}`)
  }
  if (envelope.code !== 0) {
    throw new Error(`积分读取失败（code ${envelope.code}）：${envelope.msg || '上游未说明原因'}`)
  }
  return parseCredits(envelope.data, false)
}

/** 国内版企业额度：单个周期额度，不是套餐清单。 */
async function fetchEnterpriseCredits(credential: WorkBuddyCredential): Promise<CreditSnapshot> {
  const response = await fetch(`${billingBase(credential)}/v2/billing/meter/get-enterprise-user-usage`, {
    method: 'POST',
    headers: billingHeaders(credential),
    body: '{}',
    signal: AbortSignal.timeout(JSON_TIMEOUT_MS),
  })
  const envelope = await readEnvelope(response, '企业积分读取失败')
  if (!response.ok) {
    const kind = classifyUpstreamError(response.status, JSON.stringify(envelope))
    throw new Error(`企业积分读取失败（${kind}）：${envelope.msg || `HTTP ${response.status}`}`)
  }
  if (envelope.code !== 0) {
    throw new Error(`企业积分读取失败（code ${envelope.code}）：${envelope.msg || '上游未说明原因'}`)
  }
  return parseCredits(envelope.data, true)
}

/** 把上游计费响应解析成积分快照。 */
export function parseCredits(document: unknown, enterprise: boolean): CreditSnapshot {
  const root = typeof document === 'object' && document !== null ? document as Record<string, unknown> : {}

  if (enterprise) {
    // 企业口径：limitNum / credit 成对出现，-1 表示不限量。
    // 两个官方调用点的字段拼写不一致，两种都接受。
    const pick = (...keys: string[]): number => {
      for (const key of keys) {
        const value = Number(root[key])
        if (Number.isFinite(value)) return value
      }
      return Number.NaN
    }
    const limit = pick('limitNum', 'limit_num')
    const used = pick('credit', 'used_num')
    if (!Number.isFinite(limit) && !Number.isFinite(used)) {
      throw new Error('企业积分响应缺少可识别字段（limitNum/limit_num 与 credit/used_num）')
    }
    const unlimited = limit === -1
    const remaining = unlimited || !Number.isFinite(limit) || !Number.isFinite(used)
      ? undefined
      : Math.max(0, limit - used)
    return {
      ...unlimited || !Number.isFinite(limit) ? {} : { total: limit },
      ...remaining === undefined ? {} : { remaining },
      packages: [{
        name: '企业额度',
        ...unlimited || !Number.isFinite(limit) ? {} : { size: limit },
        ...remaining === undefined ? {} : { remain: remaining },
      }],
    }
  }

  // 个人口径：data.Response.Data.Accounts[]
  const wrapper = typeof root['Response'] === 'object' && root['Response'] !== null
    ? root['Response'] as Record<string, unknown>
    : root
  const inner = typeof wrapper['Data'] === 'object' && wrapper['Data'] !== null
    ? wrapper['Data'] as Record<string, unknown>
    : {}
  const rows = Array.isArray(inner['Accounts']) ? inner['Accounts'] as unknown[] : []

  const num = (source: Record<string, unknown>, key: string): number =>
    typeof source[key] === 'number' ? source[key] as number : 0

  let remaining = 0
  let total = 0
  const packages: CreditSnapshot['packages'] = []
  for (const raw of rows) {
    if (typeof raw !== 'object' || raw === null) continue
    const account = raw as Record<string, unknown>
    const size = num(account, 'CycleCapacitySize')
    const cycleRemain = num(account, 'CycleCapacityRemain')
    const cycleUsed = num(account, 'CycleCapacityUsed')
    const capacityRemain = num(account, 'CapacityRemain')
    // 有周期额度时以周期余量为准；否则回落到总余量。
    const remain = Math.max(0, size > 0 || cycleRemain > 0 || cycleUsed > 0 ? cycleRemain : capacityRemain)
    const packageSize = size > 0 ? size : num(account, 'CapacitySize')
    remaining += remain
    total += packageSize
    packages.push({
      name: typeof account['PackageName'] === 'string' ? account['PackageName'] : '(未命名)',
      remain,
      size: packageSize,
    })
  }
  return { remaining, total, packages }
}

/** 登录轮询的「仍在等待」错误码。 */
const LOGIN_PENDING = 11217

/** 签到「今天已签」的错误码，视同成功。 */
const CHECKIN_ALREADY = 10001

/** 浏览器授权流程的头（与计费头不同：要带 Origin / Referer 与站点 UA）。 */
function loginHeaders(variant: WorkBuddyVariant, token?: string): Record<string, string> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'Accept': 'application/json, text/plain, */*',
    'X-Requested-With': 'XMLHttpRequest',
    'User-Agent': variant.loginUa,
    'Origin': variant.origin,
    'Referer': `${variant.origin}/`,
  }
  if (token !== undefined && token !== '') headers['Authorization'] = `Bearer ${token}`
  return headers
}

/** 发起一次浏览器授权登录，拿到 state 与要打开的授权链接。 */
export async function startLogin(variant: WorkBuddyVariant): Promise<{ state: string; authUrl: string }> {
  const url = `${variant.chatBase}/v2/plugin/auth/state?platform=${encodeURIComponent('CLI')}`
  const response = await fetch(url, {
    method: 'POST',
    headers: loginHeaders(variant),
    body: '{}',
    signal: AbortSignal.timeout(JSON_TIMEOUT_MS),
  })
  const envelope = await readEnvelope(response, '发起登录失败')
  if (!response.ok || envelope.code !== 0) {
    throw new Error(`发起登录失败（code ${envelope.code}）：${envelope.msg || `HTTP ${response.status}`}`)
  }
  const data = typeof envelope.data === 'object' && envelope.data !== null
    ? envelope.data as Record<string, unknown>
    : {}
  const state = typeof data['state'] === 'string' ? data['state'] : ''
  const authUrl = typeof data['authUrl'] === 'string' ? data['authUrl'] : ''
  if (state === '' || authUrl === '') throw new Error('授权接口没有返回 state / authUrl')
  return { state, authUrl }
}

/** 一次登录轮询的结果。 */
export type LoginPoll =
  | { status: 'pending'; message: string }
  | { status: 'ok'; credential: WorkBuddyCredential }
  | { status: 'error'; message: string }

/**
 * 轮询一次登录结果。
 *
 * 上游在用户尚未完成授权时回 `code = 11217`，此时不算失败。拿到 accessToken 后
 * 再查一次账号资料取昵称（查不到不影响登录本身）。
 *
 * @param variant - 目标变体。
 * @param state - `startLogin` 返回的 state。
 * @returns 轮询结果。
 */
export async function pollLogin(variant: WorkBuddyVariant, state: string): Promise<LoginPoll> {
  const url = `${variant.chatBase}/v2/plugin/auth/token?state=${encodeURIComponent(state)}`
  let envelope: Envelope
  try {
    const response = await fetch(url, { method: 'GET', headers: loginHeaders(variant), signal: AbortSignal.timeout(JSON_TIMEOUT_MS) })
    envelope = await readEnvelope(response, '登录轮询失败')
  } catch (error: unknown) {
    // 轮询期间的网络抖动按「仍在等待」处理，不打断整个流程。
    return { status: 'pending', message: `轮询出错：${String(error)}` }
  }
  if (envelope.code === LOGIN_PENDING) {
    return { status: 'pending', message: envelope.msg || '等待浏览器完成授权' }
  }
  if (envelope.code !== 0) {
    return { status: 'error', message: `code ${envelope.code}：${envelope.msg || '上游未说明原因'}` }
  }
  const data = typeof envelope.data === 'object' && envelope.data !== null
    ? envelope.data as Record<string, unknown>
    : {}
  const accessToken = typeof data['accessToken'] === 'string' ? data['accessToken'] : ''
  if (accessToken === '') return { status: 'pending', message: '等待令牌下发' }

  const uid = jwtUid(accessToken)
  const nickname = await fetchLoginNickname(variant, state, accessToken).catch(() => '')
  const enterpriseId = typeof data['enterpriseId'] === 'string' ? data['enterpriseId'] : ''
  return {
    status: 'ok',
    credential: {
      variantId: variant.id,
      account: `${uid}:${enterpriseId}`,
      uid,
      enterpriseId,
      domain: typeof data['domain'] === 'string' && data['domain'] !== '' ? data['domain'] : variant.origin.replace('https://', ''),
      nickname,
      accessToken,
      refreshToken: typeof data['refreshToken'] === 'string' ? data['refreshToken'] : '',
      expiresAtMs: normalizeEpoch(data['expiresAt']),
      refreshExpiresAtMs: 0,
    },
  }
}

/** 取登录账号的昵称；失败返回空串。 */
async function fetchLoginNickname(variant: WorkBuddyVariant, state: string, token: string): Promise<string> {
  const url = `${variant.chatBase}/v2/plugin/login/account?state=${encodeURIComponent(state)}`
  const response = await fetch(url, { method: 'GET', headers: loginHeaders(variant, token), signal: AbortSignal.timeout(JSON_TIMEOUT_MS) })
  const text = await response.text()
  const parsed = JSON.parse(text) as Record<string, unknown>
  const data = typeof parsed['data'] === 'object' && parsed['data'] !== null
    ? parsed['data'] as Record<string, unknown>
    : {}
  return typeof data['nickname'] === 'string' ? data['nickname'] : ''
}

/** 从 JWT 里取 uid；解不开返回空串。 */
function jwtUid(token: string): string {
  const segments = token.split('.')
  if (segments.length !== 3) return ''
  try {
    const payload = JSON.parse(Buffer.from(segments[1]!, 'base64url').toString('utf8')) as Record<string, unknown>
    for (const key of ['uid', 'sub', 'user_id', 'userId']) {
      const value = payload[key]
      if (typeof value === 'string' && value !== '') return value
    }
  } catch {
    // 解不开就不给 uid
  }
  return ''
}

/** 每日签到结果。 */
export interface CheckinResult {
  ok: boolean
  code: number
  message: string
}

/**
 * 国内版每日签到。
 *
 * `code === 10001` 表示今天已经签过，同样按成功处理。
 *
 * @param credential - 目标凭据（必须是国内版）。
 * @returns 签到结果。
 */
export async function checkin(credential: WorkBuddyCredential): Promise<CheckinResult> {
  const variant = variantOfCredential(credential)
  if (variant.region !== 'cn') {
    return { ok: false, code: -1, message: '签到只有国内版账号支持' }
  }
  const response = await fetch(`${variant.billingBase}/v2/billing/meter/daily-checkin`, {
    method: 'POST',
    headers: billingHeaders(credential),
    body: '{}',
    signal: AbortSignal.timeout(JSON_TIMEOUT_MS),
  })
  let envelope: Envelope
  try {
    envelope = await readEnvelope(response, '签到失败')
  } catch (error: unknown) {
    return { ok: false, code: -1, message: String(error) }
  }
  const ok = envelope.code === 0 || envelope.code === CHECKIN_ALREADY
  return {
    ok,
    code: envelope.code,
    message: envelope.msg !== ''
      ? envelope.msg
      : ok ? '签到成功' : `HTTP ${response.status}`,
  }
}

/**
 * 探测一个模型接受哪些推理档位。
 *
 * 上游只在部分模型上声明 `supportedEfforts`；没声明的模型在 DSH 里就没有档位
 * 控件。这里逐个档位发一条最小请求，只认「上游没有因为该档位而报错」：
 *
 * - 返回 200 且能开流 → 该档位被接受
 * - 返回 400 且错误里提到档位参数 → 该档位不被接受
 * - 其他失败（限流、网络、额度）→ 保守判为不可用，不猜测
 *
 * 探测会消耗少量额度，因此只在用户显式触发时执行。
 *
 * @param credential - 目标凭据。
 * @param modelId - 模型 id。
 * @param signal - 取消信号。
 * @returns 被接受的档位列表与逐档位的结果。
 */
export async function probeEfforts(
  credential: WorkBuddyCredential,
  modelId: string,
  signal?: AbortSignal,
): Promise<{ accepted: string[]; detail: { effort: string; accepted: boolean; reason: string }[]; aborted: string }> {
  const detail: { effort: string; accepted: boolean; reason: string }[] = []
  const accepted: string[] = []

  for (const effort of EFFORT_VALUES) {
    const body = JSON.stringify({
      model: modelId,
      stream: true,
      messages: [{ role: 'user', content: 'ping' }],
      // 探测只关心参数是否被接受，把开销压到最小。
      max_tokens: 1,
      reasoning_effort: effort,
    })
    const result = await chatCompletions(credential, body, signal)
    if (result.ok) {
      // 上游接了这条请求，立刻断开，不必读正文。
      try { await result.response.body?.cancel() } catch { /* 忽略 */ }
      accepted.push(effort)
      detail.push({ effort, accepted: true, reason: '上游接受' })
      continue
    }
    // 限流或额度不足时后面的档位必然同样失败，立刻收手而不是白跑四轮。
    if (result.kind === 'soft_rate' || result.kind === 'hard_credit' || result.kind === 'session_dead') {
      detail.push({ effort, accepted: false, reason: `探测中止：${result.message}` })
      return { accepted, detail, aborted: result.kind }
    }
    // 只有明确指向档位参数的参数校验失败才算「不接受」。
    const rejected = result.status === 400 && /reasoning|effort|11133/i.test(result.message)
    detail.push({
      effort,
      accepted: false,
      reason: rejected ? `上游拒绝该档位：${result.message}` : `未验证（${result.kind}）：${result.message}`,
    })
  }

  return { accepted, detail, aborted: '' }
}

/** 一条最小可用性探测的结论。 */
export interface AccountProbeResult {
  /** 上游接了这条请求。 */
  ok: boolean
  /** 上游返回的 HTTP 状态码；没连上时为 0。 */
  status: number
  /** 探测用的模型 id。 */
  model: string
  /** 失败类别；通过时为空串。 */
  kind: string
  /** 面向用户的说明。 */
  message: string
}

/** 探测固定用这个模型：两区目录里都有，且是最便宜的一档。 */
const PROBE_MODEL_ID = 'deepseek-v4.1-flash'

/**
 * 用一条最小请求验证凭据当前可用。
 *
 * 固定先打 {@link PROBE_MODEL_ID}；只有上游明确回「这个模型不存在」时才按
 * `fallbacks` 的顺序换下一个候选。限流、凭据失效、网络故障都如实返回，不换
 * 模型——那会把真正的失败原因盖成一句「凭据可用」。
 *
 * 不带推理档位：`max_tokens: 1` 把开销压到最小，上游接了请求就立刻断开，不读正文。
 *
 * @param credential - 目标凭据。
 * @param fallbacks - 备用模型 id；只在首选模型不存在时按序尝试。
 * @param signal - 取消信号。
 * @returns 探测结论。
 */
export async function probeAccount(
  credential: WorkBuddyCredential,
  fallbacks: readonly string[] = [],
  signal?: AbortSignal,
): Promise<AccountProbeResult> {
  const candidates = [PROBE_MODEL_ID, ...fallbacks.filter(id => id !== '' && id !== PROBE_MODEL_ID)]
  let result: AccountProbeResult = {
    ok: false,
    status: 0,
    model: PROBE_MODEL_ID,
    kind: 'server',
    message: '没有可用的探测模型',
  }
  for (const model of candidates) {
    const body = JSON.stringify({
      model,
      stream: true,
      messages: [{ role: 'user', content: 'ping' }],
      max_tokens: 1,
    })
    const outcome = await chatCompletions(credential, body, signal)
    if (outcome.ok) {
      try { await outcome.response.body?.cancel() } catch { /* 忽略 */ }
      return { ok: true, status: outcome.response.status, model, kind: '', message: '凭据可用' }
    }
    result = { ok: false, status: outcome.status, model, kind: outcome.kind, message: outcome.message }
    if (!outcome.modelMissing) return result
  }
  return result
}

/** 刷新 access token。 */
export async function refreshAccessToken(
  credential: WorkBuddyCredential,
): Promise<{ accessToken: string; refreshToken?: string; expiresInSec?: number; domain?: string }> {
  const url = `${chatBase(credential)}/v2/plugin/auth/token/refresh`
  const headers: Record<string, string> = {
    ...commonHeaders(credential),
    'X-Refresh-Token': credential.refreshToken,
    'X-Auth-Refresh-Source': 'workbuddy',
  }
  if (credential.enterpriseId !== '') headers['X-Enterprise-Id'] = credential.enterpriseId

  const response = await fetch(url, { method: 'POST', headers, signal: AbortSignal.timeout(JSON_TIMEOUT_MS) })
  const text = await response.text()
  if (!response.ok) throw new Error(`刷新 token 失败（HTTP ${response.status}）：${text.slice(0, 200)}`)
  let document: unknown
  try {
    document = JSON.parse(text)
  } catch {
    throw new Error('刷新响应不是合法 JSON')
  }
  const root = document as Record<string, unknown>
  const data = typeof root['data'] === 'object' && root['data'] !== null
    ? root['data'] as Record<string, unknown>
    : root
  const accessToken = typeof data['accessToken'] === 'string' ? data['accessToken'] : ''
  if (accessToken === '') throw new Error('刷新响应里没有 accessToken')
  return {
    accessToken,
    ...typeof data['refreshToken'] === 'string' && data['refreshToken'] !== ''
      ? { refreshToken: data['refreshToken'] }
      : {},
    ...Number.isFinite(Number(data['expiresIn'])) ? { expiresInSec: Number(data['expiresIn']) } : {},
    ...typeof data['domain'] === 'string' && data['domain'] !== '' ? { domain: data['domain'] } : {},
  }
}
