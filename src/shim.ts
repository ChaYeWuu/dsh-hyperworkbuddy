/**
 * OpenAI 兼容回环端点，带多账号故障切换。
 *
 * 这个端点同时服务两条路径：DSH 自己的 pi-ai provider 指向它，外部客户端
 * （Codex / Claude Code / 其他 OpenAI 客户端）也可以直接连。多账号轮询与
 * 失败换号都发生在这里，所以两条路径共享同一套账号池。
 *
 * 只监听回环地址；入站请求必须是回环 Host，且持有有效的 API Key。
 *
 * @module dsh-hyperworkbuddy/shim
 */

import { randomBytes, timingSafeEqual } from 'node:crypto'
import { createServer, type IncomingMessage, type Server, type ServerResponse } from 'node:http'
import { Readable } from 'node:stream'
import { AccountPool, toCredential, type PoolAccount } from './accounts.ts'
import { chatCompletions, modelOfBody, type ChatResult, type UpstreamErrorKind } from './upstream.ts'
import { createUsageTap, readUsageBlock, type UsageFields, type UsageLedger } from './usage.ts'

/** 插件上下文里可用的最小日志接口。 */
export interface ShimLogger {
  info(...args: unknown[]): void
  warn(...args: unknown[]): void
  error(...args: unknown[]): void
}

/** 运行中的端点。 */
export interface HyperShim {
  /** 监听就绪。 */
  ready: Promise<void>
  /** 端点基地址，如 `http://127.0.0.1:8791`。 */
  baseUrl(): string
  /** DSH 自己用的进程内密钥。 */
  token(): string
  /** 实际监听端口。 */
  port(): number
  /** 停止服务。 */
  close(): Promise<void>
}

/** 构造依赖。 */
export interface HyperShimOptions {
  pool: AccountPool
  /** 本端点只服务该变体的账号；同名模型在两区走不同上游，混用会发错区域。 */
  variantId: string
  /** 外部客户端使用的 API Key 列表；空数组表示只用兜底密钥。 */
  apiKeys: () => string[]
  /** 未配置 apiKeys 时使用的自动生成密钥。 */
  fallbackKey?: () => string
  /** 监听端口；0 表示随机。 */
  port: () => number
  /** 模型可见性：该账号被隐藏的模型 id。 */
  hiddenModels: () => string[]
  /** 请求流水；省略则不记账。 */
  usage?: UsageLedger
  logger?: ShimLogger
}

const REQUEST_BODY_LIMIT = 16 * 1024 * 1024

/** 上游失败类别到 HTTP 状态的映射。 */
const KIND_STATUS: Readonly<Record<UpstreamErrorKind, number>> = {
  hard_credit: 402,
  soft_rate: 429,
  session_dead: 401,
  not_found: 502,
  server: 502,
  client: 400,
}

/** 值得换号的失败类别：换一个账号重试有意义。 */
const FAILOVER_KINDS: ReadonlySet<UpstreamErrorKind> = new Set<UpstreamErrorKind>([
  'hard_credit', 'soft_rate', 'session_dead', 'server',
])

function writeJson(res: ServerResponse, status: number, body: unknown): void {
  const payload = JSON.stringify(body)
  res.writeHead(status, { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(payload) })
  res.end(payload)
}

function writeOpenAIError(res: ServerResponse, status: number, kind: string, message: string): void {
  writeJson(res, status, { error: { message, type: kind, code: kind } })
}

/** Host 头是否指向回环。 */
function hostIsLoopback(host: string | undefined): boolean {
  if (typeof host !== 'string' || host === '') return false
  const name = host.replace(/:\d+$/u, '').replace(/^\[|\]$/gu, '').toLowerCase()
  return name === '127.0.0.1' || name === 'localhost' || name === '::1' || name === '[::1]'
}

/** Origin 头（若存在）是否回环。 */
function originIsLoopback(origin: string | undefined): boolean {
  if (origin === undefined || origin === '') return true
  try {
    const host = new URL(origin).hostname.toLowerCase()
    return host === '127.0.0.1' || host === 'localhost' || host === '::1'
  } catch {
    return false
  }
}

/** 常量时间比较两个字符串。 */
function secretEquals(a: string, b: string): boolean {
  const left = Buffer.from(a)
  const right = Buffer.from(b)
  if (left.length !== right.length) return false
  return timingSafeEqual(left, right)
}

function isJsonContentType(req: IncomingMessage): boolean {
  const type = req.headers['content-type']
  return typeof type === 'string' && type.trim().toLowerCase().startsWith('application/json')
}

/** 读取请求体，超限即失败。 */
function readBody(req: IncomingMessage): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = []
    let size = 0
    req.on('data', (chunk: Buffer) => {
      size += chunk.length
      if (size > REQUEST_BODY_LIMIT) {
        reject(new Error('request body too large'))
        req.destroy()
        return
      }
      chunks.push(chunk)
    })
    req.on('end', () => resolve(Buffer.concat(chunks)))
    req.on('error', reject)
  })
}

/**
 * 启动端点。
 *
 * @param options - 构造依赖。
 * @returns 运行中的端点句柄。
 */
export function createHyperShim(options: HyperShimOptions): HyperShim {
  const { pool, variantId } = options
  const logger = options.logger
  // 进程内密钥：DSH 自己的 provider 用它，外部攻击者无法从内存里读出。
  const SHARED_SECRET = randomBytes(32).toString('base64url')

  /** 本端点可见的账号：限定变体。 */
  const scoped = (): PoolAccount[] => pool.available(variantId)

  /** 入站鉴权：进程内密钥、兜底密钥或用户配置的任一 API Key。 */
  function authorize(req: IncomingMessage): boolean {
    const header = req.headers.authorization
    if (typeof header !== 'string') return false
    const match = /^Bearer\s+(.+)$/iu.exec(header.trim())
    if (match === null) return false
    const presented = match[1]!
    if (secretEquals(presented, SHARED_SECRET)) return true
    // 外部客户端用配置的 Key；未配置时回落到自动生成的密钥，而不是完全放开。
    const fallback = options.fallbackKey?.() ?? ''
    if (fallback !== '' && secretEquals(presented, fallback)) return true
    return options.apiKeys().some(key => secretEquals(presented, key))
  }

  const server: Server = createServer((req, res) => {
    void handle(req, res)
  })

  const ready = new Promise<void>((resolve, reject) => {
    server.once('listening', () => resolve())
    server.once('error', reject)
  })

  server.listen(options.port(), '127.0.0.1')

  const port = (): number => {
    const address = server.address()
    if (address === null || typeof address === 'string') throw new Error('端点没有监听地址')
    return address.port
  }
  const baseUrl = (): string => `http://127.0.0.1:${port()}`

  async function handle(req: IncomingMessage, res: ServerResponse): Promise<void> {
    try {
      if (!hostIsLoopback(req.headers.host)) {
        writeOpenAIError(res, 403, 'host_not_allowed', 'Host 头必须指向回环地址')
        return
      }
      if (!originIsLoopback(req.headers.origin)) {
        writeOpenAIError(res, 403, 'origin_not_allowed', 'Origin 必须是回环来源')
        return
      }
      const url = (req.url ?? '/').split('?')[0] ?? '/'
      if (req.method === 'GET' && (url === '/healthz' || url === '/healthz/')) {
        writeJson(res, 200, { ok: true, variant: variantId, accounts: scoped().length })
        return
      }
      if (!authorize(req)) {
        writeOpenAIError(res, 401, 'unauthorized', '缺少或无效的 Authorization bearer')
        return
      }
      if (req.method === 'GET' && (url === '/v1/models' || url === '/v1/models/')) {
        listModels(res)
        return
      }
      if (req.method === 'POST' && (url === '/v1/chat/completions' || url === '/v1/chat/completions/')) {
        await chatRoute(req, res)
        return
      }
      writeOpenAIError(res, 404, 'not_found', `没有该路由：${req.method} ${url}`)
    } catch (error: unknown) {
      if (!res.headersSent) writeOpenAIError(res, 500, 'internal', String(error))
      else res.end()
    }
  }

  /** 汇总本变体所有可用账号的模型目录，按 id 去重。 */
  function listModels(res: ServerResponse): void {
    const hidden = new Set(options.hiddenModels())
    const seen = new Map<string, { id: string; object: 'model'; created: number; owned_by: string }>()
    for (const account of scoped()) {
      for (const model of account.models) {
        if (hidden.has(model.id) || seen.has(model.id)) continue
        seen.set(model.id, { id: model.id, object: 'model', created: 0, owned_by: account.variantId })
      }
    }
    writeJson(res, 200, { object: 'list', data: [...seen.values()] })
  }

  /**
   * chat 路由：选账号 → 失败换号重试 → 成功则把 SSE 原样回写。
   *
   * 最多尝试「可用账号数」次，保证每个账号都有机会；全部失败时返回最后一个
   * 失败的错误，让用户看到真实原因而不是笼统的 500。
   */
  async function chatRoute(req: IncomingMessage, res: ServerResponse): Promise<void> {
    if (!isJsonContentType(req)) {
      writeOpenAIError(res, 415, 'unsupported_media_type', 'Content-Type 必须是 application/json')
      return
    }
    const raw = (await readBody(req)).toString('utf8')
    const model = modelOfBody(raw)
    const hidden = new Set(options.hiddenModels())
    if (model !== '' && hidden.has(model)) {
      writeOpenAIError(res, 400, 'model_hidden', `模型 ${model} 已被隐藏`)
      return
    }

    const candidates = scoped()
    if (candidates.length === 0) {
      writeOpenAIError(res, 401, 'no_account', '没有可用账号；请在设置 → WorkBuddy 里登录或导入账号')
      return
    }

    const controller = new AbortController()
    req.on('close', () => controller.abort())

    const sessionKey = sessionKeyOf(req)
    const startedAtMs = Date.now()
    let last: { status: number; kind: UpstreamErrorKind; message: string } | undefined
    const tried = new Set<string>()
    for (let attempt = 0; attempt < candidates.length; attempt++) {
      const account = pickAccount(candidates, tried, sessionKey)
      if (account === undefined) break
      tried.add(`${account.account}|${account.variantId}`)
      const result: ChatResult = await chatCompletions(toCredential(account), raw, controller.signal)
      if (result.ok) {
        pool.noteSuccess(account.account, account.variantId)
        // 成功了才建立亲和：失败账号对这段会话不合适，绑上去只会让每个请求先撞墙。
        pool.bindSession(sessionKey, account.account, account.variantId)
        await streamThrough(res, result.response, controller, {
          variantId, account: account.account, model, startedAtMs,
        })
        return
      }
      last = { status: result.status, kind: result.kind, message: result.message }
      pool.noteFailure(
        account.account,
        account.variantId,
        `${result.kind}: ${result.message}`,
        FAILOVER_KINDS.has(result.kind),
      )
      logger?.warn(`hyperworkbuddy: 账号 ${account.account} 失败（${result.kind}），尝试下一个`)
      if (!FAILOVER_KINDS.has(result.kind)) break
      if (controller.signal.aborted) break
    }

    if (last === undefined) {
      writeOpenAIError(res, 503, 'no_account', '没有可用账号')
      return
    }
    await options.usage?.record({
      atMs: startedAtMs,
      variantId,
      account: '',
      model,
      ok: false,
      kind: last.kind,
      promptTokens: 0,
      completionTokens: 0,
      cachedTokens: 0,
      totalTokens: 0,
      elapsedMs: Date.now() - startedAtMs,
    })
    writeOpenAIError(res, KIND_STATUS[last.kind], last.kind, `全部账号均失败，最后一个错误：${last.message}`)
  }

  /**
   * 取出请求里的会话标识。
   *
   * pi-ai 在 `compat.sendSessionAffinityHeaders` 打开时会把这些头都发出来，
   * 取任意一个都指向同一个会话；外部客户端通常一个都不带，那就退化成纯轮转。
   */
  function sessionKeyOf(req: IncomingMessage): string {
    for (const name of ['x-session-id', 'session_id', 'x-session-affinity', 'x-client-request-id'] as const) {
      const value = req.headers[name]
      if (typeof value === 'string' && value.trim() !== '') return value.trim()
    }
    return ''
  }

  /**
   * 在候选里选一个还没试过的账号。
   *
   * 优先复用该会话已绑定的账号（上游 prompt cache 按账号隔离，换号等于把整段
   * 对话的缓存作废）；绑定账号不可用时退回「使用次数最少」，保证失败后能换号。
   */
  function pickAccount(
    candidates: PoolAccount[],
    tried: Set<string>,
    sessionKey: string,
  ): PoolAccount | undefined {
    const fresh = candidates.filter(a => !tried.has(`${a.account}|${a.variantId}`))
    if (fresh.length === 0) return undefined
    if (sessionKey !== '') {
      const bound = pool.sessionBinding(sessionKey)
      if (bound !== undefined) {
        const pinned = fresh.find(a => a.account === bound.account && a.variantId === bound.variantId)
        if (pinned !== undefined) return pinned
      }
    }
    const minUsed = Math.min(...fresh.map(a => a.lastUsedAtMs))
    return fresh.filter(a => a.lastUsedAtMs === minUsed)[0]
  }

  /** 把上游 SSE 原样转发；断流时补一个 [DONE]，顺手把 usage 记成流水。 */
  async function streamThrough(
    res: ServerResponse,
    upstream: Response,
    controller: AbortController,
    context: { variantId: string; account: string; model: string; startedAtMs: number },
  ): Promise<void> {
    const contentType = upstream.headers.get('content-type') ?? ''
    if (!contentType.includes('text/event-stream')) {
      await relayJson(res, upstream, context)
      return
    }
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',
    })
    if (upstream.body === null) {
      res.end('data: [DONE]\n\n')
      return
    }
    let sawDone = false
    // 正常结束与用户中断都会走到，只能记一次。
    let recorded = false
    const tap = createUsageTap()
    const flush = (): void => {
      if (recorded) return
      recorded = true
      void recordUsage(context, tap.usage(), Date.now() - context.startedAtMs)
    }
    const body = Readable.fromWeb(upstream.body as Parameters<typeof Readable.fromWeb>[0])
    body.on('data', (chunk: Buffer) => {
      if (chunk.includes('[DONE]')) sawDone = true
      tap.feed(chunk)
    })
    body.on('error', (error: unknown) => {
      logger?.warn('hyperworkbuddy: 上游流中途失败', error)
      if (!sawDone && res.writable) res.end('data: [DONE]\n\n')
      flush()
    })
    body.on('end', flush)
    controller.signal.addEventListener('abort', () => {
      body.destroy()
      if (!res.writableEnded) res.end()
      // 用户中断也要记账：上游已经算过的输入 token 不会因为本地取消退回来。
      flush()
    }, { once: true })
    body.pipe(res)
  }

  /** 非 SSE 响应：整体缓冲后原样回写。 */
  async function relayJson(
    res: ServerResponse,
    upstream: Response,
    context: { variantId: string; account: string; model: string; startedAtMs: number },
  ): Promise<void> {
    const text = upstream.body === null ? '' : await new Response(upstream.body).text()
    let usage: UsageFields | undefined
    try {
      usage = readUsageBlock((JSON.parse(text) as Record<string, unknown>)['usage'])
    } catch {
      usage = undefined
    }
    await recordUsage(context, usage, Date.now() - context.startedAtMs)
    res.writeHead(upstream.status, {
      'Content-Type': upstream.headers.get('content-type') ?? 'application/json',
      'Content-Length': Buffer.byteLength(text),
    })
    res.end(text)
  }

  /** 记一条成功流水；没有 usage 也记一行，否则「请求数」会漏掉这些调用。 */
  async function recordUsage(
    context: { variantId: string; account: string; model: string; startedAtMs: number },
    usage: UsageFields | undefined,
    elapsedMs: number,
  ): Promise<void> {
    await options.usage?.record({
      atMs: context.startedAtMs,
      variantId: context.variantId,
      account: context.account,
      model: context.model,
      ok: true,
      promptTokens: usage?.promptTokens ?? 0,
      completionTokens: usage?.completionTokens ?? 0,
      cachedTokens: usage?.cachedTokens ?? 0,
      totalTokens: usage?.totalTokens ?? 0,
      elapsedMs,
    })
  }

  return {
    ready,
    baseUrl,
    token: () => SHARED_SECRET,
    port,
    close: () => new Promise<void>((resolve, reject) => {
      server.close(() => resolve())
      server.closeAllConnections()
      server.once('error', reject)
    }),
  }
}
