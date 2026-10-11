/**
 * 多账号池：账号存储、轮询选取、冷却与故障切换。
 *
 * 账号来源有两条：自动发现的桌面 App 登录（只读，不写回），以及用户在面板里
 * 手动导入的凭据（本插件自持，可写）。
 *
 * @module dsh-hyperworkbuddy/accounts
 */

import { randomBytes } from 'node:crypto'
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import type { WorkBuddyCredential } from './auth.ts'
import { isExpiringSoon, readDesktopCredential } from './auth.ts'
import { WORKBUDDY_VARIANTS, type WorkBuddyVariant } from './variants.ts'
import { fetchCatalog, fetchCredits, refreshAccessToken, type CreditSnapshot, type UpstreamModel } from './upstream.ts'

/** 一条被池管理的账号。 */
export interface PoolAccount {
  /** 稳定账号标识，`uid:enterpriseId`。 */
  account: string
  /** 所属变体 id。 */
  variantId: string
  /** 凭据来源。 */
  source: 'desktop' | 'manual'
  /** 展示用昵称。 */
  nickname: string
  /** 登录域。 */
  domain: string
  /** 上游 bearer token。 */
  accessToken: string
  /** 刷新 token。 */
  refreshToken: string
  /** access token 到期时刻（毫秒）。 */
  expiresAtMs: number
  /** refresh token 到期时刻（毫秒）。 */
  refreshExpiresAtMs: number
  /** 是否被用户停用。 */
  disabled: boolean
  /** 冷却解除时刻（毫秒）；0 表示不在冷却。 */
  cooldownUntilMs: number
  /** 连续失败次数，用于指数退避。 */
  failStreak: number
  /** 最近一次失败原因。 */
  lastError: string
  /** 最近一次成功调用时刻（毫秒）。 */
  lastUsedAtMs: number
  /** 最近一次积分快照。 */
  credits?: CreditSnapshot
  /** 积分快照时刻（毫秒）。 */
  creditsAtMs: number
  /** 最近一次成功拉取的模型目录。 */
  models: UpstreamModel[]
  /** 模型目录时刻（毫秒）。 */
  modelsAtMs: number
  /** 目录来源：live 为上游实时，saved 为上次成功结果。 */
  catalogSource: 'live' | 'saved'
  /** 最近一次目录拉取失败原因。 */
  catalogError: string
}

/** 落盘的账号文件结构。 */
interface AccountsDocument {
  version: 1
  accounts: PoolAccount[]
}

/** 账号文件名。 */
export const ACCOUNTS_FILENAME = '.hyperworkbuddy-accounts.json'

/** 自动生成的端点密钥文件名。 */
export const ENDPOINT_KEY_FILENAME = '.hyperworkbuddy-endpoint-key'

/** 生成一把新的端点密钥。 */
export function makeEndpointKey(): string {
  return `hwb-${randomBytes(24).toString('base64url')}`
}

/**
 * 写入端点密钥。
 *
 * @param homeDir - DSH home 目录。
 * @param key - 要写入的密钥。
 */
export async function writeEndpointKey(homeDir: string, key: string): Promise<void> {
  const path = join(homeDir, ENDPOINT_KEY_FILENAME)
  await mkdir(dirname(path), { recursive: true })
  await writeFile(path, key, { encoding: 'utf8', mode: 0o600 })
}

/**
 * 读取或生成端点密钥。
 *
 * 未配置 `apiKeys` 时用这把自动生成的密钥兜底，而不是完全放开——否则本机任意
 * 进程都能花掉用户的 WorkBuddy 额度。密钥落盘在 home 目录下，面板会显示它
 * 供外部客户端复制。
 *
 * @param homeDir - DSH home 目录。
 * @returns 已存在的或新生成的密钥。
 */
export async function ensureEndpointKey(homeDir: string): Promise<string> {
  const path = join(homeDir, ENDPOINT_KEY_FILENAME)
  try {
    const existing = (await readFile(path, 'utf8')).trim()
    if (existing !== '') return existing
  } catch {
    // 不存在则生成
  }
  const key = makeEndpointKey()
  await writeEndpointKey(homeDir, key)
  return key
}

/**
 * 重置端点密钥。
 *
 * @param homeDir - DSH home 目录。
 * @param custom - 自定义密钥；省略则随机生成一把新的。
 * @returns 生效的密钥。
 */
export async function resetEndpointKey(homeDir: string, custom?: string): Promise<string> {
  const key = custom !== undefined && custom.trim() !== '' ? custom.trim() : makeEndpointKey()
  await writeEndpointKey(homeDir, key)
  return key
}

/** 单次冷却基数与上限：第一次 60 秒，翻倍到 1 小时。 */
const COOLDOWN_BASE_MS = 60_000
const COOLDOWN_MAX_MS = 3_600_000

/**
 * 积分缓存有效期。
 *
 * 余额不是秒级变化的数字，而每次读取都是一趟上游请求；16 个账号串行刷新很容易
 * 撞上限流。10 分钟内的重复读取直接吃缓存，手动点刷新时仍会强制请求。
 */
const CREDITS_TTL_MS = 10 * 60 * 1000

/** 账号文件路径。 */
export function accountsPath(homeDir: string): string {
  return join(homeDir, ACCOUNTS_FILENAME)
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

/** 从落盘数据里还原积分快照。 */
function parseCredits(value: unknown): CreditSnapshot | undefined {
  if (!isRecord(value)) return undefined
  const packages: CreditSnapshot['packages'] = []
  if (Array.isArray(value['packages'])) {
    for (const raw of value['packages']) {
      if (!isRecord(raw)) continue
      packages.push({
        name: typeof raw['name'] === 'string' ? raw['name'] : '(未命名)',
        ...Number.isFinite(Number(raw['remain'])) ? { remain: Number(raw['remain']) } : {},
        ...Number.isFinite(Number(raw['size'])) ? { size: Number(raw['size']) } : {},
      })
    }
  }
  const remaining = Number(value['remaining'])
  const total = Number(value['total'])
  if (!Number.isFinite(remaining) && !Number.isFinite(total) && packages.length === 0) return undefined
  return {
    ...Number.isFinite(remaining) ? { remaining } : {},
    ...Number.isFinite(total) ? { total } : {},
    packages,
  }
}

/** 校验并归一化一条落盘账号。 */
function parseAccount(value: unknown): PoolAccount | undefined {
  if (!isRecord(value)) return undefined
  const account = typeof value['account'] === 'string' ? value['account'] : ''
  const accessToken = typeof value['accessToken'] === 'string' ? value['accessToken'] : ''
  if (account === '' || accessToken === '') return undefined
  const variantId = typeof value['variantId'] === 'string' ? value['variantId'] : ''
  if (variantId === '') return undefined
  const credits = parseCredits(value['credits'])
  return {
    account,
    variantId,
    source: value['source'] === 'manual' ? 'manual' : 'desktop',
    nickname: typeof value['nickname'] === 'string' ? value['nickname'] : '',
    domain: typeof value['domain'] === 'string' ? value['domain'] : '',
    accessToken,
    refreshToken: typeof value['refreshToken'] === 'string' ? value['refreshToken'] : '',
    expiresAtMs: Number.isFinite(Number(value['expiresAtMs'])) ? Number(value['expiresAtMs']) : 0,
    refreshExpiresAtMs: Number.isFinite(Number(value['refreshExpiresAtMs'])) ? Number(value['refreshExpiresAtMs']) : 0,
    disabled: value['disabled'] === true,
    cooldownUntilMs: 0,
    failStreak: 0,
    lastError: '',
    lastUsedAtMs: 0,
    // 缓存读回来，重启后不必为看一眼余额就重新请求全部账号。
    ...credits === undefined ? {} : { credits },
    creditsAtMs: Number.isFinite(Number(value['creditsAtMs'])) ? Number(value['creditsAtMs']) : 0,
    models: Array.isArray(value['models']) ? value['models'] as UpstreamModel[] : [],
    modelsAtMs: Number.isFinite(Number(value['modelsAtMs'])) ? Number(value['modelsAtMs']) : 0,
    catalogSource: 'saved',
    catalogError: '',
  }
}

/** 原子写账号文件。 */
async function persist(path: string, accounts: PoolAccount[]): Promise<void> {
  const document: AccountsDocument = { version: 1, accounts }
  await mkdir(dirname(path), { recursive: true })
  const temp = `${path}.${process.pid}.tmp`
  await writeFile(temp, JSON.stringify(document, null, 2), 'utf8')
  await rename(temp, path)
}

/** 把池账号转成上游客户端需要的凭据。 */
export function toCredential(account: PoolAccount): WorkBuddyCredential {
  return {
    variantId: account.variantId,
    account: account.account,
    uid: account.account.split(':')[0] ?? '',
    enterpriseId: account.account.split(':')[1] ?? '',
    domain: account.domain,
    nickname: account.nickname,
    accessToken: account.accessToken,
    refreshToken: account.refreshToken,
    expiresAtMs: account.expiresAtMs,
    refreshExpiresAtMs: account.refreshExpiresAtMs,
  }
}

/** 由凭据构造池账号。 */
function fromCredential(credential: WorkBuddyCredential, source: PoolAccount['source']): PoolAccount {
  return {
    account: credential.account,
    variantId: credential.variantId,
    source,
    nickname: credential.nickname,
    domain: credential.domain,
    accessToken: credential.accessToken,
    refreshToken: credential.refreshToken,
    expiresAtMs: credential.expiresAtMs,
    refreshExpiresAtMs: credential.refreshExpiresAtMs,
    disabled: false,
    cooldownUntilMs: 0,
    failStreak: 0,
    lastError: '',
    lastUsedAtMs: 0,
    creditsAtMs: 0,
    models: [],
    modelsAtMs: 0,
    catalogSource: 'saved',
    catalogError: '',
  }
}

/**
 * 账号池。
 *
 * 选取策略：过滤掉停用、冷却中与凭据缺失的账号，在剩余账号里按
 * 「最少使用 + 轮转」挑选，同一账号失败即进入指数冷却并立刻换下一个。
 */
export class AccountPool {
  private accounts: PoolAccount[] = []
  private readonly path: string
  /** 轮转游标，保证同优先级账号被轮流使用。 */
  private cursor = 0
  /** 最近一次刷新错误，供面板展示。 */
  private lastRefreshError = ''

  constructor(homeDir: string) {
    this.path = accountsPath(homeDir)
  }

  /** 从磁盘加载手动导入的账号。 */
  async load(): Promise<void> {
    let text: string
    try {
      text = await readFile(this.path, 'utf8')
    } catch {
      this.accounts = []
      return
    }
    try {
      const document = JSON.parse(text) as unknown
      const rows = isRecord(document) && Array.isArray(document['accounts'])
        ? document['accounts']
        : Array.isArray(document) ? document : []
      this.accounts = rows.map(parseAccount).filter((a): a is PoolAccount => a !== undefined)
    } catch {
      this.accounts = []
    }
  }

  /** 当前账号快照（浅拷贝，避免外部直接改内部状态）。 */
  list(): PoolAccount[] {
    return this.accounts.map(account => ({ ...account }))
  }

  /** 最近一次桌面凭据刷新失败原因；空串表示没有错误。 */
  get refreshError(): string {
    return this.lastRefreshError
  }

  /** 手动导入或覆盖一条账号。 */
  async upsert(credential: WorkBuddyCredential): Promise<void> {
    const existing = this.accounts.find(account => account.account === credential.account
      && account.variantId === credential.variantId)
    if (existing === undefined) {
      this.accounts.push(fromCredential(credential, 'manual'))
    } else {
      // 手动导入总是覆盖并解除冷却，让用户能立刻恢复一个被冷却的账号。
      Object.assign(existing, {
        accessToken: credential.accessToken,
        refreshToken: credential.refreshToken,
        domain: credential.domain,
        nickname: credential.nickname,
        expiresAtMs: credential.expiresAtMs,
        refreshExpiresAtMs: credential.refreshExpiresAtMs,
        source: 'manual',
        cooldownUntilMs: 0,
        failStreak: 0,
        lastError: '',
      })
    }
    await this.persist()
  }

  /** 删除一条账号；桌面发现的账号删掉后会在下次扫描时回来。 */
  async remove(account: string, variantId: string): Promise<boolean> {
    const before = this.accounts.length
    this.accounts = this.accounts.filter(a => !(a.account === account && a.variantId === variantId))
    if (this.accounts.length === before) return false
    await this.persist()
    return true
  }

  /** 启用 / 停用一条账号。 */
  async setDisabled(account: string, variantId: string, disabled: boolean): Promise<boolean> {
    const target = this.accounts.find(a => a.account === account && a.variantId === variantId)
    if (target === undefined) return false
    target.disabled = disabled
    if (!disabled) {
      target.cooldownUntilMs = 0
      target.failStreak = 0
      target.lastError = ''
    }
    await this.persist()
    return true
  }

  /**
   * 重新扫描桌面 App 登录，并合并进池。
   *
   * 桌面来源的账号每次扫描都以最新凭据覆盖（App 会自己刷新 token），但保留
   * 用户的停用状态与冷却计数。手动导入的账号不被桌面扫描覆盖。
   */
  async refreshFromDesktop(): Promise<void> {
    const errors: string[] = []
    let changed = false
    for (const variant of WORKBUDDY_VARIANTS) {
      const result = await readDesktopCredential(variant)
      if (!result.ok) {
        errors.push(result.reason)
        continue
      }
      const credential = result.credential
      if (credential.account === ':') continue
      const existing = this.accounts.find(a => a.account === credential.account && a.variantId === variant.id)
      if (existing === undefined) {
        this.accounts.push(fromCredential(credential, 'desktop'))
        changed = true
        continue
      }
      if (existing.source === 'manual') continue
      const tokenChanged = existing.accessToken !== credential.accessToken
      Object.assign(existing, {
        accessToken: credential.accessToken,
        refreshToken: credential.refreshToken,
        domain: credential.domain,
        nickname: credential.nickname,
        expiresAtMs: credential.expiresAtMs,
        refreshExpiresAtMs: credential.refreshExpiresAtMs,
      })
      if (tokenChanged) {
        // 新 token 到了，冷却与失败计数作废。
        existing.cooldownUntilMs = 0
        existing.failStreak = 0
        existing.lastError = ''
        changed = true
      }
    }
    this.lastRefreshError = errors.join('；')
    if (changed) await this.persist()
  }

  /** 可用于请求的账号：启用、未冷却、凭据未过期。 */
  available(variantId?: string): PoolAccount[] {
    const now = Date.now()
    return this.accounts.filter(account =>
      !account.disabled
      && account.cooldownUntilMs <= now
      && account.accessToken !== ''
      && (variantId === undefined || account.variantId === variantId),
    )
  }

  /**
   * 选一个账号并推进轮转游标。
   *
   * 在可用账号里按「使用次数最少」优先，同档次按游标轮转，避免把负载全压在
   * 一个账号上。
   *
   * @param variantId - 限定变体；省略表示全部。
   * @returns 选中的账号，没有可用账号时为 undefined。
   */
  acquire(variantId?: string): PoolAccount | undefined {
    const candidates = this.available(variantId)
    if (candidates.length === 0) return undefined
    const minUsed = Math.min(...candidates.map(a => a.lastUsedAtMs))
    const tier = candidates.filter(a => a.lastUsedAtMs === minUsed)
    const picked = tier[this.cursor % tier.length]!
    this.cursor = (this.cursor + 1) % Math.max(1, candidates.length)
    return picked
  }

  /** 记一次成功：清除冷却与失败计数。 */
  noteSuccess(account: string, variantId: string): void {
    const target = this.accounts.find(a => a.account === account && a.variantId === variantId)
    if (target === undefined) return
    target.cooldownUntilMs = 0
    target.failStreak = 0
    target.lastError = ''
    target.lastUsedAtMs = Date.now()
  }

  /**
   * 记一次失败并按指数退避进入冷却。
   *
   * @param account - 账号标识。
   * @param variantId - 变体 id。
   * @param message - 失败原因。
   * @param retryable - 是否值得重试；会话失效 / 额度不足这类硬失败同样要冷却，
   *   否则同一个坏账号会被反复选中。
   */
  noteFailure(account: string, variantId: string, message: string, retryable = true): void {
    const target = this.accounts.find(a => a.account === account && a.variantId === variantId)
    if (target === undefined) return
    target.failStreak += 1
    target.lastError = message
    target.lastUsedAtMs = Date.now()
    if (!retryable) return
    const backoff = Math.min(COOLDOWN_BASE_MS * 2 ** (target.failStreak - 1), COOLDOWN_MAX_MS)
    target.cooldownUntilMs = Date.now() + backoff
  }

  /** 用最新凭据覆盖某账号的 token（刷新后调用）。 */
  async applyRefresh(
    account: string,
    variantId: string,
    next: { accessToken: string; refreshToken?: string; expiresInSec?: number; domain?: string },
  ): Promise<void> {
    const target = this.accounts.find(a => a.account === account && a.variantId === variantId)
    if (target === undefined) return
    target.accessToken = next.accessToken
    if (next.refreshToken !== undefined) target.refreshToken = next.refreshToken
    if (next.domain !== undefined) target.domain = next.domain
    if (next.expiresInSec !== undefined && Number.isFinite(next.expiresInSec)) {
      target.expiresAtMs = Date.now() + next.expiresInSec * 1000
    }
    target.cooldownUntilMs = 0
    target.failStreak = 0
    target.lastError = ''
    await this.persist()
  }

  /**
   * 对需要续期的账号刷新 token。
   *
   * @returns 成功刷新的账号数。
   */
  async refreshExpiringTokens(): Promise<number> {
    let refreshed = 0
    for (const account of [...this.accounts]) {
      if (account.disabled) continue
      const credential = toCredential(account)
      if (!isExpiringSoon(credential)) continue
      if (credential.refreshToken === '') continue
      try {
        const next = await refreshAccessToken(credential)
        await this.applyRefresh(account.account, account.variantId, next)
        refreshed += 1
      } catch (error: unknown) {
        this.noteFailure(account.account, account.variantId, `刷新 token 失败：${String(error)}`, false)
      }
    }
    if (refreshed > 0) await this.persist()
    return refreshed
  }

  /**
   * 刷新某账号的积分快照。
   *
   * @param account - 账号标识。
   * @param variantId - 变体 id。
   * @param options - `force` 为真时跳过缓存强制请求（面板上手动点刷新）。
   * @returns 积分快照。
   */
  async refreshCredits(
    account: string,
    variantId: string,
    options: { force?: boolean } = {},
  ): Promise<CreditSnapshot> {
    const target = this.accounts.find(a => a.account === account && a.variantId === variantId)
    if (target === undefined) throw new Error('账号不存在')
    // 缓存还新鲜就直接用：余额不是秒级变化的数字，重复请求只会白吃限流。
    if (options.force !== true && this.creditsAreFresh(target)) return target.credits!
    const snapshot = await fetchCredits(toCredential(target))
    target.credits = snapshot
    target.creditsAtMs = Date.now()
    await this.persist()
    return snapshot
  }

  /** 该账号的积分缓存是否还在有效期内。 */
  creditsAreFresh(target: PoolAccount): boolean {
    if (target.credits === undefined || target.creditsAtMs <= 0) return false
    return Date.now() - target.creditsAtMs < CREDITS_TTL_MS
  }

  /**
   * 拉取某账号的模型目录。
   *
   * 成功即覆盖并标记 live；失败保留上次成功结果，只记错误原因——面板要能
   * 同时看到「当前目录」与「为什么没更新」。
   */
  async refreshCatalog(account: string, variantId: string): Promise<UpstreamModel[]> {
    const target = this.accounts.find(a => a.account === account && a.variantId === variantId)
    if (target === undefined) throw new Error('账号不存在')
    try {
      const models = await fetchCatalog(toCredential(target))
      target.models = models
      target.modelsAtMs = Date.now()
      target.catalogSource = 'live'
      target.catalogError = ''
      await this.persist()
      return models
    } catch (error: unknown) {
      target.catalogError = String(error)
      await this.persist()
      throw error
    }
  }

  /** 拉取全部可用账号的目录，逐个容错。 */
  async refreshAllCatalogs(): Promise<{ ok: number; failed: number }> {
    let ok = 0
    let failed = 0
    for (const account of [...this.accounts]) {
      if (account.disabled) continue
      try {
        await this.refreshCatalog(account.account, account.variantId)
        ok += 1
      } catch {
        failed += 1
      }
    }
    return { ok, failed }
  }

  /** 全部可用账号的模型并集，按 id 去重。 */
  allModels(): UpstreamModel[] {
    const seen = new Map<string, UpstreamModel>()
    for (const account of this.accounts) {
      if (account.disabled) continue
      for (const model of account.models) {
        if (!seen.has(model.id)) seen.set(model.id, model)
      }
    }
    return [...seen.values()]
  }

  /**
   * 某一变体的模型并集。
   *
   * 国内版与国际版的同名模型走不同上游，模型表必须按版本分开，否则选择器会把
   * 两区的同名模型混成一个，请求就可能发到错误区域。
   *
   * @param variantId - 变体 id。
   * @returns 该变体下所有账号目录的并集。
   */
  modelsFor(variantId: string): UpstreamModel[] {
    const seen = new Map<string, UpstreamModel>()
    for (const account of this.accounts) {
      if (account.disabled || account.variantId !== variantId) continue
      for (const model of account.models) {
        if (!seen.has(model.id)) seen.set(model.id, model)
      }
    }
    return [...seen.values()]
  }

  /**
   * 批量刷新全部账号的积分。
   *
   * @param options - `force` 为真时忽略缓存；`variantId` 限定版本。
   * @returns 成功与失败的账号数。
   */
  async refreshAllCredits(options: { force?: boolean; variantId?: string } = {}): Promise<{ ok: number; failed: number }> {
    let ok = 0
    let failed = 0
    for (const account of [...this.accounts]) {
      if (account.disabled) continue
      if (options.variantId !== undefined && account.variantId !== options.variantId) continue
      try {
        await this.refreshCredits(account.account, account.variantId, options)
        ok += 1
      } catch {
        failed += 1
      }
    }
    return { ok, failed }
  }

  /** 写回磁盘。 */
  async persist(): Promise<void> {
    await persist(this.path, this.accounts)
  }
}

/** 按 id 找变体；找不到时抛错。 */
export function requireVariant(id: string): WorkBuddyVariant {
  const variant = WORKBUDDY_VARIANTS.find(v => v.id === id)
  if (variant === undefined) throw new Error(`未知变体：${id}`)
  return variant
}
