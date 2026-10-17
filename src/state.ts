/**
 * 面板可改的运行时状态。
 *
 * 与 `cordis.patch.yml` 里的静态配置分开：那些是部署时的默认值，这里是用户在
 * 设置面板里随时改、且要立刻生效并持久化的东西（对外端点开关、逐模型显隐、
 * 探测得到的推理档位）。
 *
 * @module dsh-hyperworkbuddy/state
 */

import { mkdir, readFile, rename, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { WORKBUDDY_VARIANTS } from './variants.ts'

/** 落盘文件名。 */
export const STATE_FILENAME = '.hyperworkbuddy-state.json'

/** 面板可改的状态。 */
export interface PluginStateData {
  /** 对外端点总开关。关掉后对外端点停止监听；DSH 侧不受影响。 */
  endpointEnabled: boolean
  /** 逐版本隐藏的模型 id：`{ 变体id: [模型id] }`。 */
  hiddenModels: Record<string, string[]>
  /**
   * 探测得到的推理档位：`{ 变体id: { 模型id: [档位] } }`。
   *
   * 只在上游没有声明 `supportedEfforts` 时使用——上游的声明优先于本地探测，
   * 探测结果不该盖掉上游的权威说法。
   */
  probedEfforts: Record<string, Record<string, string[]>>
  /**
   * 逐版本「使用最大上下文窗口」：`{ 变体id: true }`。
   *
   * 上游给国际版声明了 `supportedLengths`（默认档 300k、最大档 1M），默认只用
   * 默认档；打开后抬到最大档。国内版上游不声明档位，这里对它没有意义。
   */
  useMaximumContextWindow: Record<string, boolean>
  /**
   * 逐版本「每日自动签到」：`{ 变体id: true }`。
   *
   * 只有国内版有签到接口；国际版即便写了也不会触发。
   */
  autoCheckin: Record<string, boolean>
  /**
   * 自动签到最近一次的尝试日期：`{ 变体id: 'YYYY-MM-DD' }`。
   *
   * 记「尝试过」而不是「成功过」：签到失败多半是上游抖动，每轮都重试只会把
   * 失败放大，当天剩下的时间留给用户手动点一键签到。
   */
  checkinDay: Record<string, string>
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

/** 把任意值归一成去空字符串数组。 */
function toStringList(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === 'string' && item !== '')
    : []
}

/** 状态文件路径。 */
export function statePath(homeDir: string): string {
  return join(homeDir, STATE_FILENAME)
}

/**
 * 状态存取。
 *
 * 读失败一律回落到默认值：一个坏掉的状态文件不该让插件起不来。
 */
export class PluginState {
  private readonly path: string
  private data: PluginStateData

  constructor(homeDir: string, defaults: Partial<PluginStateData> = {}) {
    this.path = statePath(homeDir)
    this.data = {
      endpointEnabled: defaults.endpointEnabled ?? true,
      hiddenModels: { ...defaults.hiddenModels },
      probedEfforts: { ...defaults.probedEfforts },
      useMaximumContextWindow: { ...defaults.useMaximumContextWindow },
      autoCheckin: { ...defaults.autoCheckin },
      checkinDay: { ...defaults.checkinDay },
    }
  }

  /** 从磁盘读取；不存在或损坏时保留默认值。 */
  async load(): Promise<void> {
    let text: string
    try {
      text = await readFile(this.path, 'utf8')
    } catch {
      return
    }
    try {
      const document = JSON.parse(text) as unknown
      if (!isRecord(document)) return
      if (typeof document['endpointEnabled'] === 'boolean') {
        this.data.endpointEnabled = document['endpointEnabled']
      }
      const hidden = document['hiddenModels']
      if (isRecord(hidden)) {
        const next: Record<string, string[]> = {}
        for (const variant of WORKBUDDY_VARIANTS) {
          const list = toStringList(hidden[variant.id])
          if (list.length > 0) next[variant.id] = list
        }
        this.data.hiddenModels = next
      }
      const probed = document['probedEfforts']
      if (isRecord(probed)) {
        const next: Record<string, Record<string, string[]>> = {}
        for (const variant of WORKBUDDY_VARIANTS) {
          const models = probed[variant.id]
          if (!isRecord(models)) continue
          const bucket: Record<string, string[]> = {}
          for (const [modelId, list] of Object.entries(models)) {
            const efforts = toStringList(list)
            if (efforts.length > 0) bucket[modelId] = efforts
          }
          if (Object.keys(bucket).length > 0) next[variant.id] = bucket
        }
        this.data.probedEfforts = next
      }
      const maximum = document['useMaximumContextWindow']
      if (isRecord(maximum)) {
        const next: Record<string, boolean> = {}
        for (const variant of WORKBUDDY_VARIANTS) {
          if (maximum[variant.id] === true) next[variant.id] = true
        }
        this.data.useMaximumContextWindow = next
      }
      const auto = document['autoCheckin']
      if (isRecord(auto)) {
        const next: Record<string, boolean> = {}
        for (const variant of WORKBUDDY_VARIANTS) {
          if (auto[variant.id] === true) next[variant.id] = true
        }
        this.data.autoCheckin = next
      }
      const days = document['checkinDay']
      if (isRecord(days)) {
        const next: Record<string, string> = {}
        for (const variant of WORKBUDDY_VARIANTS) {
          const day = days[variant.id]
          if (typeof day === 'string' && day !== '') next[variant.id] = day
        }
        this.data.checkinDay = next
      }
    } catch {
      // 损坏就按默认值走
    }
  }

  /** 对外端点总开关。 */
  get endpointEnabled(): boolean {
    return this.data.endpointEnabled
  }

  /** 设置对外端点总开关并落盘。 */
  async setEndpointEnabled(enabled: boolean): Promise<void> {
    this.data.endpointEnabled = enabled
    await this.persist()
  }

  /** 某版本被隐藏的模型 id。 */
  hidden(variantId: string): string[] {
    return this.data.hiddenModels[variantId] ?? []
  }

  /**
   * 打开 / 关闭某版本下的一个模型。
   *
   * @param variantId - 变体 id。
   * @param modelId - 模型 id。
   * @param visible - true 表示显示，false 表示隐藏。
   */
  async setVisible(variantId: string, modelId: string, visible: boolean): Promise<void> {
    const current = new Set(this.hidden(variantId))
    if (visible) current.delete(modelId)
    else current.add(modelId)
    const next = { ...this.data.hiddenModels }
    if (current.size === 0) delete next[variantId]
    else next[variantId] = [...current]
    this.data.hiddenModels = next
    await this.persist()
  }

  /** 某模型探测到的档位；没有探测过时为空数组。 */
  probedFor(variantId: string, modelId: string): string[] {
    return this.data.probedEfforts[variantId]?.[modelId] ?? []
  }

  /** 该版本是否使用上游声明的最大上下文窗口。 */
  usesMaximumContextWindow(variantId: string): boolean {
    return this.data.useMaximumContextWindow[variantId] === true
  }

  /** 设置「使用最大上下文窗口」并落盘。 */
  async setMaximumContextWindow(variantId: string, useMaximum: boolean): Promise<void> {
    const next = { ...this.data.useMaximumContextWindow }
    if (useMaximum) next[variantId] = true
    else delete next[variantId]
    this.data.useMaximumContextWindow = next
    await this.persist()
  }

  /**
   * 记录一个模型探测到的档位。
   *
   * @param variantId - 变体 id。
   * @param modelId - 模型 id。
   * @param efforts - 被上游接受的档位。
   */
  async setEfforts(variantId: string, modelId: string, efforts: string[]): Promise<void> {
    const next = { ...this.data.probedEfforts }
    const bucket = { ...(next[variantId] ?? {}) }
    if (efforts.length === 0) delete bucket[modelId]
    else bucket[modelId] = efforts
    if (Object.keys(bucket).length === 0) delete next[variantId]
    else next[variantId] = bucket
    this.data.probedEfforts = next
    await this.persist()
  }

  /** 该版本是否开着每日自动签到。 */
  autoCheckinEnabled(variantId: string): boolean {
    return this.data.autoCheckin[variantId] === true
  }

  /** 设置「每日自动签到」并落盘。 */
  async setAutoCheckin(variantId: string, enabled: boolean): Promise<void> {
    const next = { ...this.data.autoCheckin }
    if (enabled) next[variantId] = true
    else delete next[variantId]
    this.data.autoCheckin = next
    await this.persist()
  }

  /** 该版本自动签到上次尝试的日期（`YYYY-MM-DD`），没试过时为空串。 */
  lastCheckinDay(variantId: string): string {
    return this.data.checkinDay[variantId] ?? ''
  }

  /**
   * 记下自动签到在某天已尝试过。
   *
   * @param variantId - 变体 id。
   * @param day - `YYYY-MM-DD`；空串表示清掉记录。
   */
  async markCheckinDay(variantId: string, day: string): Promise<void> {
    const next = { ...this.data.checkinDay }
    if (day === '') delete next[variantId]
    else next[variantId] = day
    this.data.checkinDay = next
    await this.persist()
  }

  /** 写回磁盘。 */
  async persist(): Promise<void> {
    const document = {
      version: 1,
      endpointEnabled: this.data.endpointEnabled,
      hiddenModels: this.data.hiddenModels,
      probedEfforts: this.data.probedEfforts,
      useMaximumContextWindow: this.data.useMaximumContextWindow,
      autoCheckin: this.data.autoCheckin,
      checkinDay: this.data.checkinDay,
    }
    await mkdir(dirname(this.path), { recursive: true })
    const temp = `${this.path}.${process.pid}.tmp`
    await writeFile(temp, JSON.stringify(document, null, 2), 'utf8')
    await rename(temp, this.path)
  }
}
