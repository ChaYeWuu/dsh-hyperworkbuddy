/**
 * 导入 workbuddy2api-hub 导出的账号文档。
 *
 * 兼容四种形态（与 hub 自己的 `_coerce_account_rows` 一致）：
 * 1. 完整导出文档 `{ format: "workbuddy-accounts", version, accounts: [...] }`
 * 2. 裸数组 `[{...}, {...}]`
 * 3. 单个账号对象 `{...}`
 * 4. 桌面 App 凭据 `{ auth: {...}, account: {...} }`
 *
 * 还接受 cockpit 那类 snake_case 行（`access_token` / `refresh_token` / `expires_at`）。
 *
 * 导入时**不信任**易变字段：别的机器上的冷却、错误、停用标记带过来只会把本地
 * 账号池弄坏，所以一律丢弃，只取凭据与身份。
 *
 * @module dsh-hyperworkbuddy/import
 */

import type { WorkBuddyCredential } from './auth.ts'
import { normalizeEpoch } from './auth.ts'
import { AI_VARIANT, CN_VARIANT, WORKBUDDY_VARIANTS, type WorkBuddyVariant } from './variants.ts'

/** 导入结果。 */
export interface ImportOutcome {
  /** 成功解析出的凭据。 */
  credentials: WorkBuddyCredential[]
  /** 被跳过的行及原因。 */
  skipped: { index: number; reason: string }[]
  /** 文档级错误；非空时 credentials 为空。 */
  error: string
}

/** 上游区域判定：域名为准，回落到 token 里的发行方。 */
function regionOf(domain: string, token: string): 'cn' | 'global' {
  const lowered = domain.trim().toLowerCase()
  if (lowered === 'workbuddy.ai' || lowered.endsWith('.workbuddy.ai')) return 'global'
  if (lowered === 'workbuddy.cn' || lowered.endsWith('.workbuddy.cn') || lowered.endsWith('codebuddy.cn')) return 'cn'
  // 域名缺失时看 JWT 的 iss / aud：国内走 copilot.tencent.com / codebuddy.cn，
  // 国际走 workbuddy.ai。
  const segments = token.split('.')
  if (segments.length === 3) {
    try {
      const payload = JSON.parse(Buffer.from(segments[1]!, 'base64url').toString('utf8')) as Record<string, unknown>
      const haystack = `${String(payload['iss'] ?? '')} ${String(payload['aud'] ?? '')} ${String(payload['domain'] ?? '')}`.toLowerCase()
      if (haystack.includes('workbuddy.ai') || haystack.includes('codebuddy.ai')) return 'global'
    } catch {
      // 解不开就按国内处理
    }
  }
  return 'cn'
}

/** 该区域对应的变体。 */
function variantOfRegion(region: 'cn' | 'global'): WorkBuddyVariant {
  return region === 'global' ? AI_VARIANT : CN_VARIANT
}

function asRecord(value: unknown): Record<string, unknown> | undefined {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? value as Record<string, unknown>
    : undefined
}

function asString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() !== '' ? value.trim() : undefined
}

/** 把任意被接受的容器归一成账号行数组。 */
function coerceRows(blob: unknown): { rows: Record<string, unknown>[]; error: string } {
  if (Array.isArray(blob)) {
    const rows = blob.map(asRecord).filter((r): r is Record<string, unknown> => r !== undefined)
    if (rows.length === 0) return { rows: [], error: '数组里没有可识别的账号对象' }
    return { rows, error: '' }
  }
  const record = asRecord(blob)
  if (record === undefined) return { rows: [], error: '期望一个对象或账号数组' }

  const accounts = record['accounts']
  if (Array.isArray(accounts)) {
    const rows = accounts.map(asRecord).filter((r): r is Record<string, unknown> => r !== undefined)
    if (rows.length === 0) return { rows: [], error: '导出文档的 accounts 为空' }
    return { rows, error: '' }
  }

  // 单个账号对象，或桌面 App 凭据。
  const looksLikeAccount = record['accessToken'] !== undefined
    || record['access_token'] !== undefined
    || asRecord(record['auth']) !== undefined
    || asRecord(record['account']) !== undefined
  if (!looksLikeAccount) {
    const keys = Object.keys(record).slice(0, 6).join(', ')
    return { rows: [], error: `不是账号文档（期望 accounts 数组、数组或单个账号对象；实际键：${keys || '无'}）` }
  }
  return { rows: [record], error: '' }
}

/**
 * 解析一份导出文档。
 *
 * @param raw - 原始 JSON 文本。
 * @returns 解析结果；逐行失败只记入 skipped，不影响其它行。
 */
export function parseHubExport(raw: string): ImportOutcome {
  const text = raw.trim()
  if (text === '') return { credentials: [], skipped: [], error: '内容为空' }

  let blob: unknown
  try {
    blob = JSON.parse(text)
  } catch {
    return { credentials: [], skipped: [], error: '不是合法 JSON' }
  }

  // 明确拒绝：不认识的 format 也要放行，因为裸数组与单账号没有 format。
  const doc = asRecord(blob)
  if (doc !== undefined) {
    const format = doc['format']
    if (typeof format === 'string' && format !== '' && format !== 'workbuddy-accounts') {
      return { credentials: [], skipped: [], error: `不支持的导出格式：${format}（期望 workbuddy-accounts）` }
    }
  }

  const { rows, error } = coerceRows(blob)
  if (error !== '') return { credentials: [], skipped: [], error }

  const credentials: WorkBuddyCredential[] = []
  const skipped: { index: number; reason: string }[] = []

  rows.forEach((row, index) => {
    const parsed = parseRow(row)
    if (typeof parsed === 'string') skipped.push({ index: index + 1, reason: parsed })
    else credentials.push(parsed)
  })

  if (credentials.length === 0 && skipped.length === 0) {
    return { credentials: [], skipped: [], error: '文档里没有账号' }
  }
  return { credentials, skipped, error: '' }
}

/** 从任意一层（扁平 / auth / account）取字段。 */
function pick(row: Record<string, unknown>, keys: string[]): string | undefined {
  const layers = [row, asRecord(row['auth']), asRecord(row['account'])]
    .filter((layer): layer is Record<string, unknown> => layer !== undefined)
  for (const key of keys) {
    for (const layer of layers) {
      const value = asString(layer[key])
      if (value !== undefined) return value
    }
  }
  return undefined
}

/** 解析一行；成功返回凭据，失败返回原因。 */
function parseRow(row: Record<string, unknown>): WorkBuddyCredential | string {
  // cockpit 那类 snake_case 行先映射到扁平形态。
  const normalized: Record<string, unknown> = row['access_token'] !== undefined && row['accessToken'] === undefined
    ? {
      uid: row['uid'],
      nickname: row['nickname'] ?? row['email'] ?? '',
      domain: row['domain'],
      accessToken: row['access_token'],
      refreshToken: row['refresh_token'],
      expiresAt: row['expires_at'],
      realm: row['realm'],
    }
    : row

  const accessToken = pick(normalized, ['accessToken', 'access_token'])
  if (accessToken === undefined) return '缺少 accessToken'
  if (accessToken.split('.').length !== 3) return 'accessToken 不是 JWT 形态'

  const refreshToken = pick(normalized, ['refreshToken', 'refresh_token']) ?? ''
  const uid = pick(normalized, ['uid']) ?? ''
  const enterpriseId = pick(normalized, ['enterpriseId', 'enterprise_id']) ?? ''
  const nickname = pick(normalized, ['nickname', 'email']) ?? ''
  const declared = pick(normalized, ['domain']) ?? ''

  // 区域以 token / 域名为准，而不是行里可能过期的 realm 字段。
  const region = regionOf(declared, accessToken)
  const variant = variantOfRegion(region)
  const domain = declared !== ''
    ? declared
    : region === 'global' ? 'www.workbuddy.ai' : 'www.workbuddy.cn'

  return {
    variantId: variant.id,
    account: `${uid}:${enterpriseId}`,
    uid,
    enterpriseId,
    domain,
    nickname,
    accessToken,
    refreshToken,
    expiresAtMs: normalizeEpoch(normalized['expiresAt'] ?? normalized['expires_at']),
    refreshExpiresAtMs: normalizeEpoch(normalized['refreshExpiresAt']),
  }
}

/** 该凭据所属变体（导入后拉目录时用）。 */
export function variantForCredential(credential: WorkBuddyCredential): WorkBuddyVariant | undefined {
  return WORKBUDDY_VARIANTS.find(variant => variant.id === credential.variantId)
}
