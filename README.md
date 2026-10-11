# DSH HyperWorkBuddy

一个 DeepSeek Harness 插件：在 DSH 设置里直接管理 WorkBuddy 多账号，并把模型接进 DSH 与任意 OpenAI 兼容客户端。

- **设置里直接就是一级选项**——「设置 → WorkBuddy」，不是藏在「设置 → 插件」里面；
- **多账号池**——自动跟随桌面 App 登录，也可手动导入任意多个账号，请求在账号间轮询并自动故障切换；
- **模型直接进 DSH**——注册独立 provider，模型选择器里直接选；
- **OpenAI 兼容端点**——同时给 Codex / Claude Code / 其他客户端用，带总开关；
- **国内版 / 国际版分区**——两版各有独立账号池、端点与模型表，互不串号。

## 能做什么

| 你想要 | 它是怎么做的 |
|---|---|
| 设置里一眼就能找到 | 打开「设置」就有 WorkBuddy 一项，和「模型」「插件」并排，不用钻进插件里翻 |
| 想给别的软件用就用，不想就不给 | 一个开关控制对外提供接口。关掉后 Codex、Claude Code 这类外部客户端连不上，**DSH 自己照常用** |
| 国内版、国际版各管各的 | 两边账号、模型、端口全部分开，同一个模型名不会跑到另一个去 |
| 一次只看一个版本 | 每个版本都能收起，界面不堆在一起 |
| 一键刷完所有账号 | 点一下就把该版本全部账号的余额和模型列表都刷新一遍 |
| 不用手工复制 token | 「链接登录」在浏览器里登录一次，账号自动加进来 |
| 顺手把签到也办了 | 国内版一键替所有账号签到（国际版没这功能） |
| 装了就认，不装也能加 | 桌面 App 登录过就自动发现；也能自己粘贴 token 或导入备份批量加 |
| 坏号不耽误事 | 某个号没额度、被限流或掉登录，自动换下一个，对话不中断 |
| 登录到期不用管 | 快过期时自动续期 |
| 不想看的模型可以关掉 | 关掉只是不出现在选择列表里，已经在用它的对话不受影响 |
| 能选思考深度 | 上游支持档位的模型，在 DSH 里直接选 low / high / max 之类 |
| 能直接发图 | 支持图片的模型，粘贴图片就能发 |
| 能搬别的面板的账号 | 别的面板导出的账号文件，粘进来一次导入一批 |
| 不和别的插件打架 | 和已装的其他 WorkBuddy 插件各用各的，不会抢 |


## 安装

前置：已安装并登录 WorkBuddy 桌面 App（国内版或国际版均可）。插件复用 App 的登录状态，**零配置**即可用。

```sh
# 在 DSH profile 目录下
cd ~/.dsh/profiles/desktop
npm install dsh-hyperworkbuddy
```

然后在 `~/.dsh/profiles/desktop/package.json` 的 `dsh.profile.bundles` 数组里加上 `"dsh-hyperworkbuddy"`：

```json
{
  "dsh": {
    "profile": {
      "bundles": [
        "@deepseek-ai/dsh-base",
        "@deepseek-ai/dsh-web-app",
        "dsh-hyperworkbuddy"
      ]
    }
  }
}
```

**完全退出并重启 DSH**（新增 bundle 不会被热加载）。

从源码安装：

```sh
git clone https://github.com/ChaYeWuu/dsh-hyperworkbuddy.git
cd dsh-hyperworkbuddy
npm install
npm run build          # 产物在 lib/
```

## 使用

重启后打开 **设置 → WorkBuddy**，面板分四块：

1. **OpenAI 兼容端点**——一个**对外总开关**，外加 API Key 一键复制。
   关掉只停掉**对外**端点（释放端口），DSH 里的模型照常可用。
2. **国内版分区**——`WorkBuddy` 的账号与模型，带自己的对外端点地址（默认 `http://127.0.0.1:8791/v1`）。
3. **国际版分区**——`WorkBuddy AI` 的账号与模型，带自己的对外端点地址（默认 `http://127.0.0.1:8792/v1`）。
   两版的账号、模型、端口互不干扰：同名模型在两区走的是不同上游。
4. **导入区**——「重新扫描并刷新」「导入 hub 导出」「导入单个账号」。

每个分区可**折叠**，收起后只剩标题行。分区里：

- **账号**：显示来源、状态、积分（含套餐明细可展开）、模型数、到期时间，
  可单独刷新积分 / 刷新模型 / 停用 / 移除。所有操作都有进行中反馈。
- **模型开关**：每个模型一个复选框，另有「全部开启 / 全部关闭」。上游声明了推理档位的
  模型会在下面列出档位（`low / medium / high / xhigh / max`），默认档位高亮。

模型在 DSH 里分成两组：**WorkBuddy** 与 **WorkBuddy AI**。

### 用链接加账号

「链接登录」会向官方申请一条授权链接并自动在浏览器打开；你在浏览器里登录完成后，
插件自己把账号收进来，不需要手动复制 token：

1. 选版本 → 点「生成授权链接」（授权页会自动打开）
2. 在浏览器里完成登录
3. 回到面板，账号会自动出现（登录窗口 10 分钟）

### 一键刷新与一键签到

- **一键刷新**（每个分区都有）：刷新该版本**全部账号**的模型目录与积分。
- **一键签到**（仅国内版）：为全部账号签一次到，签完自动刷新积分。
  上游回 `10001`（今天已签）按成功处理。国际版没有签到体系，按钮不出现。

### 状态文件位置

账号与开关存在**宿主给的 home** 下（Desktop 版是 `~/.dsh/profiles/desktop/`）：

| 文件 | 内容 |
|---|---|
| `.hyperworkbuddy-accounts.json` | 账号池（**含明文 token**） |
| `.hyperworkbuddy-state.json` | 对外端点开关、逐模型开关 |
| `.hyperworkbuddy-endpoint-key` | 自动生成的对外 API Key |

> 早期版本把 home 解析成 `$DSH_HOME`（`~/.dsh`），与 Desktop 版不一致，
> 会让账号在两个文件间「分叉」。现在启动时会自动把账号更多的那份迁移过来，
> 并在原文件旁留一份 `.migrated-from-legacy` 备份。

### 两个端点的分工

插件给每个版本起**两个**端点，这是「关掉对外端点不影响 DSH」的实现方式：

| | 内部端点 | 对外端点 |
|---|---|---|
| 端口 | 随机（不占用配置端口） | 配置端口（8791 / 8792） |
| 鉴权 | 仅进程内密钥 | 面板里的 API Key |
| 用途 | DSH 自己的 provider | Codex / Claude Code 等外部客户端 |
| 开关 | 始终在跑 | **面板总开关** |

所以关掉总开关时：对外端口真的释放，外部客户端连不上；而 DSH 侧连的是内部端点，
模型选择器、对话、故障切换一切照常。

### 导入 hub 导出的账号

在「导入 hub 导出」里粘贴 [workbuddy2api-hub](https://github.com/ardeyouxipianyi/workbuddy2api-hub)
的导出 JSON 即可一次导入多个账号：

```json
{
  "format": "workbuddy-accounts",
  "version": 1,
  "accounts": [
    { "uid": "…", "nickname": "…", "domain": "www.workbuddy.cn", "accessToken": "…", "refreshToken": "…" }
  ]
}
```

也接受裸账号数组、单个账号对象、桌面 App 凭据（`{ auth, account }`），以及 cockpit 那类
snake_case 行（`access_token` / `refresh_token` / `expires_at`）。

导入规则：

- **区域以 token / 域名为准**，不信行里可能过期的 `realm` 字段——否则账号会被发到错误的上游。
- **易变字段一律丢弃**：别的机器上的冷却、错误、停用标记带过来只会把本地账号池弄坏。
- 逐行容错：某一行 token 不是 JWT 只会被跳过并报明原因，不影响同一文档里的其它账号。

### 多账号是怎么工作的

- **自动发现**：每 30 秒重扫桌面 App 的凭据文件，App 里换账号 DSH 侧自动跟随。
- **手动导入**：面板里粘贴 token，账号写入 `$DSH_HOME/.hyperworkbuddy-accounts.json`。
- **选取策略**：优先选「使用次数最少」的账号，同档次按游标轮转，避免把负载压在一个账号上。
- **失败切换**：某个账号遇到额度不足（402）/ 限流（429）/ 会话失效（401）/ 上游 5xx 时，**自动换下一个账号重试**，并对该账号做指数退避冷却（首次 60 秒，翻倍至 1 小时）。全部账号都失败时返回最后一个真实错误。
- **token 续期**：access token 临近过期（5 分钟）时自动用 refresh token 续期。
- **按版本隔离**：国内版端点只用国内版账号，国际版端点只用国际版账号。

### 外部客户端接入

把面板里对应分区复制的地址与 API Key 填进任意 OpenAI 兼容客户端：

```sh
# 国内版
export OPENAI_BASE_URL="http://127.0.0.1:8791/v1"
export OPENAI_API_KEY="面板里显示的那个 Key"

# 国际版
export OPENAI_BASE_URL="http://127.0.0.1:8792/v1"
```

模型名填模型选择器里看到的 id，如 `deepseek-v4.1-flash`。

> 端点**只监听 127.0.0.1**，并强制校验回环 Host 与 Origin。未显式配置 `apiKeys` 时，
> 插件会自动生成一把密钥（存于 `$DSH_HOME/.hyperworkbuddy-endpoint-key`）并在面板里显示，
> 而不是把端点对本机任意进程完全开放——否则任何本地程序都能花掉你的 WorkBuddy 额度。
> 要跨机使用，请自行在前面加一层带鉴权的反代。

## 配置

在 profile 的 `cordis.patch.yml` 里覆盖：

```yaml
- id: llm-hyperworkbuddy
  name: dsh-hyperworkbuddy
  config:
    port: 8791              # 国内版端点端口，0 表示随机
    portAI: 8792            # 国际版端点端口，0 表示随机
    endpointEnabled: true   # 端点总开关的初始值（之后可在面板里随时改）
    apiKeys: []             # 外部客户端使用的 Key；留空用自动生成的密钥
    hiddenModels: []        # 初始隐藏的模型 id（之后可在面板里逐个切换）
    followDesktop: true     # 是否自动跟随桌面 App 登录
```

> 端点总开关与逐模型开关在面板里改过之后，以面板为准并持久化在
> `$DSH_HOME/.hyperworkbuddy-state.json`；上面的配置只在首次运行时作为初始值。

## 验证安装

重启后按顺序确认：

1. **对外端点已起**——`http://127.0.0.1:8791/healthz` 与 `http://127.0.0.1:8792/healthz`
   应分别返回 `{"ok":true,"variant":"hyperworkbuddy",…}` 与 `…"hyperworkbuddy-ai"…`。
2. **provider 已注册**——打开 `http://127.0.0.1:19387/api-hyperworkbuddy/status`，
   检查 `variants[].providerRegistered` 均为 `true`。若为 `false`，同一条目里的
   `providerError` 会给出原因。
3. **设置里有入口**——打开 **设置**，左侧导航应出现 **WorkBuddy** 一项（一级菜单，
   与「模型」「插件」并列）。点击后是账号池与模型开关面板。

模型会以 **WorkBuddy** 与 **WorkBuddy AI** 两个分组出现在模型选择器里。

> 左侧导航的图标是设置齿轮：DSH 的设置外壳只为一小组内置 id（`models`、
> `agent-presets`、`plugins` 等）准备了专属图标，第三方分区一律回落到齿轮。

## 排查

| 现象 | 原因与处理 |
|---|---|
| 设置里没有 WorkBuddy | 没重启，或 bundle 未加进 `dsh.profile.bundles` |
| `providerRegistered: false` | 看该分区的 `providerError` |
| 模型列表为空 | 面板里点「重新扫描并刷新」；确认对应桌面 App 已登录 |
| 国际版账号不出现 | 国际版凭据是加密的，需在面板手动导入 accessToken（或导入 hub 导出） |
| 积分显示「未获取」 | 点该账号的「刷新积分」；仍失败时看账号卡片上的错误文案 |
| 分区里提示「对外端点未启动」 | 端口被占用，改配置里的 `port` / `portAI`，或设 `0` 用随机端口 |
| 关掉对外端点后模型还在 | 这是预期行为：关闭只影响外部客户端，DSH 侧不受影响 |

## 支持的产品

| 产品 | 区域 | 凭据文件 | 默认端点 | 状态 |
|---|---|---|---|---|
| **WorkBuddy**（国内版） | cn | `workbuddy-desktop.info` | `:8791` | ✅ 完整支持 |
| **WorkBuddy AI**（国际版） | global | `workbuddy-desktop-ai.info` | `:8792` | ⚠️ 见下 |

### 关于国际版的加密凭据

WorkBuddy AI 自 5.6.x 起把 `accessToken` 存成 `$wbEncrypted` 信封（AES-256-GCM），
解密密钥编译在桌面端原生模块里、磁盘上没有明文。**本插件不做进程内存读取**，
遇到加密凭据时会在面板里如实提示，请在面板中**手动导入 accessToken**，
或直接粘贴 hub 导出的账号文档。

国内版凭据是明文，自动发现开箱即用。

## 凭据与安全

- 桌面 App 的凭据文件**只读不写**——插件绝不修改 WorkBuddy 自己的登录状态。
- 手动导入的账号写入 `$DSH_HOME/.hyperworkbuddy-accounts.json`，**含明文 token**，请勿同步到公开位置。
- 端点密钥存于 `$DSH_HOME/.hyperworkbuddy-endpoint-key`；回环端点的进程内密钥仅存于内存，不落盘。
- 面板与端点都只接受回环请求。

## 已知限制

- 依赖 WorkBuddy 客户端私有接口（非官方开放 API），上游改动可能导致失效。
- 国际版目录走 App 界面接口，服务端按 User-Agent 分流，属私有实现，上游改动可能使其失效；此时保留上次成功目录并标明来源。
- 上游 chat **只接受流式**，非流式请求会被自动改写为流式。
- 国际版与国内版账号各自独立调度，暂不支持跨区域混合轮询。

## 开发

```sh
npm install
npm run build       # esbuild 打包 lib/index.js（host）与 lib/client.js（浏览器）
npm run typecheck   # 类型检查
```

仓库只包含插件本身与它的源码：`lib/` 是构建产物（从 GitHub 直接安装需要它），
`src/` 是源码。测试与 lockfile 属本地开发用，不进仓库。

源码结构：

```
src/
  index.ts        host 入口：按版本装配账号池、端点、provider 与管理路由
  accounts.ts     多账号池：存储、轮询、冷却、故障切换
  auth.ts         桌面凭据发现与解析（含加密信封识别）
  upstream.ts     WorkBuddy 上游 HTTP 客户端、错误分类与积分读取
  shim.ts         OpenAI 兼容回环端点（按版本隔离账号）
  adapter.ts      pi-ai provider 适配（每版本一个，含推理档位与图片接线）
  import.ts       workbuddy2api-hub 导出文档解析与导入
  state.ts        面板可改的运行时状态（对外端点开关、逐模型开关）
  variants.ts     国内版 / 国际版变体定义
  client/index.tsx  浏览器半边：settings.section 一级设置页
```

## 免责声明

- 本项目**仅供个人学习和研究使用**，仅驱动使用者自己的 WorkBuddy 账号在本机调用。
- 使用者需遵守 WorkBuddy 的服务条款；因使用本项目产生的任何后果由使用者自行承担。
- 本项目与腾讯、WorkBuddy、DeepSeek 均无关联，未获其授权或认可。

## 参考

- [workbuddy2api-hub](https://github.com/ardeyouxipianyi/workbuddy2api-hub) —— 多账号池、熔断退避与看板形态的参考。
- [dsh-workbuddy-connect](https://github.com/corrinehu/dsh-workbuddy-connect) —— WorkBuddy 上游协议与 pi-ai 适配路径的参考。

## 许可证

MIT
