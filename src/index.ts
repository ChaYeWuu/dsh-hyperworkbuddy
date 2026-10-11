/**
 * HyperWorkBuddy 的 host 半边。
 *
 * 每个产品版本（国内版 / 国际版）各有一套：账号筛选、端点、provider 注册。
 * 两者共用一个账号池与一份运行时状态，但端口、模型列表、开关互不影响——
 * 国内版和国际版的同名模型走的是不同上游，混在一起会发错区域。
 *
 * 每个版本跑**两个**端点，职责分开：
 * - **内部端点**（随机端口）：DSH 自己的 provider 指向它。它始终在跑，所以关掉
 *   对外端点不会让 DSH 里的模型断线。
 * - **对外端点**（配置端口）：给 Codex / Claude Code 等外部客户端用，由面板上的
 *   总开关控制。关掉时它真的停止监听并释放端口。
 *
 * @module dsh-hyperworkbuddy
 */

import type { IncomingMessage, ServerResponse } from 'node:http'
import { copyFile, mkdir, readFile, writeFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { dirname, join } from 'node:path'
import type { Context } from '@deepseek-ai/cordis'
import z from '@deepseek-ai/schemastery'
import { resolveImageAttachmentAccess } from '@deepseek-ai/dsh-llm'
import { resolveDshHome } from '@deepseek-ai/dsh-home-paths'
import { ACCOUNTS_FILENAME, AccountPool, ensureEndpointKey, resetEndpointKey, toCredential } from './accounts.ts'
import { createHyperAdapter, type HyperAdapter } from './adapter.ts'
import { parseHubExport } from './import.ts'
import { createHyperShim, type HyperShim } from './shim.ts'
import { PluginState } from './state.ts'
import { checkin, pollLogin, probeEfforts, resolveContextWindow, startLogin } from './upstream.ts'
import { UsageLedger, type UsageSummary } from './usage.ts'
import { WORKBUDDY_VARIANTS, variantFor, type WorkBuddyVariant } from './variants.ts'

/** Cordis 插件名。 */
export const name = 'llm-hyperworkbuddy'

/** 注册 provider 前必须就绪的模型注册表。 */
export const inject = ['llm']

/** 管理路由前缀。 */
export const ROUTE_PREFIX = '/api-hyperworkbuddy'

/** 桌面凭据重扫间隔（毫秒）。 */
const DESKTOP_POLL_MS = 30_000

/** 旧账号文件迁移完成标记；存在即不再迁移。 */
const MIGRATION_MARKER_FILENAME = '.hyperworkbuddy-migrated'

/** 配置。 */
export interface Config {
  /** 国内版对外端点端口；0 表示随机端口。 */
  port?: number
  /** 国际版对外端点端口；0 表示随机端口。 */
  portAI?: number
  /** 启动时是否启用对外端点（之后可在面板里改）。 */
  endpointEnabled?: boolean
  /** 外部客户端使用的 API Key 列表。 */
  apiKeys?: string[]
  /** 初始隐藏的模型 id（之后可在面板里逐个切换）。 */
  hiddenModels?: string[]
  /** 是否自动跟随桌面 App 登录。 */
  followDesktop?: boolean
}

/** 配置 schema。 */
export const Config: z<Config> = z.object({
  port: z.natural().default(8791).description('国内版对外端点端口（0 表示随机端口）'),
  portAI: z.natural().default(8792).description('国际版对外端点端口（0 表示随机端口）'),
  endpointEnabled: z.boolean().default(true).description('是否启用对外端点（可在设置面板里随时切换）'),
  apiKeys: z.array(z.string()).default([]).description('外部客户端使用的 API Key；留空使用自动生成的密钥'),
  hiddenModels: z.array(z.string()).default([]).description('初始隐藏的模型 id（可在设置面板里逐个切换）'),
  followDesktop: z.boolean().default(true).description('自动跟随 WorkBuddy 桌面 App 的登录状态'),
})

/** 面板里的一个模型条目。 */
interface PanelModel {
  id: string
  name: string
  /** 当前开关下实际生效的窗口。 */
  contextWindow: number
  /** 上游自己挑的默认档位，用于在面板上说明开关会改什么。 */
  declaredContextWindow: number
  /** 上游声明的全部窗口档位；空数组表示上游没有档位可选。 */
  supportedContextWindows: number[]
  maxTokens: number
  credits?: string
  free: boolean
  /** 是否在选择器中可见。 */
  visible: boolean
  /** 至少有一个账号提供该模型。 */
  available: boolean
  /** 上游声明的推理档位；空数组表示该模型没有档位控件。 */
  efforts: string[]
  defaultEffort: string
  /** 档位来自哪里：上游声明、本地探测，或都没有。 */
  effortsSource: 'declared' | 'probed' | 'none'
}

/** 面板里的一个账号。 */
interface PanelAccount {
  account: string
  variantId: string
  source: 'desktop' | 'manual'
  nickname: string
  domain: string
  disabled: boolean
  cooling: boolean
  cooldownRemainingMs: number
  failStreak: number
  lastError: string
  expiresAtMs: number
  expired: boolean
  modelCount: number
  catalogSource: 'live' | 'saved'
  catalogError: string
  credits?: { remaining?: number; total?: number; packages: { name: string; remain?: number; size?: number }[] }
  creditsAtMs: number
}

/** 面板里的一个版本分区。 */
interface PanelVariant {
  id: string
  displayName: string
  appName: string
  region: 'cn' | 'global'
  authFile: string
  /** 对外端点基地址；关闭时为空串。 */
  baseUrl: string
  port: number
  /** 对外端点是否在监听。 */
  externalRunning: boolean
  /** 对外端点启动失败原因；空串表示正常。 */
  externalError: string
  /** 该版本是否支持每日签到（只有国内版）。 */
  hasCheckin: boolean
  /** 该版本是否使用上游声明的最大上下文窗口。 */
  useMaximumContextWindow: boolean
  /** provider 是否已注册（与对外端点开关无关）。 */
  providerRegistered: boolean
  providerError: string
  accounts: PanelAccount[]
  models: PanelModel[]
  hiddenCount: number
  desktopError: string
}

/** 导入结果回执。 */
interface ImportResult {
  imported: number
  skipped: { index: number; reason: string }[]
  error: string
}

/** 浏览器半边需要的状态文档。 */
interface PanelDocument {
  ok: true
  /** 对外端点总开关。 */
  endpointEnabled: boolean
  /** 外部客户端使用的 API Key（自动生成或用户配置）。 */
  apiKey: string
  apiKeysConfigured: boolean
  variants: PanelVariant[]
  /** 请求用量汇总。 */
  usage: UsageSummary
  /** 仅在导入请求的响应里出现。 */
  importResult?: ImportResult
}

function json(res: ServerResponse, status: number, body: unknown): void {
  const payload = JSON.stringify(body)
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Content-Length': Buffer.byteLength(payload) })
  res.end(payload)
}

/** Host 头是否回环。 */
function loopbackRequest(req: IncomingMessage): boolean {
  const host = req.headers.host
  if (typeof host !== 'string' || host === '') return false
  const name = host.replace(/:\d+$/u, '').replace(/^\[|\]$/gu, '').toLowerCase()
  return name === '127.0.0.1' || name === 'localhost' || name === '::1'
}

/** 读取 JSON 请求体。 */
async function readJsonBody(req: IncomingMessage): Promise<Record<string, unknown>> {
  const chunks: Buffer[] = []
  for await (const chunk of req) chunks.push(chunk as Buffer)
  const text = Buffer.concat(chunks).toString('utf8').trim()
  if (text === '') return {}
  const parsed: unknown = JSON.parse(text)
  return typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)
    ? parsed as Record<string, unknown>
    : {}
}

/** 一个版本运行时的全部活动部件。 */
interface VariantRuntime {
  variant: WorkBuddyVariant
  /** 内部端点：始终在跑，DSH 的 provider 指向它。 */
  internal: HyperShim | undefined
  /** 对外端点：由总开关控制。 */
  external: HyperShim | undefined
  adapter: HyperAdapter | undefined
  releaseAdapter: (() => void) | undefined
  registered: boolean
  error: string
  /** 对外端点启动失败原因。 */
  externalError: string
}

/**
 * 插件入口。
 *
 * @param ctx - cordis 上下文。
 * @param config - 已解析配置。
 */
export function apply(ctx: Context, config: Config): void {
  /**
   * 状态文件的位置。
   *
   * 优先用宿主给的 home，而不是 `$DSH_HOME`：Desktop 版把 home 指到 profile
   * 目录（`~/.dsh/profiles/desktop`），而环境变量指向 `~/.dsh`，两者不一致会让
   * 同一份账号在重启前后落到不同文件，看起来像账号丢了。
   */
  const homeDir = ctx.get('dshHomePaths')?.home
    ?? (process.env['DSH_HOME'] !== undefined && process.env['DSH_HOME'] !== ''
      ? process.env['DSH_HOME']
      : resolveDshHome())
  const resolvedHome = homeDir === '' ? process.cwd() : homeDir
  const pool = new AccountPool(resolvedHome)
  const state = new PluginState(resolvedHome, { endpointEnabled: config.endpointEnabled !== false })
  const usage = new UsageLedger(resolvedHome)

  let stopped = false
  let endpointKey = ''
  let pollTimer: NodeJS.Timeout | undefined
  let lastDesktopError = ''
  const runtimes = new Map<string, VariantRuntime>()
  /** 进行中的浏览器授权登录：state → 变体 id 与起始时刻。 */
  const pendingLogins = new Map<string, { variantId: string; startedAtMs: number }>()

  for (const variant of WORKBUDDY_VARIANTS) {
    runtimes.set(variant.id, {
      variant,
      internal: undefined,
      external: undefined,
      adapter: undefined,
      releaseAdapter: undefined,
      registered: false,
      error: '',
      externalError: '',
    })
  }

  /** 该版本对外端点的端口。 */
  const portFor = (variant: WorkBuddyVariant): number => {
    const raw = variant.region === 'global' ? config.portAI : config.port
    if (typeof raw === 'number' && Number.isFinite(raw) && raw >= 0) return Math.floor(raw)
    return variant.region === 'global' ? 8792 : 8791
  }

  /** 读文本文件；迁移用。 */
  async function readFileText(path: string): Promise<string> {
    return await readFile(path, 'utf8')
  }

  /**
   * 把散落在别处的旧状态文件搬过来。
   *
   * 历史版本把 home 解析成 `$DSH_HOME`（`~/.dsh`），而 Desktop 版实际用 profile
   * 目录，于是同一台机器上会存在两份账号文件。这里在启动时把另一份里**更多的**
   * 那份合并进来，避免用户的账号看起来「凭空消失」。
   *
   * 只跑一次：迁移成功后写一个标记，之后即使旧文件账号更多也不再搬——否则用户
   * 在当前 home 里删掉几个账号，下次启动又会被旧文件「还原」，看起来像删不掉。
   */
  async function migrateLegacyState(): Promise<void> {
    const marker = join(resolvedHome, MIGRATION_MARKER_FILENAME)
    if (existsSync(marker)) return

    const candidates = [
      // 环境变量指向的根（旧行为）
      process.env['DSH_HOME'] === undefined || process.env['DSH_HOME'] === ''
        ? undefined
        : join(process.env['DSH_HOME'], ACCOUNTS_FILENAME),
      // 默认 home
      join(resolveDshHome(), ACCOUNTS_FILENAME),
    ].filter((path): path is string => path !== undefined && dirname(path) !== resolvedHome)

    const target = join(resolvedHome, ACCOUNTS_FILENAME)
    let targetCount = 0
    if (existsSync(target)) {
      try {
        const parsed = JSON.parse(await readFileText(target)) as { accounts?: unknown[] }
        targetCount = Array.isArray(parsed.accounts) ? parsed.accounts.length : 0
      } catch { targetCount = 0 }
    }

    let migrated = false
    for (const source of candidates) {
      if (!existsSync(source)) continue
      let sourceCount = 0
      try {
        const parsed = JSON.parse(await readFileText(source)) as { accounts?: unknown[] }
        sourceCount = Array.isArray(parsed.accounts) ? parsed.accounts.length : 0
      } catch { continue }
      // 只在旧文件账号更多时才搬，避免用一份空文件覆盖当前数据。
      if (sourceCount <= targetCount) continue
      try {
        await mkdir(dirname(target), { recursive: true })
        await copyFile(source, `${target}.migrated-from-legacy`)
        await copyFile(source, target)
        ctx.logger.info(`hyperworkbuddy: 已从旧位置迁移 ${sourceCount} 个账号（${source}）`)
        targetCount = sourceCount
        migrated = true
      } catch (error: unknown) {
        ctx.logger.warn(`hyperworkbuddy: 迁移旧账号文件失败 ${String(error)}`)
      }
    }

    // 只有真的搬过才落标记：没找到旧文件时留空，下次启动仍有机会发现它们。
    if (!migrated) return
    try {
      await writeFile(marker, new Date().toISOString(), 'utf8')
    } catch (error: unknown) {
      ctx.logger.warn(`hyperworkbuddy: 迁移标记写入失败 ${String(error)}`)
    }
  }

  /**
   * 补刷「已开开关但缓存里没有档位」的目录。
   *
   * 窗口档位只在上游 live 目录里，旧缓存行连 `supportedContextWindows` 字段都没有；
   * 用户此前已经把开关打开的话，不会再有「开启」这个动作去触发刷新，开关就一直等于没开。
   *
   * 刷到档位后 `cached.some(...)` 会一直成立，所以这个自愈每个版本只会真的打一次上游；
   * 对上游本来就不声明档位的版本（如国内版），每次启动会多一次目录请求。
   *
   * @returns 实际刷到档位的模型数。
   */
  async function healMaximumContextWindows(): Promise<number> {
    let healed = 0
    for (const variant of WORKBUDDY_VARIANTS) {
      if (!state.usesMaximumContextWindow(variant.id)) continue
      const cached = pool.modelsFor(variant.id)
      if (cached.length === 0) continue
      if (cached.some(model => model.supportedContextWindows.length > 0)) continue
      for (const account of pool.list()) {
        if (account.variantId !== variant.id || account.disabled) continue
        await pool.refreshCatalog(account.account, variant.id).catch(() => undefined)
      }
      const count = pool.modelsFor(variant.id)
        .filter(model => model.supportedContextWindows.length > 0).length
      healed += count
      ctx.logger.info(`hyperworkbuddy: ${variant.id} 开关已开但缓存缺窗口档位，已补刷目录（${count} 个模型声明了更大档位）`)
    }
    return healed
  }

  /** 首次装载状态与账号，并拉一次目录。 */
  async function bootstrap(): Promise<void> {
    await migrateLegacyState()
    await state.load()
    await pool.load()
    await usage.load()
    endpointKey = await ensureEndpointKey(resolvedHome)
    if (config.followDesktop !== false) {
      await pool.refreshFromDesktop()
      lastDesktopError = pool.refreshError
    }
    if (pool.allModels().length === 0) {
      await pool.refreshAllCatalogs().catch(() => undefined)
    }
    // 放后台：上游不可达时不能拖住启动，provider 起来后会自己读最新目录。
    void healMaximumContextWindows()
      .then(() => { if (!stopped) invalidate() })
      .catch(() => undefined)
  }

  /** 周期性重扫桌面登录，并在 token 临近过期时续期。 */
  function startPolling(): void {
    pollTimer = setInterval(() => {
      if (stopped) return
      void (async () => {
        try {
          if (config.followDesktop !== false) {
            await pool.refreshFromDesktop()
            lastDesktopError = pool.refreshError
          }
          await pool.refreshExpiringTokens()
          invalidate()
        } catch (error: unknown) {
          ctx.logger.warn(`hyperworkbuddy: 账号轮询失败 ${String(error)}`)
        }
      })()
    }, DESKTOP_POLL_MS)
    pollTimer.unref?.()
  }

  /** 通知 DSH 模型列表变化。 */
  function invalidate(): void {
    for (const runtime of runtimes.values()) runtime.adapter?.invalidate()
    ctx.emit('llm/adapters-updated')
  }

  /** 用量汇总里的账号补上昵称；流水只记 id，昵称随时会变，所以每次出口现取。 */
  function withNicknames(summary: UsageSummary): UsageSummary {
    const names = new Map(pool.list().map(account => [account.account, account.nickname]))
    return {
      ...summary,
      byAccount: summary.byAccount.map(row => {
        const nickname = names.get(row.account)
        return nickname === undefined || nickname === '' ? row : { ...row, nickname }
      }),
    }
  }

  /** 组装面板状态文档。 */
  function panelDocument(importResult?: ImportResult): PanelDocument {
    const now = Date.now()
    const variants: PanelVariant[] = WORKBUDDY_VARIANTS.map(variant => {
      const runtime = runtimes.get(variant.id)!
      const hidden = new Set(state.hidden(variant.id))

      const accounts = pool.list()
        .filter(account => account.variantId === variant.id)
        .map<PanelAccount>(account => ({
          account: account.account,
          variantId: account.variantId,
          source: account.source,
          nickname: account.nickname,
          domain: account.domain,
          disabled: account.disabled,
          cooling: account.cooldownUntilMs > now,
          cooldownRemainingMs: Math.max(0, account.cooldownUntilMs - now),
          failStreak: account.failStreak,
          lastError: account.lastError,
          expiresAtMs: account.expiresAtMs,
          expired: account.expiresAtMs > 0 && account.expiresAtMs <= now,
          modelCount: account.models.length,
          catalogSource: account.catalogSource,
          catalogError: account.catalogError,
          ...account.credits === undefined ? {} : { credits: account.credits },
          creditsAtMs: account.creditsAtMs,
        }))

      // 模型表 = 该版本所有账号目录的并集，附可见性与推理档位。
      const byId = new Map<string, PanelModel>()
      const useMaximum = state.usesMaximumContextWindow(variant.id)
      for (const account of pool.list()) {
        if (account.variantId !== variant.id) continue
        for (const model of account.models) {
          if (byId.has(model.id)) continue
          const declared = model.reasoning.supportedEfforts ?? []
          const probed = state.probedFor(variant.id, model.id)
          // 上游声明优先；没声明才用本地探测结果。
          const efforts = declared.length > 0 ? declared : probed
          byId.set(model.id, {
            id: model.id,
            name: model.name,
            contextWindow: resolveContextWindow(model, useMaximum),
            declaredContextWindow: model.contextWindow,
            supportedContextWindows: model.supportedContextWindows,
            maxTokens: model.maxTokens,
            ...model.billing.credits === undefined ? {} : { credits: model.billing.credits },
            free: model.billing.free,
            visible: !hidden.has(model.id),
            available: true,
            efforts,
            defaultEffort: model.reasoning.defaultEffort ?? '',
            effortsSource: declared.length > 0 ? 'declared' : probed.length > 0 ? 'probed' : 'none',
          })
        }
      }
      // 已隐藏但目录里已消失的模型也要列出，否则用户无法把它重新打开。
      for (const modelId of hidden) {
        if (byId.has(modelId)) continue
        byId.set(modelId, {
          id: modelId,
          name: modelId,
          contextWindow: 0,
          declaredContextWindow: 0,
          supportedContextWindows: [],
          maxTokens: 0,
          free: false,
          visible: false,
          available: false,
          efforts: [],
          defaultEffort: '',
          effortsSource: 'none',
        })
      }

      return {
        id: variant.id,
        displayName: variant.displayName,
        appName: variant.appName,
        region: variant.region,
        authFile: (() => {
          const explicit = process.env[variant.env]
          return explicit !== undefined && explicit !== '' ? explicit : ''
        })(),
        baseUrl: runtime.external === undefined ? '' : `${runtime.external.baseUrl()}/v1`,
        port: runtime.external?.port() ?? 0,
        externalRunning: runtime.external !== undefined,
        externalError: runtime.externalError,
        hasCheckin: variant.hasCheckin,
        useMaximumContextWindow: useMaximum,
        providerRegistered: runtime.registered,
        providerError: runtime.error,
        accounts,
        models: [...byId.values()].sort((a, b) => a.id.localeCompare(b.id)),
        hiddenCount: hidden.size,
        desktopError: lastDesktopError,
      }
    })

    return {
      ok: true,
      endpointEnabled: state.endpointEnabled,
      apiKey: (config.apiKeys ?? [])[0] ?? endpointKey,
      apiKeysConfigured: (config.apiKeys ?? []).length > 0,
      variants,
      usage: withNicknames(usage.summary()),
      ...importResult === undefined ? {} : { importResult },
    }
  }

  /** 停掉某个版本的对外端点。 */
  async function stopExternal(variantId: string): Promise<void> {
    const runtime = runtimes.get(variantId)
    if (runtime === undefined) return
    const shim = runtime.external
    runtime.external = undefined
    if (shim !== undefined) await shim.close().catch(() => undefined)
  }

  /** 起某个版本的对外端点（仅接受外部 API Key）。 */
  async function startExternal(variant: WorkBuddyVariant): Promise<void> {
    const runtime = runtimes.get(variant.id)!
    if (runtime.external !== undefined) return
    try {
      const shim = createHyperShim({
        pool,
        // 端点只服务本版本的账号：同名模型在两区走不同上游，混用会发错区域。
        variantId: variant.id,
        apiKeys: () => config.apiKeys ?? [],
        fallbackKey: () => endpointKey,
        port: () => portFor(variant),
        // 对外端点不做隐藏过滤：隐藏只影响 DSH 选择器，外部客户端应拿到完整目录。
        hiddenModels: () => [],
        usage,
        logger: ctx.logger,
      })
      await shim.ready
      runtime.external = shim
      runtime.externalError = ''
      ctx.logger.info(`hyperworkbuddy: ${variant.displayName} 对外端点 ${shim.baseUrl()}/v1`)
    } catch (error: unknown) {
      const detail = error instanceof Error ? error.message : String(error)
      // 端口被占用是最常见的失败，回显到面板而不是只写日志。
      runtime.externalError = detail.includes('EADDRINUSE')
        ? `端口 ${portFor(variant)} 已被占用；改配置里的 port/portAI，或设 0 用随机端口`
        : detail
      ctx.logger.error(`hyperworkbuddy: ${variant.displayName} 对外端点启动失败 ${detail}`)
      await stopExternal(variant.id)
    }
  }

  /** 起某个版本的内部端点并注册 provider（与对外端点开关无关）。 */
  async function startProvider(variant: WorkBuddyVariant): Promise<void> {
    const runtime = runtimes.get(variant.id)!
    if (runtime.registered) return
    runtime.error = ''
    try {
      const shim = createHyperShim({
        pool,
        variantId: variant.id,
        // 内部端点只认进程内密钥：外部客户端拿不到它。
        apiKeys: () => [],
        fallbackKey: () => '',
        // 随机端口：它是实现细节，不占用户配置的端口，也不对外暴露固定入口。
        port: () => 0,
        hiddenModels: () => [],
        usage,
        logger: ctx.logger,
      })
      await shim.ready
      runtime.internal = shim

      const adapter = createHyperAdapter({
        providerId: variant.id,
        displayName: variant.displayName,
        shim,
        pool,
        variantId: variant.id,
        hidden: () => state.hidden(variant.id),
        probedEfforts: (modelId: string) => state.probedFor(variant.id, modelId),
        useMaximumContextWindow: () => state.usesMaximumContextWindow(variant.id),
        // 图片必须走宿主的附件服务，否则声明了图片能力的模型一发图就报
        // 「pi-ai image input requires the durable attachment service」。
        resolveAttachments: () => ctx.get('attachments'),
        resolveImageAccess: (attachments, ref) => resolveImageAttachmentAccess(
          attachments as never,
          hostPath => ctx.get('fs')?.processPathFromHostPath(hostPath),
          ref as never,
        ),
      })
      runtime.adapter = adapter
      runtime.releaseAdapter = ctx.llm.registerAdapter([variant.id], adapter.adapter as never)
      runtime.registered = true
      ctx.logger.info(`hyperworkbuddy: ${variant.displayName} provider 已注册，账号 ${pool.available(variant.id).length} 个`)
    } catch (error: unknown) {
      runtime.error = error instanceof Error ? `${error.name}: ${error.message}` : String(error)
      ctx.logger.error(`hyperworkbuddy: ${variant.displayName} provider 注册失败 ${runtime.error}`)
      await stopProvider(variant.id)
    }
  }

  /** 注销 provider 并释放内部端点。 */
  async function stopProvider(variantId: string): Promise<void> {
    const runtime = runtimes.get(variantId)
    if (runtime === undefined) return
    try { runtime.releaseAdapter?.() } catch { /* 已释放 */ }
    runtime.releaseAdapter = undefined
    runtime.adapter = undefined
    runtime.registered = false
    const shim = runtime.internal
    runtime.internal = undefined
    if (shim !== undefined) await shim.close().catch(() => undefined)
  }

  /** 应用对外端点总开关：只动对外端点，provider 始终不动。 */
  async function applyEndpointSwitch(): Promise<void> {
    for (const variant of WORKBUDDY_VARIANTS) {
      if (state.endpointEnabled) await startExternal(variant)
      else await stopExternal(variant.id)
    }
  }

  /** 挂载管理路由。 */
  function registerRoutes(): void {
    ctx.inject(['webServer'], webCtx => {
      const mount = (path: string, handler: (req: IncomingMessage, res: ServerResponse) => Promise<void>): void => {
        ctx.effect(() => {
          const dispose = webCtx.webServer.register({
            kind: 'exact',
            path,
            handler: (req, res) => {
              void (async () => {
                if (!loopbackRequest(req)) {
                  json(res, 403, { ok: false, error: '仅允许回环访问' })
                  return
                }
                try {
                  await handler(req, res)
                } catch (error: unknown) {
                  if (!res.headersSent) json(res, 500, { ok: false, error: String(error) })
                  else res.end()
                }
              })()
            },
          })
          return () => { dispose() }
        }, `dsh-hyperworkbuddy: route ${path}`)
      }

      mount(`${ROUTE_PREFIX}/status`, async (_req, res) => {
        json(res, 200, panelDocument())
      })

      // 对外端点总开关
      mount(`${ROUTE_PREFIX}/endpoint`, async (req, res) => {
        const body = await readJsonBody(req)
        await state.setEndpointEnabled(body['enabled'] === true)
        await applyEndpointSwitch()
        json(res, 200, { ok: true, document: panelDocument() })
      })

      // API Key：刷新（重新随机生成）或自定义
      mount(`${ROUTE_PREFIX}/apikey`, async (req, res) => {
        // 显式配置了 apiKeys 时以配置为准，面板不改写它，避免改了没效果。
        if ((config.apiKeys ?? []).length > 0) {
          json(res, 200, {
            ok: false,
            error: '当前 API Key 来自 profile 配置（apiKeys），请在配置里修改；或清空该配置后用这里的自定义',
            document: panelDocument(),
          })
          return
        }
        const body = await readJsonBody(req)
        const custom = typeof body['key'] === 'string' ? body['key'].trim() : undefined
        const key = await resetEndpointKey(resolvedHome, custom)
        endpointKey = key
        // 端点每次鉴权都实时读取该值，无需重启。
        ctx.logger.info(custom === undefined
          ? 'hyperworkbuddy: API Key 已重新生成'
          : 'hyperworkbuddy: API Key 已按自定义值更新')
        json(res, 200, { ok: true, apiKey: key, document: panelDocument() })
      })

      // 单个模型的显隐开关
      mount(`${ROUTE_PREFIX}/model`, async (req, res) => {
        const body = await readJsonBody(req)
        const variantId = typeof body['variantId'] === 'string' ? body['variantId'] : ''
        const modelId = typeof body['modelId'] === 'string' ? body['modelId'] : ''
        if (variantFor(variantId) === undefined || modelId === '') {
          json(res, 400, { ok: false, error: '缺少 variantId 或 modelId', document: panelDocument() })
          return
        }
        await state.setVisible(variantId, modelId, body['visible'] === true)
        invalidate()
        json(res, 200, { ok: true, document: panelDocument() })
      })

      // 整版批量显隐
      mount(`${ROUTE_PREFIX}/models`, async (req, res) => {
        const body = await readJsonBody(req)
        const variantId = typeof body['variantId'] === 'string' ? body['variantId'] : ''
        const variant = variantFor(variantId)
        if (variant === undefined) {
          json(res, 400, { ok: false, error: '未知的 variantId', document: panelDocument() })
          return
        }
        const visible = body['visible'] === true
        const ids = Array.isArray(body['modelIds'])
          ? body['modelIds'].filter((id): id is string => typeof id === 'string' && id !== '')
          : panelDocument().variants.find(v => v.id === variantId)?.models.map(m => m.id) ?? []
        for (const modelId of ids) await state.setVisible(variantId, modelId, visible)
        invalidate()
        json(res, 200, { ok: true, document: panelDocument() })
      })

      mount(`${ROUTE_PREFIX}/refresh`, async (_req, res) => {
        await pool.refreshFromDesktop()
        lastDesktopError = pool.refreshError
        const result = await pool.refreshAllCatalogs()
        invalidate()
        json(res, 200, { ok: true, ...result, document: panelDocument() })
      })

      // 「使用最大上下文窗口」：抬到上游声明的最大档位，立即对下一条请求生效
      mount(`${ROUTE_PREFIX}/contextwindow`, async (req, res) => {
        const body = await readJsonBody(req)
        const variantId = typeof body['variantId'] === 'string' ? body['variantId'] : ''
        if (variantFor(variantId) === undefined) {
          json(res, 400, { ok: false, error: '未知的 variantId', document: panelDocument() })
          return
        }
        const useMaximum = body['useMaximum'] === true
        // 档位只有 live 目录里才有；老缓存里没有这个字段，不刷就白开开关。
        let catalogsOk = 0
        let catalogsFailed = 0
        if (useMaximum) {
          for (const account of pool.list().filter(a => a.variantId === variantId)) {
            try {
              await pool.refreshCatalog(account.account, variantId)
              catalogsOk += 1
            } catch { catalogsFailed += 1 }
          }
        }
        await state.setMaximumContextWindow(variantId, useMaximum)
        invalidate()
        json(res, 200, { ok: true, catalogsOk, catalogsFailed, document: panelDocument() })
      })

      // 用量：面板轮询时直接给现成的桶，不重扫流水文件。
      mount(`${ROUTE_PREFIX}/usage`, async (_req, res) => {
        json(res, 200, { ok: true, usage: withNicknames(usage.summary()), document: panelDocument() })
      })

      mount(`${ROUTE_PREFIX}/usage/clear`, async (_req, res) => {
        await usage.clear()
        json(res, 200, { ok: true, document: panelDocument() })
      })

      // 某个版本的一键刷新：只刷该版本的账号，目录 + 积分一起刷
      mount(`${ROUTE_PREFIX}/variant/refresh`, async (req, res) => {
        const body = await readJsonBody(req)
        const variantId = typeof body['variantId'] === 'string' ? body['variantId'] : ''
        if (variantFor(variantId) === undefined) {
          json(res, 400, { ok: false, error: '未知的 variantId', document: panelDocument() })
          return
        }
        // 面板上的一次点击就是「我现在就要最新的」，所以这里忽略积分缓存。
        const force = body['force'] !== false
        let catalogsOk = 0
        let catalogsFailed = 0
        for (const account of pool.list().filter(a => a.variantId === variantId)) {
          try {
            await pool.refreshCatalog(account.account, variantId)
            catalogsOk += 1
          } catch { catalogsFailed += 1 }
        }
        const credits = await pool.refreshAllCredits({ variantId, force })
        invalidate()
        json(res, 200, {
          ok: true,
          catalogsOk,
          catalogsFailed,
          creditsOk: credits.ok,
          creditsFailed: credits.failed,
          document: panelDocument(),
        })
      })

      // 一键签到：该版本下所有支持签到的账号各签一次
      mount(`${ROUTE_PREFIX}/variant/checkin`, async (req, res) => {
        const body = await readJsonBody(req)
        const variantId = typeof body['variantId'] === 'string' ? body['variantId'] : ''
        const variant = variantFor(variantId)
        if (variant === undefined) {
          json(res, 400, { ok: false, error: '未知的 variantId', document: panelDocument() })
          return
        }
        if (!variant.hasCheckin) {
          json(res, 200, { ok: false, error: '该版本没有签到功能', document: panelDocument() })
          return
        }
        const results: { account: string; ok: boolean; message: string }[] = []
        for (const account of pool.list().filter(a => a.variantId === variantId && !a.disabled)) {
          try {
            const result = await checkin(toCredential(account))
            results.push({ account: account.account, ok: result.ok, message: result.message })
          } catch (error: unknown) {
            results.push({ account: account.account, ok: false, message: String(error) })
          }
        }
        // 签到可能发积分，顺手刷一次积分让面板立刻反映
        for (const account of pool.list().filter(a => a.variantId === variantId)) {
          await pool.refreshCredits(account.account, variantId).catch(() => undefined)
        }
        json(res, 200, { ok: true, results, document: panelDocument() })
      })

      // 推理档位探测：上游没声明档位的模型，靠逐档位试请求测出可用集合
      mount(`${ROUTE_PREFIX}/model/probe`, async (req, res) => {
        const body = await readJsonBody(req)
        const variantId = typeof body['variantId'] === 'string' ? body['variantId'] : ''
        const modelId = typeof body['modelId'] === 'string' ? body['modelId'] : ''
        if (variantFor(variantId) === undefined || modelId === '') {
          json(res, 400, { ok: false, error: '缺少 variantId 或 modelId', document: panelDocument() })
          return
        }
        // 用该版本里第一个可用账号发起探测。
        const account = pool.available(variantId)[0]
        if (account === undefined) {
          json(res, 200, { ok: false, error: '该版本没有可用账号', document: panelDocument() })
          return
        }
        try {
          const result = await probeEfforts(toCredential(account), modelId)
          // 被限流/额度不足时不算探测结论，不写状态。
          if (result.aborted === '') {
            await state.setEfforts(variantId, modelId, result.accepted)
            invalidate()
          }
          json(res, 200, {
            ok: result.aborted === '',
            ...result,
            ...result.aborted === '' ? {} : { error: result.detail.at(-1)?.reason ?? '探测中止' },
            document: panelDocument(),
          })
        } catch (error: unknown) {
          json(res, 200, { ok: false, error: String(error), document: panelDocument() })
        }
      })

      // 浏览器授权登录：起一次
      mount(`${ROUTE_PREFIX}/login/start`, async (req, res) => {
        const body = await readJsonBody(req)
        const variantId = typeof body['variantId'] === 'string' ? body['variantId'] : ''
        const variant = variantFor(variantId)
        if (variant === undefined) {
          json(res, 400, { ok: false, error: '未知的 variantId', document: panelDocument() })
          return
        }
        try {
          const { state, authUrl } = await startLogin(variant)
          pendingLogins.set(state, { variantId, startedAtMs: Date.now() })
          json(res, 200, { ok: true, state, authUrl, document: panelDocument() })
        } catch (error: unknown) {
          json(res, 200, { ok: false, error: String(error), document: panelDocument() })
        }
      })

      // 浏览器授权登录：轮询结果，成功后直接入库并拉目录
      mount(`${ROUTE_PREFIX}/login/poll`, async (req, res) => {
        const body = await readJsonBody(req)
        const state = typeof body['state'] === 'string' ? body['state'] : ''
        const pending = pendingLogins.get(state)
        if (pending === undefined) {
          json(res, 200, { ok: false, status: 'unknown', error: '登录会话已失效，请重新发起', document: panelDocument() })
          return
        }
        // 与上游一致的 10 分钟窗口。
        if (Date.now() - pending.startedAtMs > 10 * 60 * 1000) {
          pendingLogins.delete(state)
          json(res, 200, { ok: false, status: 'expired', error: '登录窗口已过期，请重新发起', document: panelDocument() })
          return
        }
        const variant = variantFor(pending.variantId)!
        const poll = await pollLogin(variant, state)
        if (poll.status === 'pending') {
          json(res, 200, { ok: true, status: 'pending', message: poll.message, document: panelDocument() })
          return
        }
        if (poll.status === 'error') {
          json(res, 200, { ok: false, status: 'error', error: poll.message, document: panelDocument() })
          return
        }
        pendingLogins.delete(state)
        const credential = poll.credential
        await pool.upsert(credential)
        await pool.refreshCatalog(credential.account, credential.variantId).catch(() => undefined)
        await pool.refreshCredits(credential.account, credential.variantId).catch(() => undefined)
        invalidate()
        json(res, 200, {
          ok: true,
          status: 'ok',
          account: { account: credential.account, nickname: credential.nickname, uid: credential.uid },
          document: panelDocument(),
        })
      })

      // 导入 hub 导出文档（或裸数组 / 单账号 / 桌面凭据）
      mount(`${ROUTE_PREFIX}/import`, async (req, res) => {
        const body = await readJsonBody(req)
        const payload = typeof body['payload'] === 'string' ? body['payload'] : ''
        const outcome = parseHubExport(payload)
        if (outcome.error !== '') {
          json(res, 200, { ok: false, document: panelDocument({ imported: 0, skipped: [], error: outcome.error }) })
          return
        }
        for (const credential of outcome.credentials) await pool.upsert(credential)
        // 导入后立刻拉一次目录，让模型马上可用。
        for (const credential of outcome.credentials) {
          await pool.refreshCatalog(credential.account, credential.variantId).catch(() => undefined)
        }
        invalidate()
        json(res, 200, {
          ok: true,
          document: panelDocument({ imported: outcome.credentials.length, skipped: outcome.skipped, error: '' }),
        })
      })

      // 单条账号手动导入
      mount(`${ROUTE_PREFIX}/account/import`, async (req, res) => {
        const body = await readJsonBody(req)
        const variantId = typeof body['variantId'] === 'string' ? body['variantId'] : ''
        const variant = variantFor(variantId)
        if (variant === undefined) {
          json(res, 400, { ok: false, error: '未知的变体 id', document: panelDocument() })
          return
        }
        const accessToken = typeof body['accessToken'] === 'string' ? body['accessToken'].trim() : ''
        if (accessToken === '') {
          json(res, 400, { ok: false, error: 'accessToken 不能为空', document: panelDocument() })
          return
        }
        const uid = typeof body['uid'] === 'string' ? body['uid'].trim() : ''
        const enterpriseId = typeof body['enterpriseId'] === 'string' ? body['enterpriseId'].trim() : ''
        const domain = typeof body['domain'] === 'string' && body['domain'].trim() !== ''
          ? body['domain'].trim()
          : variant.region === 'global' ? 'www.workbuddy.ai' : 'www.workbuddy.cn'
        const account = `${uid}:${enterpriseId}`
        await pool.upsert({
          variantId,
          account,
          uid,
          enterpriseId,
          domain,
          nickname: typeof body['nickname'] === 'string' ? body['nickname'] : '',
          accessToken,
          refreshToken: typeof body['refreshToken'] === 'string' ? body['refreshToken'] : '',
          expiresAtMs: Number.isFinite(Number(body['expiresAtMs'])) ? Number(body['expiresAtMs']) : 0,
          refreshExpiresAtMs: 0,
        })
        let catalogError = ''
        try {
          await pool.refreshCatalog(account, variantId)
        } catch (error: unknown) {
          catalogError = String(error)
        }
        invalidate()
        json(res, 200, { ok: true, catalogError, document: panelDocument() })
      })

      mount(`${ROUTE_PREFIX}/account/remove`, async (req, res) => {
        const body = await readJsonBody(req)
        const account = typeof body['account'] === 'string' ? body['account'] : ''
        const variantId = typeof body['variantId'] === 'string' ? body['variantId'] : ''
        const removed = await pool.remove(account, variantId)
        invalidate()
        json(res, 200, { ok: removed, document: panelDocument() })
      })

      mount(`${ROUTE_PREFIX}/account/toggle`, async (req, res) => {
        const body = await readJsonBody(req)
        const account = typeof body['account'] === 'string' ? body['account'] : ''
        const variantId = typeof body['variantId'] === 'string' ? body['variantId'] : ''
        const changed = await pool.setDisabled(account, variantId, body['disabled'] === true)
        invalidate()
        json(res, 200, { ok: changed, document: panelDocument() })
      })

      mount(`${ROUTE_PREFIX}/account/credits`, async (req, res) => {
        const body = await readJsonBody(req)
        const account = typeof body['account'] === 'string' ? body['account'] : ''
        const variantId = typeof body['variantId'] === 'string' ? body['variantId'] : ''
        try {
          // 单个账号的「刷新积分」按钮：强制请求，尊重用户明确意图。
          await pool.refreshCredits(account, variantId, { force: true })
          json(res, 200, { ok: true, document: panelDocument() })
        } catch (error: unknown) {
          json(res, 200, { ok: false, error: String(error), document: panelDocument() })
        }
      })

      mount(`${ROUTE_PREFIX}/account/catalog`, async (req, res) => {
        const body = await readJsonBody(req)
        const account = typeof body['account'] === 'string' ? body['account'] : ''
        const variantId = typeof body['variantId'] === 'string' ? body['variantId'] : ''
        try {
          await pool.refreshCatalog(account, variantId)
          invalidate()
          json(res, 200, { ok: true, document: panelDocument() })
        } catch (error: unknown) {
          json(res, 200, { ok: false, error: String(error), document: panelDocument() })
        }
      })
    })
  }

  // 启动顺序：状态与账号 → provider（内部端点）→ 对外端点 → 路由 → 轮询。
  ctx.effect(() => {
    void (async () => {
      try {
        await bootstrap()
        if (stopped) return
        // provider 先起：DSH 的模型可用性与对外端点开关无关。
        for (const variant of WORKBUDDY_VARIANTS) await startProvider(variant)
        if (stopped) return
        await applyEndpointSwitch()
        if (stopped) return
        registerRoutes()
        startPolling()
        const registered = [...runtimes.values()].filter(r => r.registered).length
        ctx.logger.info(`hyperworkbuddy: 就绪，provider ${registered}/${WORKBUDDY_VARIANTS.length}，对外端点${state.endpointEnabled ? '已启用' : '已关闭'}`)
      } catch (error: unknown) {
        ctx.logger.error(`hyperworkbuddy: 启动失败 ${String(error)}`)
      }
    })()
    return () => {
      stopped = true
      if (pollTimer !== undefined) clearInterval(pollTimer)
      for (const runtime of runtimes.values()) {
        try { runtime.releaseAdapter?.() } catch { /* 已释放 */ }
        void runtime.internal?.close()
        void runtime.external?.close()
      }
    }
  }, 'dsh-hyperworkbuddy: lifecycle')

  // 对外暴露只读状态，方便排查与将来被其他插件复用。
  ctx.provide('hyperworkbuddy', {
    pool,
    state,
    document: panelDocument,
    /** 对外端点地址；关闭时为 undefined。 */
    endpoint: (variantId: string) => {
      const shim = runtimes.get(variantId)?.external
      return shim === undefined ? undefined : `${shim.baseUrl()}/v1`
    },
    /** 内部端点地址（DSH 自己在用）。 */
    internalEndpoint: (variantId: string) => {
      const shim = runtimes.get(variantId)?.internal
      return shim === undefined ? undefined : `${shim.baseUrl()}/v1`
    },
    shimToken: (variantId: string) => runtimes.get(variantId)?.internal?.token(),
    diagnosis: () => [...runtimes.values()].map(runtime => ({
      variantId: runtime.variant.id,
      registered: runtime.registered,
      error: runtime.error,
      externalRunning: runtime.external !== undefined,
    })),
  })
}

export { toCredential, WORKBUDDY_VARIANTS, variantFor }
