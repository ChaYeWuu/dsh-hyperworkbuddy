/**
 * 浏览器半边：设置面板里的 WorkBuddy 一级菜单。
 *
 * 关键点是注册进 `settings.section` 槽——设置对话框左侧导航直接遍历该槽的
 * 注册项渲染，所以这里出现的就是「设置里的一级选项」，不需要进入「插件」页。
 *
 * @module dsh-hyperworkbuddy/client
 */

import type { Context as ClientContext } from '@deepseek-ai/cordis'
import * as React from 'react'

/** 稳定浏览器插件名。 */
export const name = 'dsh-hyperworkbuddy-client'

/** 本包名。 */
export const BUNDLE_NAME = 'dsh-hyperworkbuddy'

/** 需要注入的客户端服务。 */
export const inject = ['slots', 'locale']

/** 管理路由前缀，与 host 半边保持一致。 */
const ROUTE_PREFIX = '/api-hyperworkbuddy'

/** 文案字典。 */
const zh = {
  nav: 'WorkBuddy',
  title: 'WorkBuddy 多账号',
  subtitle: '管理国内版与国际版账号池，并把模型接进 DSH。',

  endpointSection: 'OpenAI 兼容端点',
  endpointSwitch: '对外提供 OpenAI 兼容端点',
  endpointSwitchHint: '关闭只影响外部客户端（Codex / Claude Code 等）：端点停止监听并释放端口。DSH 里的 WorkBuddy 模型照常可用，不受影响。',
  endpointOn: '对外已开启',
  endpointOff: '对外已关闭',
  endpointBindFailed: '对外端点未启动',
  externalOnly: '仅外部客户端',
  copy: '复制',
  copied: '已复制',
  apiKey: 'API Key',
  apiKeyHint: '外部客户端填这个 Key；DSH 自身不需要。',
  apiKeyRefresh: '重新生成',
  apiKeyEdit: '自定义',
  apiKeySave: '保存',
  apiKeyCancel: '取消',
  apiKeyPlaceholder: '留空则随机生成',
  apiKeyFromConfig: '当前 Key 来自 profile 配置（apiKeys），请在配置里修改。',
  endpointHint: '把地址填进 Codex / Claude Code 等客户端的 Base URL。',

  refresh: '重新扫描并刷新',
  refreshVariant: '一键刷新',
  refreshDone: '已刷新 {ok} 个账号（失败 {failed}），积分 {credits} 个',
  refreshAllHint: '刷新该版本全部账号的模型与积分。',
  checkinAll: '一键签到',
  checkinDone: '签到完成：成功 {ok} / {total}',
  externalEndpoint: '对外端点',
  linkLogin: '链接登录',
  linkLoginHint: '在浏览器里完成授权即可自动加账号，无需手动复制 token。',
  linkLoginStart: '生成授权链接',
  linkLoginOpening: '正在生成…',
  linkLoginStep: '① 点下面的按钮在浏览器里打开授权页；② 完成登录后回到这里，插件会自动收取账号。',
  linkLoginOpen: '打开授权页',
  linkLoginOpenHint: '若浏览器没有自动打开，点下面的按钮。',
  linkLoginWaiting: '等待浏览器完成授权…',
  linkLoginOk: '已添加账号 {name}',
  linkLoginFailed: '登录未完成',
  addAccount: '导入单个账号',
  addHint: '粘贴 accessToken 可追加单个账号。',
  accountImport: '账号导入',
  thirdPartyImport: '第三方导入',
  thirdPartyHint: '从其它 WorkBuddy 管理面板迁移账号。',
  importHub: 'WorkBuddy2API-Hub 导入',
  importHubHint: '粘贴 WorkBuddy2API-Hub 的导出文档；也接受账号数组、单个账号对象与桌面客户端凭据，可一次导入多个账号。',
  importHubPlaceholder: '{ "format": "workbuddy-accounts", "accounts": [ … ] }',
  doImport: '导入',
  importOk: '已导入 {n} 个账号',
  importSkipped: '，跳过 {n} 个',
  variant: '版本',
  accessToken: 'accessToken',
  uid: 'uid（可选）',
  enterpriseId: 'enterpriseId（可选）',
  nickname: '备注名（可选）',
  cancel: '取消',

  expand: '展开',
  collapse: '收起',
  accounts: '账号',
  accountsEmpty: '该版本还没有账号。登录对应桌面 App，或在下方导入。',
  remove: '移除',
  enable: '启用',
  disable: '停用',
  refreshCredits: '刷新积分',
  refreshCatalog: '刷新模型',
  sourceDesktop: '桌面 App',
  sourceManual: '导入',
  statusReady: '可用',
  statusDisabled: '已停用',
  statusCooling: '冷却中',
  statusExpired: '凭据过期',
  credits: '积分',
  creditsUnknown: '未获取',
  creditsAt: '更新于',
  creditsCached: '（缓存）',
  packages: '套餐明细',
  packagesNone: '没有可用套餐',
  expiresAt: '到期',
  lastError: '最近错误',
  working: '处理中',

  modelsSection: '模型开关',
  modelsHint: '关掉的模型不会出现在 DSH 的模型选择器里；已经在用该模型的会话不受影响。',
  showAll: '全部开启',
  hideAll: '全部关闭',
  noModels: '还没有模型。先点上面的「重新扫描并刷新」。',
  gone: '上游已下架',
  reasoning: '推理档位',
  reasoningDefault: '默认',
  reasoningProbed: '探测得出',
  reasoningProbe: '探测档位',
  reasoningProbing: '探测中',
  reasoningNone: '未声明',
  reasoningProbeHint: '上游未声明档位时可手动探测：逐个档位发一条最小请求，只采纳上游接受的档位。会消耗少量额度。',
  modelContext: '上下文',
  modelMaxOutput: '最大输出',
  modelContextTiers: '多档',
  contextWindowUseMax: '使用上游声明的最大窗口',
  contextWindowHint: '上游为部分模型声明了多档窗口：默认档与更大档。开启后按最大档上报给 DSH，只影响声明了更大档位的模型。',
  contextWindowEffect: '改动对下一条请求生效；正在进行的对话会在下次发送时才更新显示。',
  contextWindowRefreshed: '已刷新 {ok} 个账号的模型目录（失败 {failed} 个）',
  contextWindowNoTiers: '已开启，但当前目录里没有声明更大档位的模型',

  usageSection: '用量',
  usageToday: '今日',
  usageAll: '累计',
  usageRequests: '请求',
  usageErrors: '失败',
  usagePrompt: '输入',
  usageCompletion: '输出',
  usageCacheRate: '缓存命中率',
  usageDaily: '近 7 天',
  usageByAccount: '今日分账号',
  usageByModel: '今日分模型',
  usageEmpty: '还没有请求记录。',
  usageClear: '清空记录',
  usageClearConfirm: '确认清空',
  usageClearDone: '用量记录已清空',
  usageHint: '统计来自本插件的两个回环端点（DSH 自身与外部客户端），只记在本机。',

  loading: '加载中…',
  loadFailed: '加载失败',
  retry: '重试',
  regionCn: '国内版',
  regionGlobal: '国际版',
}

const en: typeof zh = {
  nav: 'WorkBuddy',
  title: 'WorkBuddy Accounts',
  subtitle: 'Manage the CN and international account pools and bring their models into DSH.',

  endpointSection: 'OpenAI-compatible endpoint',
  endpointSwitch: 'Serve the OpenAI-compatible endpoint',
  endpointSwitchHint: 'Turning this off only affects external clients (Codex / Claude Code): the listener stops and the port is released. The WorkBuddy models inside DSH keep working.',
  endpointOn: 'Serving',
  endpointOff: 'Not serving',
  endpointBindFailed: 'External endpoint not running',
  externalOnly: 'external clients only',
  copy: 'Copy',
  copied: 'Copied',
  apiKey: 'API Key',
  apiKeyHint: 'Use this key in external clients; DSH itself does not need it.',
  apiKeyRefresh: 'Regenerate',
  apiKeyEdit: 'Custom',
  apiKeySave: 'Save',
  apiKeyCancel: 'Cancel',
  apiKeyPlaceholder: 'Leave blank to generate one',
  apiKeyFromConfig: 'This key comes from the profile config (apiKeys); edit it there.',
  endpointHint: 'Use this as the Base URL in Codex / Claude Code and other clients.',

  refresh: 'Rescan and refresh',
  refreshVariant: 'Refresh all',
  refreshDone: 'Refreshed {ok} account(s) ({failed} failed), {credits} with credits',
  refreshAllHint: 'Refresh models and credits for every account in this variant.',
  checkinAll: 'Daily check-in',
  checkinDone: 'Check-in: {ok} / {total} succeeded',
  externalEndpoint: 'External endpoint',
  linkLogin: 'Sign in via link',
  linkLoginHint: 'Authorise in your browser and the account is added automatically — no token copying.',
  linkLoginStart: 'Generate authorisation link',
  linkLoginOpening: 'Generating…',
  linkLoginStep: '① Open the authorisation page below in your browser; ② come back here once signed in — the plugin collects the account automatically.',
  linkLoginOpen: 'Open authorisation page',
  linkLoginOpenHint: 'If the browser did not open automatically, use the button below.',
  linkLoginWaiting: 'Waiting for the browser to finish…',
  linkLoginOk: 'Added account {name}',
  linkLoginFailed: 'Sign-in did not complete',
  addAccount: 'Import one account',
  addHint: 'Paste an accessToken to add a single account.',
  accountImport: 'Account import',
  thirdPartyImport: 'Third-party import',
  thirdPartyHint: 'Migrate accounts from another WorkBuddy management panel.',
  importHub: 'WorkBuddy2API-Hub import',
  importHubHint: 'Paste a WorkBuddy2API-Hub export document; account arrays, single account objects and desktop credentials are also accepted.',
  importHubPlaceholder: '{ "format": "workbuddy-accounts", "accounts": [ … ] }',
  doImport: 'Import',
  importOk: 'Imported {n} account(s)',
  importSkipped: ', skipped {n}',
  variant: 'Variant',
  accessToken: 'accessToken',
  uid: 'uid (optional)',
  enterpriseId: 'enterpriseId (optional)',
  nickname: 'Label (optional)',
  cancel: 'Cancel',

  expand: 'Expand',
  collapse: 'Collapse',
  accounts: 'Accounts',
  accountsEmpty: 'No accounts for this variant yet. Sign in to its desktop app, or import below.',
  remove: 'Remove',
  enable: 'Enable',
  disable: 'Disable',
  refreshCredits: 'Refresh credits',
  refreshCatalog: 'Refresh models',
  sourceDesktop: 'Desktop app',
  sourceManual: 'Imported',
  statusReady: 'Ready',
  statusDisabled: 'Disabled',
  statusCooling: 'Cooling down',
  statusExpired: 'Expired',
  credits: 'Credits',
  creditsUnknown: 'not fetched',
  creditsAt: 'updated',
  creditsCached: ' (cached)',
  packages: 'Packages',
  packagesNone: 'no usable package',
  expiresAt: 'Expires',
  lastError: 'Last error',
  working: 'Working',

  modelsSection: 'Model switches',
  modelsHint: 'A switched-off model disappears from the DSH picker; sessions already using it are unaffected.',
  showAll: 'Enable all',
  hideAll: 'Disable all',
  noModels: 'No models yet. Press "Rescan and refresh" above.',
  gone: 'no longer served',
  reasoning: 'Reasoning levels',
  reasoningDefault: 'default',
  reasoningProbed: 'probed',
  reasoningProbe: 'Probe levels',
  reasoningProbing: 'Probing',
  reasoningNone: 'not declared',
  reasoningProbeHint: 'When the upstream declares no levels, probe them: one minimal request per level, keeping only the accepted ones. Consumes a little credit.',
  modelContext: 'Context',
  modelMaxOutput: 'Max output',
  modelContextTiers: 'multi-tier',
  contextWindowUseMax: 'Use the largest window the upstream declares',
  contextWindowHint: 'The upstream declares several window tiers for some models: a default tier and larger ones. When on, the largest tier is reported to DSH; models without a larger tier are unaffected.',
  contextWindowEffect: 'The change applies to the next request; an ongoing conversation updates its display on the next send.',
  contextWindowRefreshed: 'Refreshed the model catalog of {ok} account(s) ({failed} failed)',
  contextWindowNoTiers: 'Enabled, but the current catalog declares no larger tier',

  usageSection: 'Usage',
  usageToday: 'Today',
  usageAll: 'All time',
  usageRequests: 'Requests',
  usageErrors: 'Failed',
  usagePrompt: 'Input',
  usageCompletion: 'Output',
  usageCacheRate: 'Cache hit rate',
  usageDaily: 'Last 7 days',
  usageByAccount: 'Today by account',
  usageByModel: 'Today by model',
  usageEmpty: 'No requests recorded yet.',
  usageClear: 'Clear',
  usageClearConfirm: 'Confirm clear',
  usageClearDone: 'Usage records cleared',
  usageHint: 'Counted from this plugin\u2019s two loopback endpoints (DSH itself and external clients), stored on this machine only.',

  loading: 'Loading…',
  loadFailed: 'Failed to load',
  retry: 'Retry',
  regionCn: 'CN',
  regionGlobal: 'International',
}

/** 面板模型条目。 */
interface PanelModel {
  id: string
  name: string
  /** 当前开关下实际生效的窗口。 */
  contextWindow: number
  /** 上游自己挑的默认档位。 */
  declaredContextWindow: number
  /** 上游声明的全部窗口档位；空数组表示没有档位可选。 */
  supportedContextWindows: number[]
  maxTokens: number
  credits?: string
  free: boolean
  visible: boolean
  available: boolean
  /** 上游声明的推理档位；空数组表示该模型没有档位控件。 */
  efforts: string[]
  defaultEffort: string
  /** 档位来源：上游声明、本地探测，或都没有。 */
  effortsSource: 'declared' | 'probed' | 'none'
}

/** 面板账号条目。 */
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

/** 面板版本分区。 */
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
  providerRegistered: boolean
  providerError: string
  accounts: PanelAccount[]
  models: PanelModel[]
  hiddenCount: number
  desktopError: string
}

/** 一组累计值。 */
interface PanelTotals {
  requests: number
  errors: number
  promptTokens: number
  completionTokens: number
  cachedTokens: number
  totalTokens: number
}

/** 面板用量汇总，与 host 的 `UsageSummary` 一一对应。 */
interface PanelUsage {
  all: PanelTotals
  today: PanelTotals
  cacheHitRate?: number
  byAccount: { account: string; variantId: string; totals: PanelTotals }[]
  byModel: { model: string; totals: PanelTotals }[]
  daily: { day: string; totals: PanelTotals }[]
}

/** 面板状态文档。 */
interface PanelDocument {
  ok: true
  endpointEnabled: boolean
  apiKey: string
  apiKeysConfigured: boolean
  variants: PanelVariant[]
  usage: PanelUsage
  importResult?: { imported: number; skipped: { index: number; reason: string }[]; error: string }
}

/** 面板组件收到的注入面。 */
interface PanelInjected {
  t: (key: keyof typeof zh, vars?: Record<string, string | number>) => string
}

/** 拉取状态文档。 */
async function fetchStatus(): Promise<PanelDocument> {
  const response = await fetch(`${ROUTE_PREFIX}/status`, { headers: { 'Accept': 'application/json' } })
  if (!response.ok) throw new Error(`HTTP ${response.status}`)
  return await response.json() as PanelDocument
}

/**
 * 调用一个返回新状态文档的管理接口。
 *
 * 返回的是**完整响应**，不只是 document：很多接口会在顶层带自己的回执行段
 * （`catalogsOk`、`results`、`authUrl`、`accepted` …）。只取 document 会让
 * 这些字段无声变成 undefined，界面上就会渲染出「undefined 个账号」这类文案。
 *
 * @param path - 相对 `ROUTE_PREFIX` 的路径。
 * @param body - 请求体。
 * @returns 完整响应，含可选的 `document`。
 */
async function postPayload(path: string, body: unknown): Promise<Record<string, unknown> & { document?: PanelDocument }> {
  const response = await fetch(`${ROUTE_PREFIX}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  const payload = await response.json() as Record<string, unknown>
  if (!response.ok && payload['document'] === undefined) {
    throw new Error(typeof payload['error'] === 'string' ? payload['error'] : `HTTP ${response.status}`)
  }
  return payload
}

/** 调用管理接口并只取新状态文档；回执字段请改用 postPayload。 */
async function postDocument(path: string, body: unknown): Promise<PanelDocument> {
  const payload = await postPayload(path, body)
  if (payload.document !== undefined) return payload.document
  throw new Error(typeof payload['error'] === 'string' ? payload['error'] : '响应缺少 document')
}

/** 从响应里读一个数字字段，缺失按 0 处理。 */
function numField(payload: Record<string, unknown>, key: string): number {
  const value = payload[key]
  return typeof value === 'number' && Number.isFinite(value) ? value : 0
}

/** 在默认浏览器里打开一个外部链接。 */
function openExternal(url: string): void {
  try {
    window.open(url, '_blank', 'noopener,noreferrer')
  } catch {
    // 弹窗被拦截时用户仍可用下面的按钮或手动复制地址
  }
}

/** 格式化时间。 */
function formatTime(ms: number): string {
  if (!Number.isFinite(ms) || ms <= 0) return '—'
  const date = new Date(ms)
  const pad = (n: number): string => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`
}

/**
 * 读模型的窗口档位。
 *
 * host 可能仍在用旧缓存回包（升级前的账号文件没有这个字段），
 * 直接取 `.length` 会让整块面板渲染失败，所以统一从这里读。
 */
function contextTiers(model: PanelModel): number[] {
  return Array.isArray(model.supportedContextWindows) ? model.supportedContextWindows : []
}

/** 格式化剩余时长。 */function formatDuration(ms: number): string {
  if (ms <= 0) return '0s'
  const seconds = Math.ceil(ms / 1000)
  if (seconds < 60) return `${seconds}s`
  const minutes = Math.ceil(seconds / 60)
  if (minutes < 60) return `${minutes}m`
  return `${Math.ceil(minutes / 60)}h`
}

/** 把 token 数压成人一眼能比的大小。 */
function formatTokens(n: number): string {
  if (!Number.isFinite(n) || n <= 0) return '0'
  if (n < 1000) return String(n)
  if (n < 1_000_000) return `${(n / 1000).toFixed(n < 10_000 ? 1 : 0)}k`
  return `${(n / 1_000_000).toFixed(2)}M`
}

const S = {
  root: { display: 'flex', flexDirection: 'column', gap: '18px', padding: '4px 0 24px', fontSize: '13px' },
  h1: { fontSize: '16px', fontWeight: 600, margin: 0 },
  sub: { color: 'var(--dsw-alias-label-secondary, #888)', margin: '4px 0 0', fontSize: '12px' },
  card: { border: '1px solid var(--dsw-alias-border-l2, #3333)', borderRadius: '10px', padding: '14px 16px' },
  cardTitle: { fontSize: '13px', fontWeight: 600, margin: '0 0 10px', display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' as const },
  row: { display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' as const },
  mono: { fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace', fontSize: '12px' },
  btn: {
    border: '1px solid var(--dsw-alias-border-l2, #3333)', background: 'transparent', color: 'inherit',
    borderRadius: '6px', padding: '4px 10px', fontSize: '12px', cursor: 'pointer', fontFamily: 'inherit',
  },
  btnBusy: {
    border: '1px solid var(--dsw-alias-border-l2, #3333)', background: 'transparent',
    color: 'var(--dsw-alias-label-secondary, #888)', borderRadius: '6px', padding: '4px 10px',
    fontSize: '12px', cursor: 'progress', fontFamily: 'inherit',
  },
  btnPrimary: {
    border: '1px solid var(--dsw-alias-brand-primary-new-colorprimary-new-color, #4a7dff)',
    background: 'var(--dsw-alias-brand-primary-new-colorprimary-new-color, #4a7dff)', color: '#fff',
    borderRadius: '6px', padding: '4px 12px', fontSize: '12px', cursor: 'pointer', fontFamily: 'inherit',
  },
  input: {
    border: '1px solid var(--dsw-alias-border-l2, #3333)', background: 'transparent', color: 'inherit',
    borderRadius: '6px', padding: '5px 8px', fontSize: '12px', fontFamily: 'inherit', width: '100%', boxSizing: 'border-box' as const,
  },
  badge: { borderRadius: '4px', padding: '1px 6px', fontSize: '11px', border: '1px solid var(--dsw-alias-border-l2, #3333)', whiteSpace: 'nowrap' as const },
  badgeOk: { background: 'rgba(60,180,110,.15)', borderColor: 'rgba(60,180,110,.4)' },
  badgeWarn: { background: 'rgba(230,160,40,.15)', borderColor: 'rgba(230,160,40,.4)' },
  badgeOff: { background: 'rgba(140,140,140,.15)', borderColor: 'rgba(140,140,140,.4)' },
  badgeInfo: { background: 'rgba(90,140,240,.15)', borderColor: 'rgba(90,140,240,.4)' },
  accountRow: { border: '1px solid var(--dsw-alias-border-l2, #3333)', borderRadius: '8px', padding: '10px 12px', marginBottom: '8px' },
  muted: { color: 'var(--dsw-alias-label-secondary, #888)', fontSize: '12px' },
  error: { color: '#e05a5a', fontSize: '12px', wordBreak: 'break-all' as const },
  variantHead: {
    display: 'flex', alignItems: 'center', gap: '8px', paddingBottom: '8px', marginBottom: '10px',
    borderBottom: '1px solid var(--dsw-alias-border-l2, #3333)',
  },
  modelGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '6px' },
  modelCell: {
    display: 'flex', alignItems: 'center', gap: '8px', border: '1px solid var(--dsw-alias-border-l2, #3333)',
    borderRadius: '6px', padding: '6px 8px', fontSize: '12px',
  },
  switchRow: { display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', userSelect: 'none' as const },
  // 全局进行中提示条：任何操作在跑都可见
  progress: {
    display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px',
    color: 'var(--dsw-alias-label-secondary, #888)',
    border: '1px solid var(--dsw-alias-border-l2, #3333)', borderRadius: '8px', padding: '6px 10px',
  },
  caret: { fontSize: '11px', width: '12px', display: 'inline-block', textAlign: 'center' as const },
  pkgRow: { display: 'flex', justifyContent: 'space-between', gap: '12px', fontSize: '12px', padding: '1px 0' },
  statGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: '8px' },
  statCell: { border: '1px solid var(--dsw-alias-border-l2, #3333)', borderRadius: '8px', padding: '8px 10px' },
  statLabel: { color: 'var(--dsw-alias-label-secondary, #888)', fontSize: '11px' },
  statValue: { fontSize: '15px', fontWeight: 600, marginTop: '2px' },
  barTrack: { display: 'flex', alignItems: 'flex-end', gap: '4px', height: '52px', marginTop: '8px' },
  barColumn: { flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', height: '100%', justifyContent: 'flex-end' },
  bar: {
    width: '100%', background: 'var(--dsw-alias-brand-primary-new-colorprimary-new-color, #4a7dff)',
    borderRadius: '3px 3px 0 0', opacity: 0.65, minHeight: '2px',
  },
  usageTable: { width: '100%', borderCollapse: 'collapse' as const, fontSize: '12px', marginTop: '6px' },
  usageTh: {
    textAlign: 'left' as const, color: 'var(--dsw-alias-label-secondary, #888)', fontWeight: 500,
    fontSize: '11px', padding: '2px 8px 2px 0',
  },
  usageTd: { padding: '2px 8px 2px 0', whiteSpace: 'nowrap' as const },
}

/**
 * 挂载面板。
 *
 * @param ctx - 浏览器插件上下文。
 */
export function apply(ctx: ClientContext): void {
  const namespace = 'settings.hyperworkbuddy'
  ctx.effect(() => ctx.locale.register(namespace, { zh, en }), 'dsh-hyperworkbuddy: copy')
  const rawT = ctx.locale.bind(namespace) as unknown as (key: keyof typeof zh) => string
  // 支持 {n} 占位符，用于「已导入 N 个」这类回执。
  const t = (key: keyof typeof zh, vars?: Record<string, string | number>): string => {
    let text = rawT(key)
    if (vars !== undefined) {
      for (const [name, value] of Object.entries(vars)) text = text.replace(`{${name}}`, String(value))
    }
    return text
  }

  try {
    ctx.slots.inject('settings.section', () => ctx.slots.register({
      name: 'settings.section',
      id: 'hyperworkbuddy',
      order: 55,
      label: () => rawT('nav'),
      inject: (): PanelInjected => ({ t }),
    }, HyperWorkBuddyPanel as never) ?? (() => {}))
  } catch (error: unknown) {
    console.error('[dsh-hyperworkbuddy] settings.section 注册失败', error)
  }
}

/**
 * WorkBuddy 一级设置页。
 *
 * @param props - 槽位注入面。
 * @returns 面板元素树。
 */
function HyperWorkBuddyPanel(props: PanelInjected): unknown {
  const { t } = props
  const { useCallback, useEffect, useState } = React
  const h = React.createElement

  const [doc, setDoc] = useState<PanelDocument | undefined>(undefined)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState('')
  const [copied, setCopied] = useState('')
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({})
  const [openPkgs, setOpenPkgs] = useState<Record<string, boolean>>({})
  const [openForm, setOpenForm] = useState<'' | 'single' | 'hub' | 'login'>('')
  /** 进行中的链接登录：state 与要打开的授权页。 */
  const [login, setLogin] = useState<{ variantId: string; state: string; authUrl: string; message: string } | undefined>(undefined)
  /** API Key 自定义编辑态：null 表示未展开。 */
  const [keyDraft, setKeyDraft] = useState<string | null>(null)
  const [form, setForm] = useState({ variantId: '', accessToken: '', uid: '', enterpriseId: '', nickname: '' })
  const [hubText, setHubText] = useState('')
  const [notice, setNotice] = useState('')
  /** 用量「清空记录」的二次确认态。 */
  const [clearArmed, setClearArmed] = useState(false)

  const load = useCallback(async () => {
    try {
      setDoc(await fetchStatus())
      setError('')
    } catch (err: unknown) {
      setError(String(err))
    }
  }, [])

  useEffect(() => { void load() }, [load])

  /** 执行管理动作并替换状态文档。 */
  const run = useCallback(async (key: string, path: string, body: unknown) => {
    setBusy(key)
    try {
      setDoc(await postDocument(path, body))
      setError('')
    } catch (err: unknown) {
      setError(String(err))
    } finally {
      setBusy('')
    }
  }, [])

  const copyText = useCallback(async (key: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(key)
      setTimeout(() => setCopied(''), 1500)
    } catch {
      // 剪贴板不可用时用户仍可手动选中
    }
  }, [])

  if (error !== '' && doc === undefined) {
    return h('div', { style: S.root },
      h('div', { style: S.error }, `${t('loadFailed')}: ${error}`),
      h('button', { style: S.btn, onClick: () => void load() }, t('retry')),
    )
  }
  if (doc === undefined) return h('div', { style: S.root }, h('div', { style: S.muted }, t('loading')))

  const busyAny = busy !== ''
  /** 按钮：命中当前 busy key 时显示进行中文案并禁用。 */
  const actionButton = (key: string, label: string, onClick: () => void, busyLabel?: string): unknown => {
    const isBusy = busy === key
    return h('button', {
      style: isBusy ? S.btnBusy : S.btn,
      disabled: busyAny,
      onClick,
    }, isBusy ? `${busyLabel ?? label} …` : label)
  }

  /** 一个账号卡片。 */
  const accountCard = (account: PanelAccount): unknown => {
    const statusLabel = account.disabled
      ? t('statusDisabled')
      : account.expired
        ? t('statusExpired')
        : account.cooling ? `${t('statusCooling')} ${formatDuration(account.cooldownRemainingMs)}` : t('statusReady')
    const statusStyle = account.disabled
      ? { ...S.badge, ...S.badgeOff }
      : account.expired || account.cooling ? { ...S.badge, ...S.badgeWarn } : { ...S.badge, ...S.badgeOk }
    const key = `${account.variantId}|${account.account}`

    // 积分：只展示余量 > 0 的套餐，否则 60 多条里绝大多数是 0，没意义。
    const credits = account.credits
    const creditsText = credits === undefined
      ? t('creditsUnknown')
      : credits.remaining === undefined
        ? '—'
        : credits.total === undefined ? String(credits.remaining) : `${credits.remaining} / ${credits.total}`
    const useful = (credits?.packages ?? []).filter(pkg => (pkg.remain ?? 0) > 0)
    const pkgOpen = openPkgs[key] === true
    // 与 host 侧的 CREDITS_TTL_MS 保持一致：超过 10 分钟即视为陈旧。
    const creditsFresh = account.creditsAtMs > 0 && Date.now() - account.creditsAtMs < 10 * 60 * 1000

    return h('div', { style: S.accountRow, key },
      h('div', { style: { ...S.row, justifyContent: 'space-between' } },
        h('div', { style: S.row },
          h('span', { style: S.badge }, account.source === 'desktop' ? t('sourceDesktop') : t('sourceManual')),
          h('span', { style: statusStyle }, statusLabel),
          h('span', { style: { ...S.muted, ...S.mono } }, account.account),
        ),
        h('div', { style: S.row },
          actionButton(`credits:${key}`, t('refreshCredits'), () => {
            void run(`credits:${key}`, '/account/credits', { account: account.account, variantId: account.variantId })
          }, t('working')),
          actionButton(`catalog:${key}`, t('refreshCatalog'), () => {
            void run(`catalog:${key}`, '/account/catalog', { account: account.account, variantId: account.variantId })
          }, t('working')),
          actionButton(`toggle:${key}`, account.disabled ? t('enable') : t('disable'), () => {
            void run(`toggle:${key}`, '/account/toggle', {
              account: account.account, variantId: account.variantId, disabled: !account.disabled,
            })
          }),
          actionButton(`remove:${key}`, t('remove'), () => {
            void run(`remove:${key}`, '/account/remove', { account: account.account, variantId: account.variantId })
          }),
        ),
      ),
      h('div', { style: { ...S.row, marginTop: '6px', gap: '16px' } },
        h('span', { style: S.muted }, account.nickname === '' ? '—' : account.nickname),
        account.domain === '' ? null : h('span', { style: S.muted }, account.domain),
        h('span', { style: S.muted }, `${t('models')}: ${account.modelCount}`),
        h('span', { style: S.muted }, `${t('expiresAt')}: ${formatTime(account.expiresAtMs)}`),
      ),
      h('div', { style: { ...S.row, marginTop: '6px', gap: '10px' } },
        h('span', null, `${t('credits')}: `, h('strong', null, creditsText)),
        credits === undefined ? null : h('span', { style: S.muted },
          `${t('creditsAt')} ${formatTime(account.creditsAtMs)}`,
          creditsFresh ? null : t('creditsCached'),
        ),
        useful.length === 0 ? null : h('button', {
          style: S.btn,
          onClick: () => setOpenPkgs(prev => ({ ...prev, [key]: !pkgOpen })),
        }, `${t('packages')}（${useful.length}）${pkgOpen ? ' ▾' : ' ▸'}`),
      ),
      pkgOpen
        ? h('div', { style: { marginTop: '6px', paddingLeft: '8px' } },
          useful.length === 0
            ? h('div', { style: S.muted }, t('packagesNone'))
            : useful.map((pkg, index) => h('div', { key: `${pkg.name}-${index}`, style: S.pkgRow },
              h('span', { style: { overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' } }, pkg.name),
              h('span', { style: S.muted }, `${pkg.remain ?? 0}${pkg.size === undefined ? '' : ` / ${pkg.size}`}`),
            )),
        )
        : null,
      account.lastError === '' ? null : h('div', { style: { ...S.error, marginTop: '4px' } }, `${t('lastError')}: ${account.lastError}`),
      account.catalogError === '' ? null : h('div', { style: { ...S.error, marginTop: '4px' } }, account.catalogError),
    )
  }

  /** 一个版本分区（可折叠）。 */
  const variantSection = (variant: PanelVariant): unknown => {
    const regionLabel = variant.region === 'cn' ? t('regionCn') : t('regionGlobal')
    const allVisible = variant.models.length > 0 && variant.models.every(m => m.visible)
    const isCollapsed = collapsed[variant.id] === true
    const visibleCount = variant.models.filter(m => m.visible).length

    return h('div', { style: S.card, key: variant.id },
      // 头部固定两行：第一行是身份与操作，第二行是端点地址。
      // 之前把端点地址塞进同一行，勾上对外开关后地址一出现就把操作挤到第二行，
      // 折叠按钮和状态徽章跟着换行，看起来像布局坏了。
      h('div', { style: { borderBottom: isCollapsed ? 'none' : S.variantHead.borderBottom, paddingBottom: isCollapsed ? 0 : '8px', marginBottom: isCollapsed ? 0 : '10px' } },
        h('div', { style: { ...S.row, justifyContent: 'space-between' } },
          h('div', { style: { ...S.row, minWidth: 0 } },
            h('button', {
              style: { ...S.btn, padding: '2px 8px' },
              onClick: () => setCollapsed(prev => ({ ...prev, [variant.id]: !isCollapsed })),
              title: isCollapsed ? t('expand') : t('collapse'),
            }, `${isCollapsed ? '▸' : '▾'} ${isCollapsed ? t('expand') : t('collapse')}`),
            h('strong', { style: { whiteSpace: 'nowrap' } }, variant.displayName),
            h('span', { style: S.badge }, regionLabel),
            h('span', {
              style: variant.providerRegistered ? { ...S.badge, ...S.badgeOk } : { ...S.badge, ...S.badgeWarn },
            }, variant.providerRegistered ? 'DSH 可用' : 'DSH 未就绪'),
            h('span', { style: { ...S.muted, whiteSpace: 'nowrap' } }, `${variant.accounts.length} 账号 · ${visibleCount}/${variant.models.length} 模型`),
          ),
          // 一键操作：刷新本版本全部账号（目录 + 积分），国内版另有签到
          h('div', { style: { ...S.row, flexShrink: 0 } },
            variant.hasCheckin
              ? actionButton(`checkin:${variant.id}`, t('checkinAll'), () => {
                setNotice('')
                setBusy(`checkin:${variant.id}`)
                void (async () => {
                  try {
                    // 用 postPayload：results 是接口自己的字段，postDocument 只取
                    // document，会把回执丢掉，界面上就会显示 undefined。
                    const raw = await postPayload('/variant/checkin', { variantId: variant.id })
                    if (raw.document !== undefined) setDoc(raw.document)
                    const results = Array.isArray(raw['results'])
                      ? (raw['results'] as { ok: boolean }[])
                      : []
                    const okCount = results.filter(r => r.ok).length
                    const failure = typeof raw['error'] === 'string' ? raw['error'] : ''
                    setNotice(failure !== ''
                      ? failure
                      : t('checkinDone', { ok: okCount, total: results.length }))
                    setError('')
                  } catch (err: unknown) { setError(String(err)) } finally { setBusy('') }
                })()
              }, t('working'))
              : null,
            actionButton(`refreshVariant:${variant.id}`, t('refreshVariant'), () => {
              setNotice('')
              setBusy(`refreshVariant:${variant.id}`)
              void (async () => {
                try {
                  const raw = await postPayload('/variant/refresh', { variantId: variant.id })
                  if (raw.document !== undefined) setDoc(raw.document)
                  setNotice(t('refreshDone', {
                    ok: numField(raw, 'catalogsOk'),
                    failed: numField(raw, 'catalogsFailed'),
                    credits: numField(raw, 'creditsOk'),
                  }))
                  setError('')
                } catch (err: unknown) { setError(String(err)) } finally { setBusy('') }
              })()
            }, t('working')),
          ),
        ),
        // 第二行：对外端点地址（未启用时给出提示）
        isCollapsed ? null : h('div', { style: { ...S.row, marginTop: '6px' } },
          h('span', { style: S.muted }, t('externalEndpoint')),
          variant.baseUrl === ''
            ? h('span', { style: { ...S.badge, ...S.badgeOff } }, t('endpointOff'))
            : h('div', { style: { ...S.row, minWidth: 0 } },
              h('code', { style: { ...S.mono, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' } }, variant.baseUrl),
              actionButton(`url:${variant.id}`, copied === `url:${variant.id}` ? t('copied') : t('copy'), () => {
                void copyText(`url:${variant.id}`, variant.baseUrl)
              }),
            ),
        ),
      ),

      isCollapsed ? null : h('div', null,
        variant.externalError === '' ? null
          : h('div', { style: { ...S.error, marginBottom: '8px' } }, `${t('endpointBindFailed')}: ${variant.externalError}`),
        variant.providerError === '' ? null
          : h('div', { style: { ...S.error, marginBottom: '8px' } }, variant.providerError),
        variant.desktopError === '' ? null
          : h('div', { style: { ...S.muted, marginBottom: '8px' } }, variant.desktopError),

        // 账号
        h('div', { style: S.cardTitle }, `${t('accounts')}（${variant.accounts.length}）`),
        variant.accounts.length === 0
          ? h('div', { style: S.muted }, t('accountsEmpty'))
          : variant.accounts.map(accountCard),

        // 模型开关
        h('div', { style: { ...S.cardTitle, marginTop: '14px', justifyContent: 'space-between' } },
          h('span', null, `${t('modelsSection')}（${visibleCount}/${variant.models.length}）`),
          h('div', { style: S.row },
            actionButton(`models:${variant.id}:on`, t('showAll'), () => {
              void run(`models:${variant.id}:on`, '/models', { variantId: variant.id, visible: true })
            }, t('working')),
            actionButton(`models:${variant.id}:off`, t('hideAll'), () => {
              void run(`models:${variant.id}:off`, '/models', { variantId: variant.id, visible: false })
            }, t('working')),
          ),
        ),
        h('p', { style: { ...S.sub, marginBottom: '8px' } }, t('modelsHint')),
        h('p', { style: { ...S.sub, marginBottom: '8px' } }, t('reasoningProbeHint')),
        // 窗口档位开关：上游给国际版声明了默认档（300k）与更大档（1M）
        h('label', { style: S.switchRow },
          h('input', {
            type: 'checkbox',
            checked: variant.useMaximumContextWindow,
            disabled: busyAny,
            onChange: () => {
              const useMaximum = !variant.useMaximumContextWindow
              setNotice('')
              setBusy(`ctxwindow:${variant.id}`)
              void (async () => {
                try {
                  // 开启时会顺带刷目录，所以要看回执而不只是 document。
                  const raw = await postPayload('/contextwindow', { variantId: variant.id, useMaximum })
                  if (raw.document !== undefined) setDoc(raw.document)
                  const ok = numField(raw, 'catalogsOk')
                  const failed = numField(raw, 'catalogsFailed')
                  setNotice(useMaximum
                    ? (ok + failed === 0
                      ? t('contextWindowNoTiers')
                      : t('contextWindowRefreshed', { ok, failed }))
                    : '')
                  setError('')
                } catch (err: unknown) { setError(String(err)) } finally { setBusy('') }
              })()
            },
          }),
          h('span', null, t('contextWindowUseMax')),
          busy === `ctxwindow:${variant.id}` ? h('span', { style: S.muted }, '⟳') : null,
        ),
        h('p', { style: { ...S.sub, marginTop: '4px' } }, t('contextWindowHint')),
        h('p', { style: { ...S.sub, marginBottom: '8px' } }, t('contextWindowEffect')),
        variant.models.length === 0
          ? h('div', { style: S.muted }, t('noModels'))
          : h('div', { style: S.modelGrid },
            variant.models.map(model => {
              const modelKey = `model:${variant.id}:${model.id}`
              const probeKey = `probe:${variant.id}:${model.id}`
              const tiers = contextTiers(model)
              // 上游声明了档位就不必探测；没声明且模型本身支持推理才给探测入口。
              const canProbe = model.effortsSource === 'none' && model.available
              return h('div', {
                key: model.id,
                style: { ...S.modelCell, opacity: model.visible ? 1 : 0.55, flexDirection: 'column', alignItems: 'stretch', gap: '2px' },
                title: [
                  model.id,
                  tiers.length > 1
                    ? `${t('modelContext')}: ${tiers.join(' / ')}`
                    : '',
                  model.credits === undefined ? '' : `${model.credits} credits`,
                ].filter(Boolean).join('\n'),
              },
                h('label', { style: { ...S.row, gap: '6px', cursor: 'pointer' } },
                  h('input', {
                    type: 'checkbox',
                    checked: model.visible,
                    disabled: busyAny,
                    onChange: () => {
                      void run(modelKey, '/model', { variantId: variant.id, modelId: model.id, visible: !model.visible })
                    },
                  }),
                  h('span', { style: { flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' } }, model.name),
                  busy === modelKey ? h('span', { style: S.muted }, '…') : null,
                  model.free ? h('span', { style: { ...S.badge, ...S.badgeOk } }, '免费') : null,
                  model.available ? null : h('span', { style: { ...S.badge, ...S.badgeOff } }, t('gone')),
                ),
                h('div', { style: { ...S.row, gap: '4px', paddingLeft: '22px' } },
                  h('span', { style: { ...S.muted, fontSize: '11px' } }, `${t('reasoning')}:`),
                  model.efforts.length === 0
                    ? h('span', { style: { ...S.muted, fontSize: '11px' } }, t('reasoningNone'))
                    : model.efforts.map(effort => h('span', {
                      key: effort,
                      style: {
                        ...S.badge,
                        ...(effort === model.defaultEffort ? S.badgeInfo : {}),
                        fontSize: '10px',
                        padding: '0 4px',
                      },
                      title: [
                        effort === model.defaultEffort ? t('reasoningDefault') : '',
                        model.effortsSource === 'probed' ? t('reasoningProbed') : '',
                      ].filter(Boolean).join(' · ') || undefined,
                    }, effort)),
                  model.effortsSource === 'probed' ? h('span', { style: { ...S.badge, ...S.badgeInfo, fontSize: '10px', padding: '0 4px' } }, t('reasoningProbed')) : null,
                  canProbe
                    ? actionButton(probeKey, t('reasoningProbe'), () => {
                      setBusy(probeKey)
                      setNotice('')
                      void (async () => {
                        try {
                          const next = await postPayload('/model/probe', { variantId: variant.id, modelId: model.id })
                          if (next.document !== undefined) setDoc(next.document)
                          const r = next as unknown as { ok: boolean; accepted?: string[]; error?: string }
                          setNotice(r.ok === true && (r.accepted?.length ?? 0) > 0
                            ? `${model.name}: ${(r.accepted ?? []).join(' / ')}`
                            : `${model.name}: ${r.error ?? t('reasoningNone')}`)
                          setError('')
                        } catch (err: unknown) { setError(String(err)) } finally { setBusy('') }
                      })()
                    }, t('reasoningProbing'))
                    : null,
                ),
                // 容量信息：窗口 / 输出上限，与推理档位同处一行起，便于横向比较
                h('div', { style: { ...S.row, gap: '4px', paddingLeft: '22px' } },
                  h('span', { style: { ...S.muted, fontSize: '11px' } }, `${t('modelContext')}:`),
                  h('span', { style: { fontSize: '11px' } }, formatTokens(model.contextWindow)),
                  tiers.length > 1
                    ? h('span', {
                      style: { ...S.badge, ...S.badgeInfo, fontSize: '10px', padding: '0 4px' },
                      title: tiers.join(' / '),
                    }, t('modelContextTiers'))
                    : null,
                  h('span', { style: { ...S.muted, fontSize: '11px' } }, `${t('modelMaxOutput')}:`),
                  h('span', { style: { fontSize: '11px' } }, formatTokens(model.maxTokens)),
                ),
              )
            }),
          ),
      ),
    )
  }

  /** 用量看板：今日汇总 + 近 7 天柱状 + 分账号/分模型两张小表。 */
  const usageSection = (usage: PanelUsage | undefined): unknown => {
    if (usage === undefined) return null
    const today = usage.today
    const maxDaily = Math.max(1, ...usage.daily.map(d => d.totals.totalTokens))
    const cell = (label: string, value: string): unknown => h('div', { style: S.statCell },
      h('div', { style: S.statLabel }, label),
      h('div', { style: S.statValue }, value),
    )
    const table = (title: string, rows: { name: string; totals: PanelTotals }[]): unknown => rows.length === 0
      ? null
      : h('div', { style: { marginTop: '10px' } },
        h('div', { style: S.statLabel }, title),
        h('table', { style: S.usageTable },
          h('thead', null, h('tr', null,
            h('th', { style: S.usageTh }, ''),
            h('th', { style: S.usageTh }, t('usageRequests')),
            h('th', { style: S.usageTh }, t('usagePrompt')),
            h('th', { style: S.usageTh }, t('usageCompletion')),
          )),
          h('tbody', null, rows.map(row => h('tr', { key: row.name },
            h('td', { style: { ...S.usageTd, ...S.mono, maxWidth: '260px', overflow: 'hidden', textOverflow: 'ellipsis' } }, row.name),
            h('td', { style: S.usageTd }, `${row.totals.requests}${row.totals.errors === 0 ? '' : ` (${row.totals.errors} ✗)`}`),
            h('td', { style: S.usageTd }, formatTokens(row.totals.promptTokens)),
            h('td', { style: S.usageTd }, formatTokens(row.totals.completionTokens)),
          ))),
        ),
      )

    return h('div', { style: S.card, key: 'usage' },
      h('div', { style: { ...S.cardTitle, justifyContent: 'space-between' } },
        h('span', null, t('usageSection')),
        h('div', { style: S.row },
          h('span', { style: S.badge }, t('usageAll')),
          h('span', { style: { ...S.muted, ...S.mono } },
            `${usage.all.requests} ${t('usageRequests').toLowerCase()} · ${formatTokens(usage.all.totalTokens)}`),
          // 两步确认：清空不可逆，不给一键误触的机会。
          clearArmed
            ? actionButton('usageClear', t('usageClearConfirm'), () => {
              setClearArmed(false)
              setBusy('usageClear')
              void (async () => {
                try {
                  await postDocument('/usage/clear', {})
                  setNotice(t('usageClearDone'))
                  setError('')
                  await load()
                } catch (err: unknown) { setError(String(err)) } finally { setBusy('') }
              })()
            }, t('working'))
            : h('button', { style: S.btn, onClick: () => setClearArmed(true) }, t('usageClear')),
        ),
      ),

      h('div', { style: S.statGrid },
        cell(t('usageRequests'), String(today.requests)),
        cell(t('usagePrompt'), formatTokens(today.promptTokens)),
        cell(t('usageCompletion'), formatTokens(today.completionTokens)),
        cell(t('usageCacheRate'), usage.cacheHitRate === undefined
          ? '—'
          : `${Math.round(usage.cacheHitRate * 100)}%`),
      ),

      h('div', { style: { marginTop: '12px' } },
        h('div', { style: S.statLabel }, t('usageDaily')),
        h('div', { style: S.barTrack }, usage.daily.map(day => h('div', {
          key: day.day,
          style: S.barColumn,
          title: `${day.day} · ${day.totals.requests} · ${day.totals.totalTokens}`,
        },
          h('div', {
            style: {
              ...S.bar,
              height: `${Math.max(2, Math.round((day.totals.totalTokens / maxDaily) * 100))}%`,
            },
          }),
          h('span', { style: { ...S.statLabel, fontSize: '10px' } }, day.day.slice(5)),
        ))),
      ),

      today.requests === 0 && usage.all.requests === 0
        ? h('p', { style: { ...S.sub, marginTop: '10px' } }, t('usageEmpty'))
        : null,

      table(t('usageByAccount'), usage.byAccount.map(row => ({ name: row.account, totals: row.totals }))),
      table(t('usageByModel'), usage.byModel.map(row => ({ name: row.model, totals: row.totals }))),

      h('p', { style: { ...S.sub, marginTop: '10px' } }, t('usageHint')),
    )
  }

  return h('div', { style: S.root },
    h('div', null,
      h('h1', { style: S.h1 }, t('title')),
      h('p', { style: S.sub }, t('subtitle')),
    ),

    // 全局进行中提示
    busyAny
      ? h('div', { style: S.progress },
        h('span', null, '⟳'),
        h('span', null, `${t('working')} …`),
      )
      : null,

    // 对外端点总开关 + API Key
    h('div', { style: S.card },
      h('div', { style: S.cardTitle },
        h('span', null, t('endpointSection')),
        h('span', { style: S.badge }, t('externalOnly')),
        h('span', {
          style: doc.endpointEnabled ? { ...S.badge, ...S.badgeOk } : { ...S.badge, ...S.badgeOff },
        }, doc.endpointEnabled ? t('endpointOn') : t('endpointOff')),
      ),
      h('label', { style: S.switchRow },
        h('input', {
          type: 'checkbox',
          checked: doc.endpointEnabled,
          disabled: busyAny,
          onChange: () => {
            void run('endpoint', '/endpoint', { enabled: !doc.endpointEnabled })
          },
        }),
        h('span', null, t('endpointSwitch')),
        busy === 'endpoint' ? h('span', { style: S.muted }, '⟳') : null,
      ),
      h('p', { style: { ...S.sub, marginTop: '4px' } }, t('endpointSwitchHint')),
      h('div', { style: { ...S.row, marginTop: '10px' } },
        h('span', { style: S.muted }, `${t('apiKey')}:`),
        h('code', { style: { ...S.mono, flex: 1, wordBreak: 'break-all' } }, doc.apiKey === '' ? '—' : doc.apiKey),
        actionButton('apikey', copied === 'apikey' ? t('copied') : t('copy'), () => {
          void copyText('apikey', doc.apiKey)
        }),
        // 来自 profile 配置时不给改，避免改了没效果
        doc.apiKeysConfigured
          ? null
          : actionButton('apikeyRefresh', t('apiKeyRefresh'), () => {
            setBusy('apikeyRefresh')
            void (async () => {
              try {
                const next = await postPayload('/apikey', {})
                if (next.document !== undefined) setDoc(next.document)
                const r = next as unknown as { ok: boolean; error?: string }
                if (r.ok !== true) setError(r.error ?? '')
                else setError('')
              } catch (err: unknown) { setError(String(err)) } finally { setBusy('') }
            })()
          }, t('working')),
        doc.apiKeysConfigured
          ? null
          : h('button', {
            style: S.btn,
            onClick: () => setKeyDraft(keyDraft === null ? doc.apiKey : null),
          }, keyDraft === null ? t('apiKeyEdit') : t('apiKeyCancel')),
      ),
      // 自定义输入行
      keyDraft === null
        ? null
        : h('div', { style: { ...S.row, marginTop: '8px' } },
          h('input', {
            style: { ...S.input, flex: 1, fontFamily: 'ui-monospace, monospace' },
            placeholder: t('apiKeyPlaceholder'),
            value: keyDraft,
            onChange: (e: { target: { value: string } }) => setKeyDraft(e.target.value),
          }),
          h('button', {
            style: S.btnPrimary,
            disabled: busyAny,
            onClick: () => {
              setBusy('apikeySave')
              void (async () => {
                try {
                  const next = await postPayload('/apikey', { key: keyDraft })
                  if (next.document !== undefined) setDoc(next.document)
                  const r = next as unknown as { ok: boolean; error?: string }
                  if (r.ok !== true) setError(r.error ?? '')
                  else { setError(''); setKeyDraft(null) }
                } catch (err: unknown) { setError(String(err)) } finally { setBusy('') }
              })()
            },
          }, busy === 'apikeySave' ? `${t('apiKeySave')} …` : t('apiKeySave')),
        ),
      h('p', { style: { ...S.sub, marginTop: '4px' } },
        doc.apiKeysConfigured ? t('apiKeyFromConfig') : t('apiKeyHint')),
      h('p', { style: { ...S.sub, marginTop: '2px' } }, t('endpointHint')),
    ),

    // 版本分区
    doc.variants.map(variantSection),

    // 用量看板
    usageSection(doc.usage),

    // 账号导入
    h('div', { style: S.card },
      h('div', { style: { ...S.cardTitle, justifyContent: 'space-between' } },
        h('span', null, t('accountImport')),
        h('div', { style: S.row },
          actionButton('refresh', t('refresh'), () => {
            void run('refresh', '/refresh', {})
          }, t('working')),
          h('button', {
            style: S.btn,
            onClick: () => {
              setForm(f => ({ ...f, variantId: f.variantId === '' ? doc.variants[0]?.id ?? '' : f.variantId }))
              setLogin(undefined)
              setNotice('')
              setOpenForm(openForm === 'login' ? '' : 'login')
            },
          }, t('linkLogin')),
          h('button', {
            style: S.btn,
            onClick: () => {
              setForm(f => ({ ...f, variantId: f.variantId === '' ? doc.variants[0]?.id ?? '' : f.variantId }))
              setOpenForm(openForm === 'single' ? '' : 'single')
            },
          }, t('addAccount')),
        ),
      ),

      notice === '' ? null : h('div', { style: { ...S.muted, marginBottom: '8px', color: 'inherit' } }, notice),

      openForm === 'login'
        ? h('div', { style: { marginTop: '6px' } },
          h('p', { style: { ...S.sub, marginBottom: '8px' } }, t('linkLoginHint')),
          h('p', { style: { ...S.sub, marginBottom: '8px' } }, t('linkLoginStep')),
          h('div', { style: S.row },
            h('label', { style: S.muted }, t('variant'),
              h('select', {
                style: { ...S.input, width: 'auto' },
                value: form.variantId,
                onChange: (e: { target: { value: string } }) => {
                  setForm(f => ({ ...f, variantId: e.target.value }))
                  setLogin(undefined)
                },
              }, doc.variants.map(v => h('option', { key: v.id, value: v.id }, `${v.displayName}（${v.appName}）`))),
            ),
            h('button', {
              style: S.btnPrimary,
              disabled: busyAny || form.variantId === '',
              onClick: () => {
                void (async () => {
                  setBusy('login')
                  setNotice('')
                  try {
                    // 用 postPayload：authUrl/state 是接口自己的字段，
                    // postDocument 只取 document，会把它们丢掉。
                    const raw = await postPayload('/login/start', { variantId: form.variantId })
                    const payload = raw as unknown as { ok: boolean; state?: string; authUrl?: string; error?: string }
                    if (raw.document !== undefined) setDoc(raw.document)
                    if (payload.ok && payload.state !== undefined && payload.authUrl !== undefined) {
                      setLogin({ variantId: form.variantId, state: payload.state, authUrl: payload.authUrl, message: '' })
                      setBusy('')
                      // 立刻在默认浏览器里打开授权页，省掉一次手动复制。
                      openExternal(payload.authUrl)
                      // 开始轮询，直到拿到账号或超时。
                      const started = Date.now()
                      const timer = setInterval(() => {
                        void (async () => {
                          try {
                            const raw2 = await postPayload('/login/poll', { state: payload.state })
                            const r = raw2 as unknown as { ok: boolean; status: string; message?: string; error?: string; account?: { nickname: string; account: string } }
                            if (raw2.document !== undefined) setDoc(raw2.document)
                            if (r.status === 'pending') {
                              setLogin(prev => prev === undefined ? prev : { ...prev, message: r.message ?? '' })
                            } else {
                              clearInterval(timer)
                              if (r.ok && r.account !== undefined) {
                                setNotice(t('linkLoginOk', { name: r.account.nickname || r.account.account }))
                                setLogin(undefined)
                                setOpenForm('')
                              } else {
                                setLogin(prev => prev === undefined ? prev : { ...prev, message: r.error ?? t('linkLoginFailed') })
                              }
                            }
                            // 与上游一致的 10 分钟窗口，客户端这边留点余量。
                            if (Date.now() - started > 9 * 60 * 1000) { clearInterval(timer); setLogin(undefined) }
                          } catch {
                            // 单次失败不打断轮询
                          }
                        })()
                      }, 2000)
                    } else {
                      setBusy('')
                      setError(payload.error ?? t('linkLoginFailed'))
                    }
                  } catch (err: unknown) {
                    setBusy('')
                    setError(String(err))
                  }
                })()
              },
            }, busy === 'login' ? t('linkLoginOpening') : t('linkLoginStart')),
            h('button', { style: S.btn, onClick: () => { setOpenForm(''); setLogin(undefined) } }, t('cancel')),
          ),
          login === undefined
            ? null
            : h('div', { style: { ...S.accountRow, marginTop: '10px' } },
              h('div', { style: { ...S.row, marginBottom: '6px' } },
                h('span', { style: { ...S.badge, ...S.badgeInfo } }, '⟳'),
                h('span', { style: S.muted }, login.message === '' ? t('linkLoginWaiting') : login.message),
              ),
              h('p', { style: { ...S.sub, marginBottom: '6px' } }, t('linkLoginOpenHint')),
              h('div', { style: S.row },
                h('button', {
                  style: S.btnPrimary,
                  onClick: () => openExternal(login.authUrl),
                }, t('linkLoginOpen')),
                actionButton('loginUrl', copied === 'loginUrl' ? t('copied') : t('copy'), () => {
                  void copyText('loginUrl', login.authUrl)
                }),
              ),
              h('code', { style: { ...S.mono, display: 'block', marginTop: '6px', wordBreak: 'break-all', ...S.muted } }, login.authUrl),
            ),
        )
        : null,

      notice === '' ? null : h('div', { style: { ...S.muted, marginBottom: '8px', color: 'inherit' } }, notice),

      openForm === 'single'
        ? h('div', { style: { marginTop: '6px' } },
          h('p', { style: { ...S.sub, marginBottom: '8px' } }, t('addHint')),
          h('div', { style: { display: 'grid', gap: '8px' } },
            h('label', { style: S.muted }, t('variant'),
              h('select', {
                style: { ...S.input, marginTop: '4px' },
                value: form.variantId,
                onChange: (e: { target: { value: string } }) => setForm(f => ({ ...f, variantId: e.target.value })),
              }, doc.variants.map(v => h('option', { key: v.id, value: v.id }, `${v.displayName}（${v.appName}）`))),
            ),
            h('label', { style: S.muted }, t('accessToken'),
              h('textarea', {
                style: { ...S.input, marginTop: '4px', minHeight: '60px', resize: 'vertical' },
                value: form.accessToken,
                onChange: (e: { target: { value: string } }) => setForm(f => ({ ...f, accessToken: e.target.value })),
              }),
            ),
            h('label', { style: S.muted }, t('uid'),
              h('input', {
                style: { ...S.input, marginTop: '4px' }, value: form.uid,
                onChange: (e: { target: { value: string } }) => setForm(f => ({ ...f, uid: e.target.value })),
              }),
            ),
            h('label', { style: S.muted }, t('enterpriseId'),
              h('input', {
                style: { ...S.input, marginTop: '4px' }, value: form.enterpriseId,
                onChange: (e: { target: { value: string } }) => setForm(f => ({ ...f, enterpriseId: e.target.value })),
              }),
            ),
            h('label', { style: S.muted }, t('nickname'),
              h('input', {
                style: { ...S.input, marginTop: '4px' }, value: form.nickname,
                onChange: (e: { target: { value: string } }) => setForm(f => ({ ...f, nickname: e.target.value })),
              }),
            ),
          ),
          h('div', { style: { ...S.row, marginTop: '10px' } },
            h('button', {
              style: S.btnPrimary,
              disabled: busyAny || form.accessToken.trim() === '' || form.variantId === '',
              onClick: () => {
                void run('import', '/account/import', form).then(() => {
                  setOpenForm('')
                  setForm({ variantId: form.variantId, accessToken: '', uid: '', enterpriseId: '', nickname: '' })
                })
              },
            }, busy === 'import' ? `${t('doImport')} …` : t('doImport')),
            h('button', { style: S.btn, onClick: () => setOpenForm('') }, t('cancel')),
          ),
        )
        : null,
    ),

    // 第三方导入
    h('div', { style: S.card },
      h('div', { style: S.cardTitle }, t('thirdPartyImport')),
      h('p', { style: { ...S.sub, marginBottom: '10px' } }, t('thirdPartyHint')),
      h('div', { style: { ...S.row, justifyContent: 'space-between' } },
        h('span', { style: { fontWeight: 600 } }, t('importHub')),
        h('button', {
          style: S.btn,
          onClick: () => setOpenForm(openForm === 'hub' ? '' : 'hub'),
        }, openForm === 'hub' ? t('cancel') : t('doImport')),
      ),
      openForm === 'hub'
        ? h('div', { style: { marginTop: '8px' } },
          h('p', { style: { ...S.sub, marginBottom: '8px' } }, t('importHubHint')),
          h('textarea', {
            style: { ...S.input, minHeight: '120px', resize: 'vertical', fontFamily: 'ui-monospace, monospace' },
            placeholder: t('importHubPlaceholder'),
            value: hubText,
            onChange: (e: { target: { value: string } }) => setHubText(e.target.value),
          }),
          h('div', { style: { ...S.row, marginTop: '8px' } },
            h('button', {
              style: S.btnPrimary,
              disabled: busyAny || hubText.trim() === '',
              onClick: () => {
                void (async () => {
                  setBusy('import')
                  try {
                    const next = await postDocument('/import', { payload: hubText })
                    setDoc(next)
                    const result = next.importResult
                    if (result !== undefined && result.error !== '') setNotice(result.error)
                    else if (result !== undefined) {
                      setNotice(
                        t('importOk', { n: result.imported })
                        + (result.skipped.length > 0 ? t('importSkipped', { n: result.skipped.length }) : ''),
                      )
                      setHubText('')
                      setOpenForm('')
                    }
                    setError('')
                  } catch (err: unknown) {
                    setError(String(err))
                  } finally {
                    setBusy('')
                  }
                })()
              },
            }, busy === 'import' ? `${t('doImport')} …` : t('doImport')),
            h('button', { style: S.btn, onClick: () => setOpenForm('') }, t('cancel')),
          ),
        )
        : null,
    ),

    error === '' ? null : h('div', { style: S.error }, error),
  )
}
