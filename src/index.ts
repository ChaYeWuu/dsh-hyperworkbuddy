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
import type { Context } from '@deepseek-ai/cordis'
import z from '@deepseek-ai/schemastery'
import { resolveImageAttachmentAccess } from '@deepseek-ai/dsh-llm'
import { AccountPool, ensureEndpointKey, toCredential } from './accounts.ts'
import { createHyperAdapter, type HyperAdapter } from './adapter.ts'
import { parseHubExport } from './import.ts'
import { createHyperShim, type HyperShim } from './shim.ts'
import { PluginState } from './state.ts'
import { WORKBUDDY_VARIANTS, variantFor, type WorkBuddyVariant } from './variants.ts'

/** Cordis 插件名。 */
export const name = 'llm-hyperworkbuddy'

/** 注册 provider 前必须就绪的模型注册表。 */
export const inject = ['llm']

/** 管理路由前缀。 */
export const ROUTE_PREFIX = '/api-hyperworkbuddy'

/** 桌面凭据重扫间隔（毫秒）。 */
const DESKTOP_POLL_MS = 30_000

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
  contextWindow: number
  maxTokens: number
  supportsImages: boolean
  credits?: string
  free: boolean
  /** 是否在选择器中可见。 */
  visible: boolean
  /** 至少有一个账号提供该模型。 */
  available: boolean
  /** 上游声明的推理档位；空数组表示该模型没有档位控件。 */
  efforts: string[]
  defaultEffort: string
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
  const homeDir = ctx.get('dshHomePaths')?.home ?? process.env['DSH_HOME'] ?? ''
  const resolvedHome = homeDir === '' ? process.cwd() : homeDir
  const pool = new AccountPool(resolvedHome)
  const state = new PluginState(resolvedHome, { endpointEnabled: config.endpointEnabled !== false })

  let stopped = false
  let endpointKey = ''
  let pollTimer: NodeJS.Timeout | undefined
  let lastDesktopError = ''
  const runtimes = new Map<string, VariantRuntime>()

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

  /** 首次装载状态与账号，并拉一次目录。 */
  async function bootstrap(): Promise<void> {
    await state.load()
    await pool.load()
    endpointKey = await ensureEndpointKey(resolvedHome)
    if (config.followDesktop !== false) {
      await pool.refreshFromDesktop()
      lastDesktopError = pool.refreshError
    }
    if (pool.allModels().length === 0) {
      await pool.refreshAllCatalogs().catch(() => undefined)
    }
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
      for (const account of pool.list()) {
        if (account.variantId !== variant.id) continue
        for (const model of account.models) {
          if (byId.has(model.id)) continue
          byId.set(model.id, {
            id: model.id,
            name: model.name,
            contextWindow: model.contextWindow,
            maxTokens: model.maxTokens,
            supportsImages: model.supportsImages,
            ...model.billing.credits === undefined ? {} : { credits: model.billing.credits },
            free: model.billing.free,
            visible: !hidden.has(model.id),
            available: true,
            efforts: model.reasoning.supportedEfforts ?? [],
            defaultEffort: model.reasoning.defaultEffort ?? '',
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
          maxTokens: 0,
          supportsImages: false,
          free: false,
          visible: false,
          available: false,
          efforts: [],
          defaultEffort: '',
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
          await pool.refreshCredits(account, variantId)
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
