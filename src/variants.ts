/**
 * 国内版 / 国际版两个 WorkBuddy 产品变体。
 *
 * 两个产品是同一套客户端框架的不同区域版本，登录信息写在同一个
 * `CodeBuddyExtension` 目录下，只差文件名、基地址与展示身份。
 *
 * @module dsh-hyperworkbuddy/variants
 */

/** 上游区域。 */
export type WorkBuddyRegion = 'cn' | 'global'

/** 一个 WorkBuddy 产品变体。 */
export interface WorkBuddyVariant {
  /** 本插件注册给 DSH 的 provider id，如 `hyperworkbuddy`。 */
  id: string
  /** 模型分组标题与面板标题，如 `WorkBuddy`。 */
  displayName: string
  /** 用户认识的桌面 App 名称，用于诊断与错误文案。 */
  appName: string
  /** 该变体凭据必须归属的上游区域。 */
  region: WorkBuddyRegion
  /** 覆盖桌面凭据文件位置的 env。 */
  env: string
  /** 共享凭据目录里桌面 App 自己的凭据文件名。 */
  desktopFilename: string
  /** 上游 chat 基地址。 */
  chatBase: string
  /** 上游计费基地址。 */
  billingBase: string
  /** 默认客户端版本，用于 User-Agent 兜底。 */
  defaultClientVersion: string
}

/** 国内版在前：它是长期默认项。 */
export const WORKBUDDY_VARIANTS: readonly WorkBuddyVariant[] = [
  {
    id: 'hyperworkbuddy',
    displayName: 'WorkBuddy',
    appName: 'WorkBuddy',
    region: 'cn',
    env: 'WORKBUDDY_AUTH_FILE',
    desktopFilename: 'workbuddy-desktop.info',
    chatBase: 'https://copilot.tencent.com',
    billingBase: 'https://www.codebuddy.cn',
    defaultClientVersion: '5.5.6',
  },
  {
    id: 'hyperworkbuddy-ai',
    displayName: 'WorkBuddy AI',
    appName: 'WorkBuddy AI',
    region: 'global',
    env: 'WORKBUDDY_AI_AUTH_FILE',
    desktopFilename: 'workbuddy-desktop-ai.info',
    chatBase: 'https://www.workbuddy.ai',
    billingBase: 'https://www.workbuddy.ai',
    defaultClientVersion: '5.5.2',
  },
]

/** 国内版变体。 */
export const CN_VARIANT = WORKBUDDY_VARIANTS[0]!

/** 国际版变体。 */
export const AI_VARIANT = WORKBUDDY_VARIANTS[1]!

/** 按 provider id 查变体。 */
export function variantFor(id: string): WorkBuddyVariant | undefined {
  return WORKBUDDY_VARIANTS.find(variant => variant.id === id)
}
