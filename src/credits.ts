/**
 * 倍率展示。
 *
 * 上游把倍率写在模型目录的 `billing.credits` 里，形如 `x0.79`（`x` 表示「乘以」）。
 * 这里统一转成 `0.79x` 的展示写法——面板与 DSH 模型选择器共用，避免两处各写一份。
 *
 * 刻意不引任何模块：浏览器半边的 bundle 也要引它。
 *
 * @module dsh-hyperworkbuddy/credits
 */

/**
 * 把上游倍率转成展示文案。
 *
 * @param credits 上游原样值，如 `x0.79`；缺失或为空表示上游没给倍率。
 * @returns 形如 `0.79x` 的文案；无倍率时返回空串，调用方据此决定是否渲染。
 */
export function formatCredits(credits: string | undefined): string {
  if (credits === undefined) return ''
  const text = credits.trim().replace(/^x/iu, '').trim()
  if (text === '') return ''
  const value = Number(text)
  // 上游换写法时不猜，原样加后缀也比丢掉强。
  if (!Number.isFinite(value)) return `${text}x`
  // 固定两位：上游偶尔下发 x0.8、x2，混排时长度不齐很难扫。
  return `${value.toFixed(2)}x`
}
