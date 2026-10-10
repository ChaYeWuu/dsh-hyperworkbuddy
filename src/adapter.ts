/**
 * 注册给 DSH 的 pi-ai provider。
 *
 * provider 指向本插件的**内部**回环端点，所以模型列表来自账号池的目录并集，
 * 而多账号轮询与失败换号都发生在端点内部——DSH 侧只看到「一个 provider」。
 *
 * `ctx.llm.registerAdapter` 要求真正的 `LlmAdapter` 实例（纯对象会被拒绝），
 * 因此这里复用 `@deepseek-ai/dsh-llm-pi-ai` 导出的 `PiAiAdapter`，并把 pi-ai
 * 的认证面设成惰性：本路由只靠回环端点密钥鉴权，没有 pi-ai 自己的凭据生命周期。
 *
 * @module dsh-hyperworkbuddy/adapter
 */

import { createProvider, type Api, type Model, type ModelThinkingLevel, type ThinkingLevelMap } from '@earendil-works/pi-ai'
import { openAICompletionsApi } from '@earendil-works/pi-ai/api/openai-completions.lazy'
import { PiAiAdapter } from '@deepseek-ai/dsh-llm-pi-ai'
import { resolveRetryPolicy } from '@deepseek-ai/dsh-llm'
import type { AccountPool } from './accounts.ts'
import type { HyperShim } from './shim.ts'
import type { UpstreamModel } from './upstream.ts'

/** 流式空闲上限：一个流读挂起时的最大等待。 */
export const STREAM_IDLE_TIMEOUT_MS = 300_000

/** 无成本上报：订阅额度无法换算成单价，报零而不是编造数字。 */
const NO_COST = { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 } as const

/** 请求图片预算，取 dsh-llm-pi-ai 的默认值。 */
const REQUEST_IMAGE_BUDGETS = {
  maxRequestImageBytes: 20_971_520,
  requestImagePixelBudget: 4_194_304,
  requestImageMaxBytes: 1_048_576,
} as const

/**
 * 惰性的 pi-ai 认证面。
 *
 * 本路由只通过回环端点密钥鉴权（由 `resolveApiKey` 逐次解析），所以 pi-ai 自己的
 * 凭据读写与环境探测必须一律回答「什么都没有」，绝不能凭空造出一份凭据。
 */
const INERT_AUTH = {
  credentials: {
    async read() { return undefined },
    async list() { return [] },
    async modify() { throw new Error('dsh-hyperworkbuddy: 本路由没有 pi-ai 凭据生命周期') },
    async delete() {},
  },
  authContext: {
    async env() { return undefined },
    async fileExists() { return false },
  },
}

/**
 * 把上游声明的推理档位翻成 pi-ai 的 `thinkingLevelMap`。
 *
 * 只有上游明确声明了非空档位集合才给出控件——未声明的模型，它的可选档位属于客户端
 * 私有知识，目录里没有，凭空补一套只会给出实际会被上游忽略的选项。
 * `off` 仅在上游声明 `canDisableThinking` 时提供。
 *
 * @param info - 一条上游模型。
 * @returns pi-ai 的推理字段；不支持时为 `{ reasoning: false }`。
 */
export function reasoningFields(info: UpstreamModel): { reasoning: boolean; thinkingLevelMap?: ThinkingLevelMap } {
  const declared = info.reasoning.supportedEfforts
  if (info.reasoning.supports !== true || declared === undefined || declared.length === 0) {
    return { reasoning: false }
  }
  const map: Record<ModelThinkingLevel, string | null> = {
    off: info.reasoning.canDisableThinking ? 'off' : null,
    // `minimal` 不在上游的档位词表里，声明集永远不会包含它。
    minimal: null,
    low: declared.includes('low') ? 'low' : null,
    medium: declared.includes('medium') ? 'medium' : null,
    high: declared.includes('high') ? 'high' : null,
    xhigh: declared.includes('xhigh') ? 'xhigh' : null,
    max: declared.includes('max') ? 'max' : null,
  }
  return { reasoning: true, thinkingLevelMap: map as ThinkingLevelMap }
}

/** 把一条上游模型转成 pi-ai 模型描述。 */
function toPiModel(info: UpstreamModel, baseUrl: string, providerId: string): Model<Api> {
  return {
    id: info.id,
    name: info.name,
    api: 'openai-completions',
    provider: providerId,
    baseUrl,
    input: info.supportsImages ? ['text', 'image'] : ['text'],
    ...reasoningFields(info),
    cost: NO_COST,
    contextWindow: info.contextWindow,
    maxTokens: info.maxTokens,
    // pi-ai 无法从回环地址推断 WorkBuddy 的字段拼写，这里显式点名。
    compat: { maxTokensField: 'max_tokens' },
  } as unknown as Model<Api>
}

/** 适配器句柄。 */
export interface HyperAdapter {
  /** 传给 `ctx.llm.registerAdapter` 的适配器。 */
  adapter: unknown
  /** 目录变化后重建模型列表。 */
  invalidate(): void
}

/** 构造依赖。 */
export interface HyperAdapterOptions {
  providerId: string
  displayName: string
  /** 内部端点：DSH 自己用，与对外端点开关无关。 */
  shim: HyperShim
  pool: AccountPool
  /** 本 provider 只服务该变体的账号与模型。 */
  variantId: string
  /** 当前隐藏的模型 id。 */
  hidden: () => string[]
  /**
   * 图片附件存储。
   *
   * 声明了 `input: ['text','image']` 的模型，pi-ai 会通过它把图片解析成可发送的
   * 载荷；不给这一项，发图会直接报「requires the durable attachment service」。
   */
  resolveAttachments?: () => unknown
  /** 把附件引用解析成模型可读的图片访问。 */
  resolveImageAccess?: (attachments: unknown, ref: unknown) => unknown
}

/**
 * 组装 provider。
 *
 * `getModels` 每次读取实时目录，所以账号增删、模型上下架都不需要重启 DSH。
 *
 * @param options - 构造依赖。
 * @returns 适配器句柄。
 */
export function createHyperAdapter(options: HyperAdapterOptions): HyperAdapter {
  const { providerId, displayName, shim, pool, variantId } = options

  const buildModels = (): Model<Api>[] => {
    // pi-ai 驱动的 OpenAI SDK 会在 baseURL 后拼 `/chat/completions`。
    const baseUrl = `${shim.baseUrl()}/v1`
    return pool.modelsFor(variantId).map(model => toPiModel(model, baseUrl, providerId))
  }

  /** 选择器可见的模型：隐藏只影响可选择性，不影响已在用的会话。 */
  const visibleModels = (): Model<Api>[] => {
    const hidden = new Set(options.hidden())
    return buildModels().filter(model => !hidden.has(model.id))
  }

  const base = createProvider({
    id: providerId,
    name: displayName,
    auth: {
      apiKey: {
        name: 'HyperWorkBuddy 本机端点密钥',
        async resolve({ credential }) {
          const apiKey = credential?.key
          return apiKey === undefined || apiKey.length === 0
            ? undefined
            : { auth: { apiKey }, source: 'HyperWorkBuddy' }
        },
      },
    },
    models: buildModels(),
    api: openAICompletionsApi(),
  })

  // getModels 返回**全部**模型——隐藏只在 listModels 里过滤，否则已在用被隐藏
  // 模型的会话会因为 resolveModel 查不到模型而直接失败。
  const provider = { ...base, getModels: () => buildModels() }

  const profile = {
    provider: providerId,
    displayName,
    streamIdleTimeoutMs: STREAM_IDLE_TIMEOUT_MS,
    retryPolicy: resolveRetryPolicy(undefined, 'dsh-hyperworkbuddy retryPolicy'),
    configuredMaxTokens: new Map<string, number>(),
    modelErrors: new Map<string, string>(),
    ...REQUEST_IMAGE_BUDGETS,
    piProvider: provider,
  }

  let profiles = new Map([[providerId, profile]])

  // 只有真实的 PiAiAdapter 能被 registerAdapter 接受，纯对象会静默失败。
  const adapterOptions: Record<string, unknown> = {
    profiles: () => profiles,
    auth: INERT_AUTH,
    // 把内部端点的进程内密钥解析成 OpenAI apiKey，pi-ai 会作为 Bearer 发出。
    resolveApiKey: async () => shim.token(),
  }
  if (options.resolveAttachments !== undefined) {
    adapterOptions['resolveAttachments'] = () => options.resolveAttachments!()
  }
  if (options.resolveImageAccess !== undefined) {
    adapterOptions['resolveImageAccess'] = options.resolveImageAccess
  }

  const adapter = new FilteredPiAiAdapter(
    adapterOptions as unknown as ConstructorParameters<typeof PiAiAdapter>[0],
    visibleModels,
  )

  return {
    adapter,
    invalidate: () => {
      profiles = new Map([[providerId, profile]])
    },
  }
}

/**
 * 只在 `listModels` 上做隐藏过滤的适配器。
 *
 * DSH 的模型选择器读 `listModels()`，而 `resolveModel()` 是已有会话解析模型时走的
 * 路径。隐藏必须只作用于前者：一旦在 provider 的 `getModels` 里剔除，被隐藏模型上
 * 的既有会话会直接报 `UNKNOWN_MODEL`。
 */
class FilteredPiAiAdapter extends PiAiAdapter {
  constructor(
    options: ConstructorParameters<typeof PiAiAdapter>[0],
    private readonly visible: () => readonly Model<Api>[],
  ) {
    super(options)
  }

  override async listModels(provider: string): Promise<readonly { provider: string; id: string; name: string; inputModalities: string[] }[]> {
    const models = await super.listModels(provider)
    const allowed = new Set(this.visible().map(model => model.id))
    // 目录为空（账号尚未拉到模型）时不过滤，避免把一切隐藏掉。
    if (allowed.size === 0) return models
    return models.filter(model => allowed.has(model.id))
  }
}
