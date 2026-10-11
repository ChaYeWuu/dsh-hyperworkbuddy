// 检查 peerDependencies 是否会静默排除 harness 的预发布版本。
//
// node-semver 只有当范围里某个比较符与该版本的 major.minor.patch 元组完全一致、
// 且自身带预发布标签时，才放行预发布版本。宽范围如 `>=0.0.1-rc.1 <0.2.0` 匹配不到
// `0.1.0-rc.6`，用户会遇到 ERESOLVE。
//
// 只对按预发布节奏发版的 dsh-* 内核包做这项检查：cordis / schemastery 这类
// 稳定版依赖本来就不带预发布标签，拿内核版本去套它们只会得到无意义的失败。
import { readFileSync } from 'node:fs'
import * as semver from 'semver'

const pkg = JSON.parse(readFileSync('package.json', 'utf8'))
const peers = pkg.peerDependencies ?? {}

// 内核真实存在过的预发布版本，用于验证范围是否放行。
const HARNESS_PRERELEASES = [
  '0.1.5-rc.1', '0.1.6-alpha.2', '0.1.7-rc.2', '0.2.0-rc.1', '0.2.0-rc.2',
]

/** 该依赖是否按预发布节奏发版（只有这些包需要预发布分支）。 */
function isPrereleaseTracked(name) {
  return /^@deepseek-ai\/dsh-/.test(name)
}

let problems = 0
for (const [name, range] of Object.entries(peers)) {
  if (!isPrereleaseTracked(name)) {
    console.log(`  SKIP  ${name}  ${range}（稳定版依赖，不涉及预发布）`)
    continue
  }
  const matched = HARNESS_PRERELEASES.filter(v => {
    try { return semver.satisfies(v, range, { includePrerelease: false }) } catch { return false }
  })
  // 带预发布标签的比较符即视为作者已显式处理
  const explicit = /-(rc|alpha|beta|next)\./i.test(range)
  const ok = matched.length > 0 || explicit
  if (!ok) problems += 1
  console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${name}  ${range}  -> 放行 [${matched.join(', ') || '无'}]${explicit ? '（显式预发布分支）' : ''}`)
}

console.log(`\n  问题项: ${problems}`)
process.exit(problems === 0 ? 0 : 1)
