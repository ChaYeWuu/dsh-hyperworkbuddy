/**
 * WorkBuddy 桌面凭据的发现与解析。
 *
 * 两个变体共用同一个 `CodeBuddyExtension` 凭据目录，只差文件名。国内版的
 * `accessToken` 是明文；国际版自 5.6.x 起是 `$wbEncrypted` 信封，需要桌面端
 * 原生模块里的密钥才能解开——本模块只识别并如实报告，不做内存读取。
 *
 * @module dsh-hyperworkbuddy/auth
 */

import { readFile } from 'node:fs/promises'
import { homedir } from 'node:os'
import { join } from 'node:path'
import type { WorkBuddyVariant } from './variants.ts'

/** 一条可用的 WorkBuddy 凭据。 */
export interface WorkBuddyCredential {
  /** 所属变体 id。 */
  variantId: string
  /** 稳定账号标识，`uid:enterpriseId`。 */
  account: string
  /** 用户 id。 */
  uid: string
  /** 企业 id；个人账号为空串。 */
  enterpriseId: string
  /** 登录域，决定上游区域。 */
  domain: string
  /** 昵称，可能为空。 */
  nickname: string
  /** 上游 bearer token。 */
  accessToken: string
  /** 刷新用 token。 */
  refreshToken: string
  /** access token 到期时刻（毫秒）；未知为 0。 */
  expiresAtMs: number
  /** refresh token 到期时刻（毫秒）；未知为 0。 */
  refreshExpiresAtMs: number
}

/** 凭据读取结果：要么拿到凭据，要么带一条可展示的原因。 */
export type CredentialRead =
  | { ok: true; credential: WorkBuddyCredential }
  | { ok: false; reason: string }

/** 共享凭据目录名。 */
const AUTH_DIR_SEGMENTS = ['CodeBuddyExtension', 'Data', 'Public', 'auth'] as const

/**
 * 平台默认的凭据候选路径。
 *
 * Windows 先 Local 后 Roaming；macOS 走 Application Support；Linux 依
 * XDG_CONFIG_HOME / XDG_DATA_HOME，最后兜底 ~/.config 与 ~/.local/share。
 *
 * @param filename - 变体的凭据文件名。
 * @returns 按优先级排列的候选绝对路径。
 */
export function authFileCandidates(filename: string): string[] {
  const home = homedir()
  const out: string[] = []
  const push = (...segments: string[]): void => {
    const path = join(...segments)
    if (!out.includes(path)) out.push(path)
  }

  if (process.platform === 'win32') {
    const local = process.env['LOCALAPPDATA']
    const roaming = process.env['APPDATA']
    if (local !== undefined && local !== '') push(local, ...AUTH_DIR_SEGMENTS, filename)
    if (roaming !== undefined && roaming !== '') push(roaming, ...AUTH_DIR_SEGMENTS, filename)
    // 环境变量缺失时仍按默认布局兜一次。
    push(home, 'AppData', 'Local', ...AUTH_DIR_SEGMENTS, filename)
    push(home, 'AppData', 'Roaming', ...AUTH_DIR_SEGMENTS, filename)
    return out
  }

  if (process.platform === 'darwin') {
    push(home, 'Library', 'Application Support', ...AUTH_DIR_SEGMENTS, filename)
    return out
  }

  const configHome = process.env['XDG_CONFIG_HOME']
  const dataHome = process.env['XDG_DATA_HOME']
  if (configHome !== undefined && configHome !== '') push(configHome, ...AUTH_DIR_SEGMENTS, filename)
  if (dataHome !== undefined && dataHome !== '') push(dataHome, ...AUTH_DIR_SEGMENTS, filename)
  push(home, '.config', ...AUTH_DIR_SEGMENTS, filename)
  push(home, '.local', 'share', ...AUTH_DIR_SEGMENTS, filename)
  return out
}

/** 该变体凭据文件的首选路径（存在性未知）。 */
export function preferredAuthFile(variant: WorkBuddyVariant): string {
  const explicit = process.env[variant.env]
  if (explicit !== undefined && explicit.trim() !== '') return explicit.trim()
  const candidates = authFileCandidates(variant.desktopFilename)
  return candidates[0] ?? variant.desktopFilename
}

/** 变体凭据的全部候选路径，显式 env 优先。 */
export function authFilePaths(variant: WorkBuddyVariant): string[] {
  const explicit = process.env[variant.env]
  if (explicit !== undefined && explicit.trim() !== '') return [explicit.trim()]
  return authFileCandidates(variant.desktopFilename)
}

function asRecord(value: unknown): Record<string, unknown> | undefined {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? value as Record<string, unknown>
    : undefined
}

function asString(value: unknown): string | undefined {
  return typeof value === 'string' && value !== '' ? value : undefined
}

/** 是否为需要桌面端密钥的加密信封。 */
function isEncryptedEnvelope(value: unknown): boolean {
  const record = asRecord(value)
  return record !== undefined && record['$wbEncrypted'] === 1
}

/**
 * 从原始凭据文档解析出一条凭据。
 *
 * 接受 `{ auth, account }` 与扁平两种形态；`expiresAt` 小于 1e12 视为秒。
 *
 * @param document - 已解析的凭据 JSON。
 * @param variant - 该文档所属变体。
 * @returns 解析结果。
 */
export function parseCredentialDocument(document: unknown, variant: WorkBuddyVariant): CredentialRead {
  const root = asRecord(document)
  if (root === undefined) return { ok: false, reason: '凭据文件不是 JSON 对象' }

  const auth = asRecord(root['auth']) ?? root
  const account = asRecord(root['account']) ?? {}

  const rawToken = auth['accessToken']
  if (isEncryptedEnvelope(rawToken)) {
    return {
      ok: false,
      reason: `${variant.appName} 的凭据已加密（$wbEncrypted），需要桌面端密钥；请在面板中手动导入 accessToken`,
    }
  }
  const accessToken = asString(rawToken)
  if (accessToken === undefined) return { ok: false, reason: '凭据里没有可用的 accessToken' }

  const refreshToken = asString(auth['refreshToken']) ?? ''
  const uid = asString(account['uid']) ?? ''
  const enterpriseId = asString(account['enterpriseId']) ?? ''
  const domain = asString(auth['domain']) ?? ''

  return {
    ok: true,
    credential: {
      variantId: variant.id,
      account: `${uid}:${enterpriseId}`,
      uid,
      enterpriseId,
      domain,
      nickname: asString(account['nickname']) ?? '',
      accessToken,
      refreshToken,
      expiresAtMs: normalizeEpoch(auth['expiresAt']),
      refreshExpiresAtMs: normalizeEpoch(auth['refreshExpiresAt']),
    },
  }
}

/** 秒 / 毫秒两种 epoch 统一成毫秒；无法识别为 0。 */
export function normalizeEpoch(value: unknown): number {
  const numeric = typeof value === 'number' ? value : Number(value)
  if (!Number.isFinite(numeric) || numeric <= 0) return 0
  return numeric <= 1e12 ? numeric * 1000 : numeric
}

/**
 * 按候选顺序读取该变体的桌面凭据。
 *
 * 只有 ENOENT 才继续下一个候选；解析失败立即返回原因，避免把「文件在但坏了」
 * 掩盖成「没登录」。
 *
 * @param variant - 目标变体。
 * @returns 读取结果。
 */
export async function readDesktopCredential(variant: WorkBuddyVariant): Promise<CredentialRead> {
  const paths = authFilePaths(variant)
  let lastMissing = ''
  for (const path of paths) {
    let text: string
    try {
      text = await readFile(path, 'utf8')
    } catch (error: unknown) {
      const code = (error as NodeJS.ErrnoException).code
      if (code === 'ENOENT') {
        lastMissing = path
        continue
      }
      return { ok: false, reason: `读取凭据失败：${path}（${String(code ?? error)}）` }
    }
    let document: unknown
    try {
      document = JSON.parse(text)
    } catch {
      return { ok: false, reason: `凭据文件不是合法 JSON：${path}` }
    }
    return parseCredentialDocument(document, variant)
  }
  return {
    ok: false,
    reason: lastMissing === ''
      ? `${variant.appName} 凭据路径为空`
      : `未找到 ${variant.appName} 凭据文件：${lastMissing}`,
  }
}

/** token 是否在给定宽限期内到期。 */
export function isExpiringSoon(credential: WorkBuddyCredential, graceMs = 5 * 60 * 1000): boolean {
  if (credential.expiresAtMs <= 0) return false
  return Date.now() + graceMs >= credential.expiresAtMs
}
