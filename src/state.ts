/**
 * 面板可改的运行时状态。
 *
 * 与 `cordis.patch.yml` 里的静态配置分开：那些是部署时的默认值，这里是用户在
 * 设置面板里随时改、且要立刻生效并持久化的东西（端点总开关、逐模型的显隐）。
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
  /** OpenAI 兼容端点总开关。关掉后端点停止监听、provider 也一并注销。 */
  endpointEnabled: boolean
  /** 逐版本隐藏的模型 id：`{ 变体id: [模型id] }`。 */
  hiddenModels: Record<string, string[]>
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
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
          const list = hidden[variant.id]
          if (Array.isArray(list)) {
            next[variant.id] = list.filter((id): id is string => typeof id === 'string' && id !== '')
          }
        }
        this.data.hiddenModels = next
      }
    } catch {
      // 损坏就按默认值走
    }
  }

  /** 端点总开关。 */
  get endpointEnabled(): boolean {
    return this.data.endpointEnabled
  }

  /** 设置端点总开关并落盘。 */
  async setEndpointEnabled(enabled: boolean): Promise<void> {
    this.data.endpointEnabled = enabled
    await this.persist()
  }

  /** 某版本被隐藏的模型 id。 */
  hidden(variantId: string): string[] {
    return this.data.hiddenModels[variantId] ?? []
  }

  /** 全部隐藏项（跨版本合并），供回环端点过滤使用。 */
  allHidden(): string[] {
    return Object.values(this.data.hiddenModels).flat()
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

  /** 写回磁盘。 */
  async persist(): Promise<void> {
    const document = {
      version: 1,
      endpointEnabled: this.data.endpointEnabled,
      hiddenModels: this.data.hiddenModels,
    }
    await mkdir(dirname(this.path), { recursive: true })
    const temp = `${this.path}.${process.pid}.tmp`
    await writeFile(temp, JSON.stringify(document, null, 2), 'utf8')
    await rename(temp, this.path)
  }
}
