// 验收：一键刷新、一键签到、链接登录三条新路由。
// 放在插件目录内运行，以复现 profile 的依赖解析。
const services = new Map()
const effects = []
const routes = new Map()
const adapters = new Map()

const ctx = {
  logger: { info: () => {}, warn: () => {}, error: (...a) => console.log('[error]', ...a) },
  get: n => services.get(n),
  provide: (n, v) => services.set(n, v),
  emit: () => {}, on: () => () => {},
  effect: (fn) => { const d = fn(); if (typeof d === 'function') effects.push(d); return d },
  inject: (deps, fn) => {
    const scope = Object.create(ctx)
    for (const d of deps) { const s = services.get(d); if (s !== undefined) scope[d] = s }
    fn(scope)
  },
  llm: { registerAdapter: (p, a) => { for (const id of p) adapters.set(id, a); return () => {} } },
}
services.set('webServer', { register: ({ path, handler }) => { routes.set(path, handler); return () => {} } })

const mod = await import('./lib/index.js')
mod.apply(ctx, { port: 0, portAI: 0, apiKeys: [], hiddenModels: [], followDesktop: true })
await new Promise(r => setTimeout(r, 4000))

async function call(path, body) {
  const handler = routes.get(path)
  if (handler === undefined) throw new Error('路由未注册: ' + path)
  const chunks = body === undefined ? [] : [Buffer.from(JSON.stringify(body), 'utf8')]
  const req = {
    method: 'POST', url: path, headers: { host: '127.0.0.1:19387', 'content-type': 'application/json' },
    async *[Symbol.asyncIterator]() { for (const c of chunks) yield c },
  }
  return await new Promise((resolve, reject) => {
    const res = {
      headersSent: false, statusCode: 0, body: '',
      writeHead(c) { this.statusCode = c; this.headersSent = true; return this },
      write(p) { this.body += p ?? ''; return true },
      end(p) { this.body += p ?? ''; resolve(JSON.parse(this.body)) },
    }
    Promise.resolve(handler(req, res)).catch(reject)
  })
}

console.log('=== 新路由是否注册 ===')
for (const p of ['/api-hyperworkbuddy/variant/refresh', '/api-hyperworkbuddy/variant/checkin', '/api-hyperworkbuddy/login/start', '/api-hyperworkbuddy/login/poll']) {
  console.log('  ' + (routes.has(p) ? 'OK ' : 'MISSING ') + p)
}

console.log('\n=== 一键刷新（国内版）===')
const r = await call('/api-hyperworkbuddy/variant/refresh', { variantId: 'hyperworkbuddy' })
console.log('  目录 成功=' + r.catalogsOk + ' 失败=' + r.catalogsFailed + ' | 积分 成功=' + r.creditsOk + ' 失败=' + r.creditsFailed)
const cn = r.document.variants.find(v => v.id === 'hyperworkbuddy')
for (const a of cn.accounts.slice(0, 3)) {
  console.log('   ' + a.account + ' 积分=' + (a.credits ? a.credits.remaining + '/' + a.credits.total : '未获取'))
}

console.log('\n=== 一键签到（国内版）===')
const c = await call('/api-hyperworkbuddy/variant/checkin', { variantId: 'hyperworkbuddy' })
console.log('  ok=' + c.ok)
for (const x of c.results ?? []) console.log('   ' + x.account + ' -> ok=' + x.ok + ' ' + x.message)

console.log('\n=== 签到（国际版，应被拒）===')
const cAi = await call('/api-hyperworkbuddy/variant/checkin', { variantId: 'hyperworkbuddy-ai' })
console.log('  ok=' + cAi.ok + ' error=' + (cAi.error ?? '(无)'))

console.log('\n=== 链接登录：起一次 ===')
try {
  const s = await call('/api-hyperworkbuddy/login/start', { variantId: 'hyperworkbuddy' })
  console.log('  ok=' + s.ok)
  if (s.ok) {
    console.log('  state=' + String(s.state).slice(0, 16) + '...')
    console.log('  authUrl=' + String(s.authUrl).slice(0, 120) + '...')
    const p = await call('/api-hyperworkbuddy/login/poll', { state: s.state })
    console.log('  轮询一次 -> status=' + p.status + ' message=' + (p.message ?? p.error ?? ''))
  } else {
    console.log('  error=' + s.error)
  }
} catch (e) {
  console.log('  失败: ' + String(e).slice(0, 200))
}

for (const d of effects) { try { d() } catch {} }
process.exit(0)
