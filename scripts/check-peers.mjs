// 检查 peerDependencies 是否放行 harness 的预发布版本。
//
// 内核的判定是 dsh-app-boot 的 evaluatePluginCompatibility()：
//   semver.satisfies(runtimeVersion, range, { includePrerelease: true })
// 且只校验 `@deepseek-ai/dsh` 与 `@deepseek-ai/dsh-*`。这里的输入与选项都与它对齐，
// 否则本地 PASS 而安装时被拒。
//
// includePrerelease 下预发布只在 major.minor.patch 元组相同的比较符里放行：
// `0.2.0-rc.2` 这类精确写法只认那一个版本，宿主换一个 rc 就装不上。
import { readFileSync } from 'node:fs'
import * as semver from 'semver'

const pkg = JSON.parse(readFileSync('package.json', 'utf8'))
const peers = pkg.peerDependencies ?? {}

// 同一条发布线上已发布或即将出现的版本，范围必须全部放行。
const SUPPORTED = [
  '0.2.0-rc.1', '0.2.0-rc.2', '0.2.0-rc.3', '0.2.0',
  '0.2.1-alpha.1', '0.2.1-alpha.2', '0.2.1-rc.1', '0.2.1', '0.2.2-alpha.1',
]
// 已越出支持线：范围必须拦住，否则等于没写上限。
const REJECTED = ['0.1.7-rc.2', '0.3.0-rc.1', '0.3.0']

/** 该依赖是否与内核同一条发布线（只有这些包需要预发布分支）。 */
function isHarnessPackage(name) {
  return /^@deepseek-ai\/dsh(?:-|$)/.test(name)
}

/** 按内核语义判定，非法范围一律视为不匹配。 */
function matches(version, range) {
  try { return semver.satisfies(version, range, { includePrerelease: true }) } catch { return false }
}

let problems = 0
for (const [name, range] of Object.entries(peers)) {
  if (!isHarnessPackage(name)) {
    console.log(`  SKIP  ${name}  ${range}（不在内核发布线上，内核不校验）`)
    continue
  }
  const missing = SUPPORTED.filter(v => !matches(v, range))
  const leaked = REJECTED.filter(v => matches(v, range))
  const ok = missing.length === 0 && leaked.length === 0
  if (!ok) problems += 1
  const detail = [
    missing.length > 0 ? `漏掉 [${missing.join(', ')}]` : '',
    leaked.length > 0 ? `误放行 [${leaked.join(', ')}]` : '',
  ].filter(Boolean).join('；')
  console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${name}  ${range}${ok ? '' : `  -> ${detail}`}`)
}

const engines = pkg.dsh?.engines?.dsh
if (typeof engines === 'string') {
  const ok = SUPPORTED.every(v => matches(v, engines)) && REJECTED.every(v => !matches(v, engines))
  if (!ok) problems += 1
  console.log(`  ${ok ? 'PASS' : 'FAIL'}  dsh.engines.dsh  ${engines}`)
}

console.log(`\n  问题项: ${problems}`)
process.exit(problems === 0 ? 0 : 1)
