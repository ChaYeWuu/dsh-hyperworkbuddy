// 校验待提交条目是否符合 awesome-dsh-plugin 的贡献规范。
import { readFileSync } from 'node:fs'
import * as YAML from 'js-yaml'

const path = process.argv[2] ?? '.submission/data/plugins/ChaYeWuu__dsh-hyperworkbuddy.yml'
const doc = YAML.load(readFileSync(path, 'utf8'))

const ALLOWED = ['agi', 'ui', 'usage', 'theme', 'model', 'identity', 'session', 'memory', 'tools', 'wsl',
  'browser', 'vision', 'voice', 'docs', 'skill', 'workflow', 'git', 'notify', 'dev', 'security',
  'remote', 'market', 'fun']

const checks = []
const check = (label, ok, detail = '') => checks.push({ label, ok, detail })

check('YAML 可解析', true)
check('url 与仓库完全一致', doc.url === 'https://github.com/ChaYeWuu/dsh-hyperworkbuddy', doc.url)
check('name 形如 owner/repo', /^[^/]+\/[^/]+$/.test(doc.name), doc.name)
check('name 与 url 对应', doc.url.endsWith('/' + doc.name), doc.name)
check('category 在允许列表内', ALLOWED.includes(doc.category), doc.category)
check('description.en 存在', typeof doc.description?.en === 'string' && doc.description.en.length > 0)
check('en 以英文句号结尾', /\.\s*$/.test(doc.description.en.trim()))
if (typeof doc.description?.zh === 'string') {
  check('zh 以中文句号结尾', /。\s*$/.test(doc.description.zh.trim()))
}
// 描述含 ": " 必须在 YAML 里被引号包住；解析后无从判断，改为检查原始文本
const raw = readFileSync(path, 'utf8')
const lines = raw.split(/\r?\n/)
let bareColonRisk = false
for (const line of lines) {
  const m = /^\s+(en|zh):\s*(.+)$/.exec(line)
  if (m === null) continue
  const value = m[2].trim()
  // 未加引号且值里含 ": " -> YAML 会当成嵌套键
  if (!/^['"]/.test(value) && /: /.test(value)) bareColonRisk = true
}
check('描述无裸冒号（或已加引号）', !bareColonRisk)
check('无营销词', !/\b(best|fastest|ultimate|amazing|revolutionary|powerful)\b/i.test(doc.description.en))

let failed = 0
for (const c of checks) {
  if (!c.ok) failed += 1
  console.log(`  ${c.ok ? 'PASS' : 'FAIL'}  ${c.label}${c.detail === '' ? '' : '  -> ' + c.detail}`)
}
console.log(`\n  ${checks.length - failed}/${checks.length} 通过`)
process.exit(failed === 0 ? 0 : 1)
