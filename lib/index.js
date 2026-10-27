// src/index.ts
import { copyFile, mkdir as mkdir4, readFile as readFile4, writeFile as writeFile4 } from "node:fs/promises";
import { existsSync } from "node:fs";
import { dirname as dirname4, join as join5 } from "node:path";
import z from "@deepseek-ai/schemastery";
import { resolveImageAttachmentAccess } from "@deepseek-ai/dsh-llm";
import { resolveDshHome } from "@deepseek-ai/dsh-home-paths";

// src/accounts.ts
import { randomBytes } from "node:crypto";
import { mkdir, readFile as readFile2, rename, writeFile } from "node:fs/promises";
import { dirname, join as join2 } from "node:path";

// src/auth.ts
import { readFile } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";
var AUTH_DIR_SEGMENTS = ["CodeBuddyExtension", "Data", "Public", "auth"];
function authFileCandidates(filename) {
  const home = homedir();
  const out = [];
  const push = (...segments) => {
    const path = join(...segments);
    if (!out.includes(path)) out.push(path);
  };
  if (process.platform === "win32") {
    const local = process.env["LOCALAPPDATA"];
    const roaming = process.env["APPDATA"];
    if (local !== void 0 && local !== "") push(local, ...AUTH_DIR_SEGMENTS, filename);
    if (roaming !== void 0 && roaming !== "") push(roaming, ...AUTH_DIR_SEGMENTS, filename);
    push(home, "AppData", "Local", ...AUTH_DIR_SEGMENTS, filename);
    push(home, "AppData", "Roaming", ...AUTH_DIR_SEGMENTS, filename);
    return out;
  }
  if (process.platform === "darwin") {
    push(home, "Library", "Application Support", ...AUTH_DIR_SEGMENTS, filename);
    return out;
  }
  const configHome = process.env["XDG_CONFIG_HOME"];
  const dataHome = process.env["XDG_DATA_HOME"];
  if (configHome !== void 0 && configHome !== "") push(configHome, ...AUTH_DIR_SEGMENTS, filename);
  if (dataHome !== void 0 && dataHome !== "") push(dataHome, ...AUTH_DIR_SEGMENTS, filename);
  push(home, ".config", ...AUTH_DIR_SEGMENTS, filename);
  push(home, ".local", "share", ...AUTH_DIR_SEGMENTS, filename);
  return out;
}
function authFilePaths(variant) {
  const explicit = process.env[variant.env];
  if (explicit !== void 0 && explicit.trim() !== "") return [explicit.trim()];
  return authFileCandidates(variant.desktopFilename);
}
function asRecord(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value) ? value : void 0;
}
function asString(value) {
  return typeof value === "string" && value !== "" ? value : void 0;
}
function isEncryptedEnvelope(value) {
  const record = asRecord(value);
  return record !== void 0 && record["$wbEncrypted"] === 1;
}
function parseCredentialDocument(document, variant) {
  const root = asRecord(document);
  if (root === void 0) return { ok: false, reason: "\u51ED\u636E\u6587\u4EF6\u4E0D\u662F JSON \u5BF9\u8C61" };
  const auth = asRecord(root["auth"]) ?? root;
  const account = asRecord(root["account"]) ?? {};
  const rawToken = auth["accessToken"];
  if (isEncryptedEnvelope(rawToken)) {
    return {
      ok: false,
      reason: `${variant.appName} \u7684\u51ED\u636E\u5DF2\u52A0\u5BC6\uFF08$wbEncrypted\uFF09\uFF0C\u9700\u8981\u684C\u9762\u7AEF\u5BC6\u94A5\uFF1B\u8BF7\u5728\u9762\u677F\u4E2D\u624B\u52A8\u5BFC\u5165 accessToken`
    };
  }
  const accessToken = asString(rawToken);
  if (accessToken === void 0) return { ok: false, reason: "\u51ED\u636E\u91CC\u6CA1\u6709\u53EF\u7528\u7684 accessToken" };
  const refreshToken = asString(auth["refreshToken"]) ?? "";
  const uid = asString(account["uid"]) ?? "";
  const enterpriseId = asString(account["enterpriseId"]) ?? "";
  const domain = asString(auth["domain"]) ?? "";
  return {
    ok: true,
    credential: {
      variantId: variant.id,
      account: `${uid}:${enterpriseId}`,
      uid,
      enterpriseId,
      domain,
      nickname: asString(account["nickname"]) ?? "",
      accessToken,
      refreshToken,
      expiresAtMs: normalizeEpoch(auth["expiresAt"]),
      refreshExpiresAtMs: normalizeEpoch(auth["refreshExpiresAt"])
    }
  };
}
function normalizeEpoch(value) {
  const numeric = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(numeric) || numeric <= 0) return 0;
  return numeric <= 1e12 ? numeric * 1e3 : numeric;
}
async function readDesktopCredential(variant) {
  const paths = authFilePaths(variant);
  let lastMissing = "";
  for (const path of paths) {
    let text;
    try {
      text = await readFile(path, "utf8");
    } catch (error) {
      const code = error.code;
      if (code === "ENOENT") {
        lastMissing = path;
        continue;
      }
      return { ok: false, reason: `\u8BFB\u53D6\u51ED\u636E\u5931\u8D25\uFF1A${path}\uFF08${String(code ?? error)}\uFF09` };
    }
    let document;
    try {
      document = JSON.parse(text);
    } catch {
      return { ok: false, reason: `\u51ED\u636E\u6587\u4EF6\u4E0D\u662F\u5408\u6CD5 JSON\uFF1A${path}` };
    }
    return parseCredentialDocument(document, variant);
  }
  return {
    ok: false,
    reason: lastMissing === "" ? `${variant.appName} \u51ED\u636E\u8DEF\u5F84\u4E3A\u7A7A` : `\u672A\u627E\u5230 ${variant.appName} \u51ED\u636E\u6587\u4EF6\uFF1A${lastMissing}`
  };
}
function isExpiringSoon(credential, graceMs = 5 * 60 * 1e3) {
  if (credential.expiresAtMs <= 0) return false;
  return Date.now() + graceMs >= credential.expiresAtMs;
}

// src/variants.ts
var WORKBUDDY_VARIANTS = [
  {
    id: "hyperworkbuddy",
    displayName: "WorkBuddy",
    appName: "WorkBuddy",
    region: "cn",
    env: "WORKBUDDY_AUTH_FILE",
    desktopFilename: "workbuddy-desktop.info",
    chatBase: "https://copilot.tencent.com",
    billingBase: "https://www.codebuddy.cn",
    origin: "https://www.codebuddy.cn",
    loginUa: "WorkBuddy/5.5.6",
    hasCheckin: true,
    defaultClientVersion: "5.5.6"
  },
  {
    id: "hyperworkbuddy-ai",
    displayName: "WorkBuddy AI",
    appName: "WorkBuddy AI",
    region: "global",
    env: "WORKBUDDY_AI_AUTH_FILE",
    desktopFilename: "workbuddy-desktop-ai.info",
    chatBase: "https://www.workbuddy.ai",
    billingBase: "https://www.workbuddy.ai",
    origin: "https://www.workbuddy.ai",
    loginUa: "WorkBuddy/5.5.2",
    hasCheckin: false,
    defaultClientVersion: "5.5.2"
  }
];
var CN_VARIANT = WORKBUDDY_VARIANTS[0];
var AI_VARIANT = WORKBUDDY_VARIANTS[1];
function variantFor(id) {
  return WORKBUDDY_VARIANTS.find((variant) => variant.id === id);
}

// src/upstream.ts
import { randomUUID } from "node:crypto";
var EFFORT_VALUES = ["low", "medium", "high", "xhigh", "max"];
var HARD_CREDIT_MARKERS = [
  "insufficient credit",
  "no credit",
  "credit exhausted",
  "credits exhausted",
  "out of credit",
  "quota exceeded",
  "quota exhaust",
  "payment required",
  "credit not enough",
  "not enough credit",
  "\u79EF\u5206\u4E0D\u8DB3",
  "\u989D\u5EA6\u4E0D\u8DB3",
  "\u4F59\u989D\u4E0D\u8DB3",
  "\u79EF\u5206\u7528\u5B8C",
  "\u989D\u5EA6\u7528\u5C3D",
  "\u6CA1\u6709\u79EF\u5206"
];
var SESSION_DEAD_MARKERS = ["Offline user session not found", "12153"];
var INTERCEPTED_MARKERS = ["\u8BF7\u6C42\u88AB\u62E6\u622A", "\u8BF7\u91CD\u65B0\u53D1\u9001"];
var MODEL_MISSING_CODE = "11102";
var MODEL_MISSING_MARKER = "service info not found";
var ERROR_BODY_LIMIT = 4096;
var JSON_TIMEOUT_MS = 3e4;
function classifyUpstreamError(status, body) {
  if (status === 402) return "hard_credit";
  if (status === 401) return "session_dead";
  const lower = body.toLowerCase();
  for (const marker of HARD_CREDIT_MARKERS) {
    if (lower.includes(marker.toLowerCase()) || body.includes(marker)) return "hard_credit";
  }
  for (const marker of SESSION_DEAD_MARKERS) {
    if (body.includes(marker)) return "session_dead";
  }
  for (const marker of INTERCEPTED_MARKERS) {
    if (body.includes(marker)) return "intercepted";
  }
  if (status === 429) return "soft_rate";
  if (status === 404) return "not_found";
  if (status >= 500) return "server";
  return "client";
}
function extractDisplayErrorMessage(body) {
  const trimmed = body.trim();
  if (trimmed.startsWith("<")) {
    const title = /<title>([^<]{1,200})<\/title>/iu.exec(trimmed);
    if (title !== null) return title[1].trim();
    return void 0;
  }
  if (!trimmed.startsWith("{")) return void 0;
  try {
    const parsed = JSON.parse(trimmed);
    if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) return void 0;
    const obj = parsed;
    const displayMsg = obj["displayMsg"];
    if (typeof displayMsg === "object" && displayMsg !== null && !Array.isArray(displayMsg)) {
      const localized = displayMsg;
      const zh = localized["zh"];
      if (typeof zh === "string" && zh.trim() !== "") return zh.trim();
      const en = localized["en"];
      if (typeof en === "string" && en.trim() !== "") return en.trim();
    }
    const msg = obj["msg"];
    if (typeof msg === "string" && msg.trim() !== "") return msg.trim();
  } catch {
  }
  return void 0;
}
function regionOf(domain) {
  const lowered = domain.trim().toLowerCase();
  if (lowered === "workbuddy.ai" || lowered.endsWith(".workbuddy.ai")) return "global";
  return "cn";
}
function variantOfCredential(credential) {
  return regionOf(credential.domain) === "global" ? AI_VARIANT : CN_VARIANT;
}
function chatBase(credential) {
  return variantOfCredential(credential).chatBase;
}
function billingBase(credential) {
  return variantOfCredential(credential).billingBase;
}
function originReferer(credential) {
  return regionOf(credential.domain) === "global" ? variantOfCredential(credential).chatBase : variantOfCredential(credential).billingBase;
}
function commonHeaders(credential) {
  const referer = originReferer(credential);
  return {
    "Accept": "application/json, text/plain, */*",
    "X-Requested-With": "XMLHttpRequest",
    "Origin": referer,
    "Referer": `${referer}/`,
    "User-Agent": "CLI/2.63.2 CodeBuddy/2.63.2"
  };
}
function conversationHeaders() {
  return {
    "X-Conversation-ID": randomUUID(),
    "X-Conversation-Request-ID": randomUUID(),
    "X-Conversation-Message-ID": randomUUID()
  };
}
function chatHeaders(credential, userAgent, clientVersion) {
  return {
    ...commonHeaders(credential),
    ...conversationHeaders(),
    "User-Agent": userAgent,
    "Content-Type": "application/json",
    ...credential.uid === "" ? { "X-No-User-Id": "1" } : { "X-User-Id": credential.uid },
    ...credential.enterpriseId === "" ? { "X-No-Enterprise-Id": "1" } : { "X-Enterprise-Id": credential.enterpriseId },
    ...credential.domain === "" ? { "X-No-Department-Info": "1" } : { "X-Domain": credential.domain },
    "X-IDE-Type": "WorkBuddy",
    "X-IDE-Name": "WorkBuddy",
    "X-IDE-Version": clientVersion,
    "X-Product": "SaaS"
  };
}
function clientUserAgent(credential, clientVersion) {
  const variant = variantOfCredential(credential);
  const version = clientVersion ?? variant.defaultClientVersion;
  return variant.region === "global" ? `WorkBuddy/${version} WorkBuddy AI/${version} CLI/2.63.2` : `WorkBuddy/${version} WorkBuddy/${version} CLI/2.63.2`;
}
var CHANNEL_BLOCKED_PHRASES = [
  "You are an AI agent powered by DeepSeek Harness"
];
var BRAND_REWRITES = [
  // 不带冠词，免得「the DeepSeek Harness implementation」变成「the the ...」。
  [/DeepSeek Harness/g, "host application"]
];
var PARAGRAPH_REWRITES = [
  [
    "Tokens prefixed with @ are paths the user explicitly referenced.",
    "Tokens prefixed with @ point at paths the user explicitly referenced."
  ],
  [
    "Relative paths resolve from the workspace root",
    "Relative paths are resolved against the workspace root"
  ],
  [
    "whose URL the runtime context names",
    "whose URL is named in the runtime context"
  ]
];
function neutralizeChannelPhrases(text) {
  let output = text;
  for (const phrase of CHANNEL_BLOCKED_PHRASES) {
    if (output.includes(phrase)) output = output.split(phrase).join("You are a helpful assistant.");
  }
  for (const [from, to] of PARAGRAPH_REWRITES) {
    if (output.includes(from)) output = output.split(from).join(to);
  }
  for (const [pattern, replacement] of BRAND_REWRITES) output = output.replace(pattern, replacement);
  return output;
}
function prepareChatBody(raw, region) {
  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return raw;
  }
  const body = parsed;
  const messages = Array.isArray(body["messages"]) ? body["messages"] : [];
  for (const message of messages) {
    if (message["role"] === "developer") message["role"] = "system";
  }
  const toolChoice = body["tool_choice"];
  if (typeof toolChoice === "object" && toolChoice !== null) {
    const fn = toolChoice["function"];
    const name2 = typeof fn === "object" && fn !== null ? fn["name"] : void 0;
    body["tool_choice"] = typeof name2 === "string" ? "required" : "auto";
  }
  if (body["reasoning_effort"] === "off") delete body["reasoning_effort"];
  if (region === "global") {
    const first = messages[0];
    if (first === void 0 || first["role"] !== "system") {
      messages.unshift({ role: "system", content: "You are a helpful assistant." });
    }
  }
  for (const message of messages) {
    if (message["role"] !== "system") continue;
    if (typeof message["content"] === "string") {
      message["content"] = neutralizeChannelPhrases(message["content"]);
    }
  }
  body["messages"] = messages;
  body["stream"] = true;
  return JSON.stringify(body);
}
function modelOfBody(raw) {
  try {
    const parsed = JSON.parse(raw);
    const model = parsed["model"];
    return typeof model === "string" ? model : "";
  } catch {
    return "";
  }
}
async function readErrorBody(response) {
  try {
    const text = await response.text();
    return text.slice(0, ERROR_BODY_LIMIT);
  } catch {
    return "";
  }
}
async function chatCompletions(credential, rawBody, signal) {
  const region = regionOf(credential.domain);
  const prepared = prepareChatBody(rawBody, region);
  const url = `${chatBase(credential)}/v2/chat/completions`;
  let response;
  try {
    response = await fetch(url, {
      method: "POST",
      headers: {
        ...chatHeaders(credential, clientUserAgent(credential), variantOfCredential(credential).defaultClientVersion),
        "Authorization": `Bearer ${credential.accessToken}`
      },
      body: prepared,
      ...signal === void 0 ? {} : { signal }
    });
  } catch (error) {
    return { ok: false, status: 0, kind: "server", message: `\u8FDE\u63A5\u4E0A\u6E38\u5931\u8D25\uFF1A${String(error)}`, modelMissing: false };
  }
  if (!response.ok) {
    const body = await readErrorBody(response);
    const kind = classifyUpstreamError(response.status, body);
    const detail = extractDisplayErrorMessage(body) ?? `\u4E0A\u6E38\u8FD4\u56DE HTTP ${response.status}`;
    return {
      ok: false,
      status: response.status,
      kind,
      message: detail,
      modelMissing: response.status === 400 && (body.includes(MODEL_MISSING_CODE) || body.includes(MODEL_MISSING_MARKER))
    };
  }
  return { ok: true, response };
}
function toUpstreamModel(row) {
  const id = typeof row["id"] === "string" ? row["id"] : "";
  if (id === "") return void 0;
  if (row["disabled"] === true) return void 0;
  const maxInput = Number(row["maxInputTokens"] ?? 0);
  if (!Number.isFinite(maxInput) || maxInput <= 0) return void 0;
  const maxOutput = Number(row["maxOutputTokens"] ?? 0);
  const contextRaw = row["contextWindow"];
  let contextWindow = maxInput;
  let supportedContextWindows = [];
  if (typeof contextRaw === "object" && contextRaw !== null) {
    const box = contextRaw;
    const preferred = Number(box["defaultLength"] ?? 0);
    if (Number.isFinite(preferred) && preferred > 0) contextWindow = preferred;
    const lengths = box["supportedLengths"];
    if (Array.isArray(lengths)) {
      const positive = lengths.map((length) => Number(length)).filter((length) => Number.isFinite(length) && length > 0);
      supportedContextWindows = [...new Set(positive)].sort((a, b) => a - b);
    }
  } else if (Number.isFinite(contextRaw) && Number(contextRaw) > 0) {
    contextWindow = Number(contextRaw);
  }
  const reasoningRaw = typeof row["reasoning"] === "object" && row["reasoning"] !== null ? row["reasoning"] : {};
  const effortsRaw = reasoningRaw["supportedEfforts"];
  const supportedEfforts = Array.isArray(effortsRaw) ? effortsRaw.filter((v) => typeof v === "string" && EFFORT_VALUES.includes(v)) : [];
  const creditsRaw = row["credits"];
  const credits = typeof creditsRaw === "string" && creditsRaw.trim() !== "" ? creditsRaw.trim().replace(/\s+credits?$/iu, "").trim() : void 0;
  return {
    id,
    name: typeof row["name"] === "string" && row["name"] !== "" ? row["name"] : id,
    maxInputTokens: maxInput,
    contextWindow,
    supportedContextWindows,
    // 上游未声明输出上限时按输入窗口的三分之一估一个安全值，而不是报 0。
    maxTokens: Number.isFinite(maxOutput) && maxOutput > 0 ? maxOutput : Math.max(4096, Math.floor(contextWindow / 3)),
    supportsImages: row["supportsImages"] === true && row["disabledMultimodal"] !== true,
    reasoning: {
      supports: row["supportsReasoning"] === true || reasoningRaw["supportedEfforts"] !== void 0,
      onlyReasoning: reasoningRaw["onlyReasoning"] === true,
      ...supportedEfforts.length === 0 ? {} : { supportedEfforts },
      ...typeof reasoningRaw["defaultEffort"] === "string" ? { defaultEffort: reasoningRaw["defaultEffort"] } : {},
      canDisableThinking: reasoningRaw["canDisableThinking"] === true
    },
    billing: {
      ...credits === void 0 || credits === "" ? {} : { credits },
      free: credits !== void 0 && /^x?0(?:\.0+)?$/iu.test(credits)
    }
  };
}
function isRecord(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
function positiveNumber(value) {
  const num = Number(value);
  return Number.isFinite(num) && num > 0 ? num : void 0;
}
function parseUpstreamModel(value) {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return void 0;
  const row = value;
  const id = typeof row["id"] === "string" ? row["id"] : "";
  if (id === "") return void 0;
  const contextWindow = positiveNumber(row["contextWindow"]) ?? 0;
  const lengths = row["supportedContextWindows"];
  const supportedContextWindows = Array.isArray(lengths) ? [...new Set(lengths.map((n) => Number(n)).filter((n) => Number.isFinite(n) && n > 0))].sort((a, b) => a - b) : [];
  const reasoningRaw = isRecord(row["reasoning"]) ? row["reasoning"] : {};
  const effortsRaw = reasoningRaw["supportedEfforts"];
  const supportedEfforts = Array.isArray(effortsRaw) ? effortsRaw.filter((v) => typeof v === "string" && EFFORT_VALUES.includes(v)) : [];
  const billingRaw = isRecord(row["billing"]) ? row["billing"] : {};
  const credits = typeof billingRaw["credits"] === "string" && billingRaw["credits"] !== "" ? billingRaw["credits"] : void 0;
  return {
    id,
    name: typeof row["name"] === "string" && row["name"] !== "" ? row["name"] : id,
    maxInputTokens: positiveNumber(row["maxInputTokens"]) ?? contextWindow,
    contextWindow,
    supportedContextWindows,
    maxTokens: positiveNumber(row["maxTokens"]) ?? 0,
    supportsImages: row["supportsImages"] === true,
    reasoning: {
      supports: reasoningRaw["supports"] === true,
      onlyReasoning: reasoningRaw["onlyReasoning"] === true,
      ...supportedEfforts.length === 0 ? {} : { supportedEfforts },
      ...typeof reasoningRaw["defaultEffort"] === "string" ? { defaultEffort: reasoningRaw["defaultEffort"] } : {},
      canDisableThinking: reasoningRaw["canDisableThinking"] === true
    },
    billing: {
      ...credits === void 0 ? {} : { credits },
      free: billingRaw["free"] === true
    }
  };
}
function resolveContextWindow(info, useMaximum) {
  const declared = info.contextWindow;
  if (!useMaximum) return declared;
  const tiers = Array.isArray(info.supportedContextWindows) ? info.supportedContextWindows : [];
  const ceiling = Number.isFinite(info.maxInputTokens) && info.maxInputTokens > 0 ? info.maxInputTokens : declared;
  const larger = tiers.filter((length) => length > declared && length <= ceiling);
  return larger.length === 0 ? declared : Math.max(...larger);
}
async function fetchCatalog(credential) {
  const variant = variantOfCredential(credential);
  const url = `${chatBase(credential)}/v3/config`;
  const headers = {
    ...commonHeaders(credential),
    "Authorization": `Bearer ${credential.accessToken}`
  };
  if (variant.region === "global") {
    headers["User-Agent"] = `WorkBuddyAI/${variant.defaultClientVersion}`;
    headers["X-Requested-With"] = "XMLHttpRequest";
    headers["X-Product"] = "SaaS";
  } else {
    headers["User-Agent"] = "CLI/2.63.2 CodeBuddy/2.63.2";
    delete headers["X-Requested-With"];
  }
  const response = await fetch(url, { headers, signal: AbortSignal.timeout(JSON_TIMEOUT_MS) });
  const text = await response.text();
  if (!response.ok) {
    const kind = classifyUpstreamError(response.status, text);
    const detail = extractDisplayErrorMessage(text) ?? `HTTP ${response.status}`;
    throw new Error(`\u76EE\u5F55\u62C9\u53D6\u5931\u8D25\uFF08${kind}\uFF09\uFF1A${detail}`);
  }
  let document;
  try {
    document = JSON.parse(text);
  } catch {
    throw new Error("\u76EE\u5F55\u54CD\u5E94\u4E0D\u662F\u5408\u6CD5 JSON");
  }
  const root = document;
  const data = typeof root["data"] === "object" && root["data"] !== null ? root["data"] : root;
  const agents = Array.isArray(data["agents"]) ? data["agents"] : [];
  const cli = agents.find((agent) => agent["name"] === "cli");
  const ids = cli !== void 0 && Array.isArray(cli["models"]) ? cli["models"].filter((id) => typeof id === "string" && id !== "") : [];
  if (ids.length === 0) throw new Error("\u76EE\u5F55\u91CC\u6CA1\u6709 cli \u6A21\u578B\u540D\u5355");
  const rows = Array.isArray(data["models"]) ? data["models"] : [];
  const byId = /* @__PURE__ */ new Map();
  for (const row of rows) {
    const id = row["id"];
    if (typeof id === "string" && id !== "") byId.set(id, row);
  }
  const out = [];
  for (const id of ids) {
    const row = byId.get(id);
    if (row === void 0) continue;
    const model = toUpstreamModel(row);
    if (model !== void 0) out.push(model);
  }
  return out;
}
function billingHeaders(credential) {
  const headers = {
    "Authorization": `Bearer ${credential.accessToken}`,
    "Accept": "application/json",
    "Content-Type": "application/json"
  };
  if (credential.uid !== "") headers["X-User-Id"] = credential.uid;
  if (credential.enterpriseId !== "") {
    headers["X-Enterprise-Id"] = credential.enterpriseId;
    headers["X-Tenant-Id"] = credential.enterpriseId;
  }
  if (credential.domain !== "") headers["X-Domain"] = credential.domain;
  return headers;
}
async function readEnvelope(response, what) {
  const text = await response.text();
  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error(`${what}\uFF1A\u4E0A\u6E38\u8FD4\u56DE\u975E JSON\uFF08HTTP ${response.status}\uFF09`);
  }
  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    throw new Error(`${what}\uFF1A\u4E0A\u6E38\u8FD4\u56DE\u4E86\u975E\u9884\u671F\u7684\u6587\u6863\uFF08HTTP ${response.status}\uFF09`);
  }
  const document = parsed;
  return {
    code: typeof document["code"] === "number" ? document["code"] : 0,
    msg: typeof document["msg"] === "string" ? document["msg"] : "",
    data: document["data"]
  };
}
function formatLocalTime(date) {
  const pad = (n, width = 2) => String(n).padStart(width, "0");
  const day = `${pad(date.getFullYear(), 4)}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
  const time = `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
  return `${day} ${time}`;
}
async function fetchCredits(credential) {
  if (regionOf(credential.domain) === "cn" && credential.enterpriseId !== "") {
    return await fetchEnterpriseCredits(credential);
  }
  const now = /* @__PURE__ */ new Date();
  const response = await fetch(`${billingBase(credential)}/v2/billing/meter/get-user-resource`, {
    method: "POST",
    headers: billingHeaders(credential),
    body: JSON.stringify({
      PageNumber: 1,
      PageSize: 100,
      ProductCode: "p_tcaca",
      Status: [0, 3],
      // 上游要求带套餐到期时间范围；漏掉会拿不到任何套餐。
      PackageEndTimeRangeBegin: formatLocalTime(now),
      PackageEndTimeRangeEnd: formatLocalTime(new Date(now.getTime() + 365 * 101 * 24 * 3600 * 1e3))
    }),
    signal: AbortSignal.timeout(JSON_TIMEOUT_MS)
  });
  const envelope = await readEnvelope(response, "\u79EF\u5206\u8BFB\u53D6\u5931\u8D25");
  if (!response.ok) {
    const kind = classifyUpstreamError(response.status, JSON.stringify(envelope));
    throw new Error(`\u79EF\u5206\u8BFB\u53D6\u5931\u8D25\uFF08${kind}\uFF09\uFF1A${envelope.msg || `HTTP ${response.status}`}`);
  }
  if (envelope.code !== 0) {
    throw new Error(`\u79EF\u5206\u8BFB\u53D6\u5931\u8D25\uFF08code ${envelope.code}\uFF09\uFF1A${envelope.msg || "\u4E0A\u6E38\u672A\u8BF4\u660E\u539F\u56E0"}`);
  }
  return parseCredits(envelope.data, false);
}
async function fetchEnterpriseCredits(credential) {
  const response = await fetch(`${billingBase(credential)}/v2/billing/meter/get-enterprise-user-usage`, {
    method: "POST",
    headers: billingHeaders(credential),
    body: "{}",
    signal: AbortSignal.timeout(JSON_TIMEOUT_MS)
  });
  const envelope = await readEnvelope(response, "\u4F01\u4E1A\u79EF\u5206\u8BFB\u53D6\u5931\u8D25");
  if (!response.ok) {
    const kind = classifyUpstreamError(response.status, JSON.stringify(envelope));
    throw new Error(`\u4F01\u4E1A\u79EF\u5206\u8BFB\u53D6\u5931\u8D25\uFF08${kind}\uFF09\uFF1A${envelope.msg || `HTTP ${response.status}`}`);
  }
  if (envelope.code !== 0) {
    throw new Error(`\u4F01\u4E1A\u79EF\u5206\u8BFB\u53D6\u5931\u8D25\uFF08code ${envelope.code}\uFF09\uFF1A${envelope.msg || "\u4E0A\u6E38\u672A\u8BF4\u660E\u539F\u56E0"}`);
  }
  return parseCredits(envelope.data, true);
}
function parseCredits(document, enterprise) {
  const root = typeof document === "object" && document !== null ? document : {};
  if (enterprise) {
    const pick2 = (...keys) => {
      for (const key of keys) {
        const value = Number(root[key]);
        if (Number.isFinite(value)) return value;
      }
      return Number.NaN;
    };
    const limit = pick2("limitNum", "limit_num");
    const used = pick2("credit", "used_num");
    if (!Number.isFinite(limit) && !Number.isFinite(used)) {
      throw new Error("\u4F01\u4E1A\u79EF\u5206\u54CD\u5E94\u7F3A\u5C11\u53EF\u8BC6\u522B\u5B57\u6BB5\uFF08limitNum/limit_num \u4E0E credit/used_num\uFF09");
    }
    const unlimited = limit === -1;
    const remaining2 = unlimited || !Number.isFinite(limit) || !Number.isFinite(used) ? void 0 : Math.max(0, limit - used);
    return {
      ...unlimited || !Number.isFinite(limit) ? {} : { total: limit },
      ...remaining2 === void 0 ? {} : { remaining: remaining2 },
      packages: [{
        name: "\u4F01\u4E1A\u989D\u5EA6",
        ...unlimited || !Number.isFinite(limit) ? {} : { size: limit },
        ...remaining2 === void 0 ? {} : { remain: remaining2 }
      }]
    };
  }
  const wrapper = typeof root["Response"] === "object" && root["Response"] !== null ? root["Response"] : root;
  const inner = typeof wrapper["Data"] === "object" && wrapper["Data"] !== null ? wrapper["Data"] : {};
  const rows = Array.isArray(inner["Accounts"]) ? inner["Accounts"] : [];
  const num = (source, key) => typeof source[key] === "number" ? source[key] : 0;
  let remaining = 0;
  let total = 0;
  const packages = [];
  for (const raw of rows) {
    if (typeof raw !== "object" || raw === null) continue;
    const account = raw;
    const size = num(account, "CycleCapacitySize");
    const cycleRemain = num(account, "CycleCapacityRemain");
    const cycleUsed = num(account, "CycleCapacityUsed");
    const capacityRemain = num(account, "CapacityRemain");
    const remain = Math.max(0, size > 0 || cycleRemain > 0 || cycleUsed > 0 ? cycleRemain : capacityRemain);
    const packageSize = size > 0 ? size : num(account, "CapacitySize");
    remaining += remain;
    total += packageSize;
    packages.push({
      name: typeof account["PackageName"] === "string" ? account["PackageName"] : "(\u672A\u547D\u540D)",
      remain,
      size: packageSize
    });
  }
  return { remaining, total, packages };
}
var LOGIN_PENDING = 11217;
var CHECKIN_ALREADY = 10001;
function loginHeaders(variant, token) {
  const headers = {
    "Content-Type": "application/json",
    "Accept": "application/json, text/plain, */*",
    "X-Requested-With": "XMLHttpRequest",
    "User-Agent": variant.loginUa,
    "Origin": variant.origin,
    "Referer": `${variant.origin}/`
  };
  if (token !== void 0 && token !== "") headers["Authorization"] = `Bearer ${token}`;
  return headers;
}
async function startLogin(variant) {
  const url = `${variant.chatBase}/v2/plugin/auth/state?platform=${encodeURIComponent("CLI")}`;
  const response = await fetch(url, {
    method: "POST",
    headers: loginHeaders(variant),
    body: "{}",
    signal: AbortSignal.timeout(JSON_TIMEOUT_MS)
  });
  const envelope = await readEnvelope(response, "\u53D1\u8D77\u767B\u5F55\u5931\u8D25");
  if (!response.ok || envelope.code !== 0) {
    throw new Error(`\u53D1\u8D77\u767B\u5F55\u5931\u8D25\uFF08code ${envelope.code}\uFF09\uFF1A${envelope.msg || `HTTP ${response.status}`}`);
  }
  const data = typeof envelope.data === "object" && envelope.data !== null ? envelope.data : {};
  const state = typeof data["state"] === "string" ? data["state"] : "";
  const authUrl = typeof data["authUrl"] === "string" ? data["authUrl"] : "";
  if (state === "" || authUrl === "") throw new Error("\u6388\u6743\u63A5\u53E3\u6CA1\u6709\u8FD4\u56DE state / authUrl");
  return { state, authUrl };
}
async function pollLogin(variant, state) {
  const url = `${variant.chatBase}/v2/plugin/auth/token?state=${encodeURIComponent(state)}`;
  let envelope;
  try {
    const response = await fetch(url, { method: "GET", headers: loginHeaders(variant), signal: AbortSignal.timeout(JSON_TIMEOUT_MS) });
    envelope = await readEnvelope(response, "\u767B\u5F55\u8F6E\u8BE2\u5931\u8D25");
  } catch (error) {
    return { status: "pending", message: `\u8F6E\u8BE2\u51FA\u9519\uFF1A${String(error)}` };
  }
  if (envelope.code === LOGIN_PENDING) {
    return { status: "pending", message: envelope.msg || "\u7B49\u5F85\u6D4F\u89C8\u5668\u5B8C\u6210\u6388\u6743" };
  }
  if (envelope.code !== 0) {
    return { status: "error", message: `code ${envelope.code}\uFF1A${envelope.msg || "\u4E0A\u6E38\u672A\u8BF4\u660E\u539F\u56E0"}` };
  }
  const data = typeof envelope.data === "object" && envelope.data !== null ? envelope.data : {};
  const accessToken = typeof data["accessToken"] === "string" ? data["accessToken"] : "";
  if (accessToken === "") return { status: "pending", message: "\u7B49\u5F85\u4EE4\u724C\u4E0B\u53D1" };
  const uid = jwtUid(accessToken);
  const nickname = await fetchLoginNickname(variant, state, accessToken).catch(() => "");
  const enterpriseId = typeof data["enterpriseId"] === "string" ? data["enterpriseId"] : "";
  return {
    status: "ok",
    credential: {
      variantId: variant.id,
      account: `${uid}:${enterpriseId}`,
      uid,
      enterpriseId,
      domain: typeof data["domain"] === "string" && data["domain"] !== "" ? data["domain"] : variant.origin.replace("https://", ""),
      nickname,
      accessToken,
      refreshToken: typeof data["refreshToken"] === "string" ? data["refreshToken"] : "",
      expiresAtMs: normalizeEpoch(data["expiresAt"]),
      refreshExpiresAtMs: 0
    }
  };
}
async function fetchLoginNickname(variant, state, token) {
  const url = `${variant.chatBase}/v2/plugin/login/account?state=${encodeURIComponent(state)}`;
  const response = await fetch(url, { method: "GET", headers: loginHeaders(variant, token), signal: AbortSignal.timeout(JSON_TIMEOUT_MS) });
  const text = await response.text();
  const parsed = JSON.parse(text);
  const data = typeof parsed["data"] === "object" && parsed["data"] !== null ? parsed["data"] : {};
  return typeof data["nickname"] === "string" ? data["nickname"] : "";
}
function jwtUid(token) {
  const segments = token.split(".");
  if (segments.length !== 3) return "";
  try {
    const payload = JSON.parse(Buffer.from(segments[1], "base64url").toString("utf8"));
    for (const key of ["uid", "sub", "user_id", "userId"]) {
      const value = payload[key];
      if (typeof value === "string" && value !== "") return value;
    }
  } catch {
  }
  return "";
}
async function checkin(credential) {
  const variant = variantOfCredential(credential);
  if (variant.region !== "cn") {
    return { ok: false, code: -1, message: "\u7B7E\u5230\u53EA\u6709\u56FD\u5185\u7248\u8D26\u53F7\u652F\u6301" };
  }
  const response = await fetch(`${variant.billingBase}/v2/billing/meter/daily-checkin`, {
    method: "POST",
    headers: billingHeaders(credential),
    body: "{}",
    signal: AbortSignal.timeout(JSON_TIMEOUT_MS)
  });
  let envelope;
  try {
    envelope = await readEnvelope(response, "\u7B7E\u5230\u5931\u8D25");
  } catch (error) {
    return { ok: false, code: -1, message: String(error) };
  }
  const ok = envelope.code === 0 || envelope.code === CHECKIN_ALREADY;
  return {
    ok,
    code: envelope.code,
    message: envelope.msg !== "" ? envelope.msg : ok ? "\u7B7E\u5230\u6210\u529F" : `HTTP ${response.status}`
  };
}
async function probeEfforts(credential, modelId, signal) {
  const detail = [];
  const accepted = [];
  for (const effort of EFFORT_VALUES) {
    const body = JSON.stringify({
      model: modelId,
      stream: true,
      messages: [{ role: "user", content: "ping" }],
      // 探测只关心参数是否被接受，把开销压到最小。
      max_tokens: 1,
      reasoning_effort: effort
    });
    const result = await chatCompletions(credential, body, signal);
    if (result.ok) {
      try {
        await result.response.body?.cancel();
      } catch {
      }
      accepted.push(effort);
      detail.push({ effort, accepted: true, reason: "\u4E0A\u6E38\u63A5\u53D7" });
      continue;
    }
    if (result.kind === "soft_rate" || result.kind === "hard_credit" || result.kind === "session_dead") {
      detail.push({ effort, accepted: false, reason: `\u63A2\u6D4B\u4E2D\u6B62\uFF1A${result.message}` });
      return { accepted, detail, aborted: result.kind };
    }
    const rejected = result.status === 400 && /reasoning|effort|11133/i.test(result.message);
    detail.push({
      effort,
      accepted: false,
      reason: rejected ? `\u4E0A\u6E38\u62D2\u7EDD\u8BE5\u6863\u4F4D\uFF1A${result.message}` : `\u672A\u9A8C\u8BC1\uFF08${result.kind}\uFF09\uFF1A${result.message}`
    });
  }
  return { accepted, detail, aborted: "" };
}
var PROBE_MODEL_ID = "deepseek-v4.1-flash";
async function probeAccount(credential, fallbacks = [], signal) {
  const candidates = [PROBE_MODEL_ID, ...fallbacks.filter((id) => id !== "" && id !== PROBE_MODEL_ID)];
  let result = {
    ok: false,
    status: 0,
    model: PROBE_MODEL_ID,
    kind: "server",
    message: "\u6CA1\u6709\u53EF\u7528\u7684\u63A2\u6D4B\u6A21\u578B"
  };
  for (const model of candidates) {
    const body = JSON.stringify({
      model,
      stream: true,
      messages: [{ role: "user", content: "ping" }],
      max_tokens: 1
    });
    const outcome = await chatCompletions(credential, body, signal);
    if (outcome.ok) {
      try {
        await outcome.response.body?.cancel();
      } catch {
      }
      return { ok: true, status: outcome.response.status, model, kind: "", message: "\u51ED\u636E\u53EF\u7528" };
    }
    result = { ok: false, status: outcome.status, model, kind: outcome.kind, message: outcome.message };
    if (!outcome.modelMissing) return result;
  }
  return result;
}
async function refreshAccessToken(credential) {
  const url = `${chatBase(credential)}/v2/plugin/auth/token/refresh`;
  const headers = {
    ...commonHeaders(credential),
    "X-Refresh-Token": credential.refreshToken,
    "X-Auth-Refresh-Source": "workbuddy"
  };
  if (credential.enterpriseId !== "") headers["X-Enterprise-Id"] = credential.enterpriseId;
  const response = await fetch(url, { method: "POST", headers, signal: AbortSignal.timeout(JSON_TIMEOUT_MS) });
  const text = await response.text();
  if (!response.ok) throw new Error(`\u5237\u65B0 token \u5931\u8D25\uFF08HTTP ${response.status}\uFF09\uFF1A${text.slice(0, 200)}`);
  let document;
  try {
    document = JSON.parse(text);
  } catch {
    throw new Error("\u5237\u65B0\u54CD\u5E94\u4E0D\u662F\u5408\u6CD5 JSON");
  }
  const root = document;
  const data = typeof root["data"] === "object" && root["data"] !== null ? root["data"] : root;
  const accessToken = typeof data["accessToken"] === "string" ? data["accessToken"] : "";
  if (accessToken === "") throw new Error("\u5237\u65B0\u54CD\u5E94\u91CC\u6CA1\u6709 accessToken");
  return {
    accessToken,
    ...typeof data["refreshToken"] === "string" && data["refreshToken"] !== "" ? { refreshToken: data["refreshToken"] } : {},
    ...Number.isFinite(Number(data["expiresIn"])) ? { expiresInSec: Number(data["expiresIn"]) } : {},
    ...typeof data["domain"] === "string" && data["domain"] !== "" ? { domain: data["domain"] } : {}
  };
}

// src/accounts.ts
var ACCOUNTS_FILENAME = ".hyperworkbuddy-accounts.json";
var ENDPOINT_KEY_FILENAME = ".hyperworkbuddy-endpoint-key";
function makeEndpointKey() {
  return `hwb-${randomBytes(24).toString("base64url")}`;
}
async function writeEndpointKey(homeDir, key) {
  const path = join2(homeDir, ENDPOINT_KEY_FILENAME);
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, key, { encoding: "utf8", mode: 384 });
}
async function ensureEndpointKey(homeDir) {
  const path = join2(homeDir, ENDPOINT_KEY_FILENAME);
  try {
    const existing = (await readFile2(path, "utf8")).trim();
    if (existing !== "") return existing;
  } catch {
  }
  const key = makeEndpointKey();
  await writeEndpointKey(homeDir, key);
  return key;
}
async function resetEndpointKey(homeDir, custom) {
  const key = custom !== void 0 && custom.trim() !== "" ? custom.trim() : makeEndpointKey();
  await writeEndpointKey(homeDir, key);
  return key;
}
var COOLDOWN_BASE_MS = 6e4;
var COOLDOWN_MAX_MS = 36e5;
var PROBE_RETRYABLE_KINDS = /* @__PURE__ */ new Set(["hard_credit", "soft_rate", "session_dead", "server"]);
var STICKY_MAX_ENTRIES = 4096;
var CREDITS_TTL_MS = 10 * 60 * 1e3;
function accountsPath(homeDir) {
  return join2(homeDir, ACCOUNTS_FILENAME);
}
function isRecord2(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
function parseCredits2(value) {
  if (!isRecord2(value)) return void 0;
  const packages = [];
  if (Array.isArray(value["packages"])) {
    for (const raw of value["packages"]) {
      if (!isRecord2(raw)) continue;
      packages.push({
        name: typeof raw["name"] === "string" ? raw["name"] : "(\u672A\u547D\u540D)",
        ...Number.isFinite(Number(raw["remain"])) ? { remain: Number(raw["remain"]) } : {},
        ...Number.isFinite(Number(raw["size"])) ? { size: Number(raw["size"]) } : {}
      });
    }
  }
  const remaining = Number(value["remaining"]);
  const total = Number(value["total"]);
  if (!Number.isFinite(remaining) && !Number.isFinite(total) && packages.length === 0) return void 0;
  return {
    ...Number.isFinite(remaining) ? { remaining } : {},
    ...Number.isFinite(total) ? { total } : {},
    packages
  };
}
function parseAccount(value) {
  if (!isRecord2(value)) return void 0;
  const account = typeof value["account"] === "string" ? value["account"] : "";
  const accessToken = typeof value["accessToken"] === "string" ? value["accessToken"] : "";
  if (account === "" || accessToken === "") return void 0;
  const variantId = typeof value["variantId"] === "string" ? value["variantId"] : "";
  if (variantId === "") return void 0;
  const credits = parseCredits2(value["credits"]);
  return {
    account,
    variantId,
    source: value["source"] === "manual" ? "manual" : "desktop",
    nickname: typeof value["nickname"] === "string" ? value["nickname"] : "",
    domain: typeof value["domain"] === "string" ? value["domain"] : "",
    accessToken,
    refreshToken: typeof value["refreshToken"] === "string" ? value["refreshToken"] : "",
    expiresAtMs: Number.isFinite(Number(value["expiresAtMs"])) ? Number(value["expiresAtMs"]) : 0,
    refreshExpiresAtMs: Number.isFinite(Number(value["refreshExpiresAtMs"])) ? Number(value["refreshExpiresAtMs"]) : 0,
    disabled: value["disabled"] === true,
    cooldownUntilMs: 0,
    failStreak: 0,
    lastError: "",
    lastUsedAtMs: 0,
    // 缓存读回来，重启后不必为看一眼余额就重新请求全部账号。
    ...credits === void 0 ? {} : { credits },
    creditsAtMs: Number.isFinite(Number(value["creditsAtMs"])) ? Number(value["creditsAtMs"]) : 0,
    models: Array.isArray(value["models"]) ? value["models"].map(parseUpstreamModel).filter((m) => m !== void 0) : [],
    modelsAtMs: Number.isFinite(Number(value["modelsAtMs"])) ? Number(value["modelsAtMs"]) : 0,
    catalogSource: "saved",
    catalogError: ""
  };
}
async function persist(path, accounts) {
  const document = { version: 1, accounts };
  await mkdir(dirname(path), { recursive: true });
  const temp = `${path}.${process.pid}.tmp`;
  await writeFile(temp, JSON.stringify(document, null, 2), "utf8");
  await rename(temp, path);
}
function toCredential(account) {
  return {
    variantId: account.variantId,
    account: account.account,
    uid: account.account.split(":")[0] ?? "",
    enterpriseId: account.account.split(":")[1] ?? "",
    domain: account.domain,
    nickname: account.nickname,
    accessToken: account.accessToken,
    refreshToken: account.refreshToken,
    expiresAtMs: account.expiresAtMs,
    refreshExpiresAtMs: account.refreshExpiresAtMs
  };
}
function fromCredential(credential, source) {
  return {
    account: credential.account,
    variantId: credential.variantId,
    source,
    nickname: credential.nickname,
    domain: credential.domain,
    accessToken: credential.accessToken,
    refreshToken: credential.refreshToken,
    expiresAtMs: credential.expiresAtMs,
    refreshExpiresAtMs: credential.refreshExpiresAtMs,
    disabled: false,
    cooldownUntilMs: 0,
    failStreak: 0,
    lastError: "",
    lastUsedAtMs: 0,
    creditsAtMs: 0,
    models: [],
    modelsAtMs: 0,
    catalogSource: "saved",
    catalogError: ""
  };
}
var AccountPool = class {
  accounts = [];
  path;
  /** 轮转游标，保证同优先级账号被轮流使用。 */
  cursor = 0;
  /** 最近一次刷新错误，供面板展示。 */
  lastRefreshError = "";
  /**
   * 会话亲和表：会话键 → `账号|变体`。
   *
   * 上游的 prompt cache 是按账号隔离的，同一段对话中途换号会把已有缓存全部作废。
   * 所以一旦某个会话在某个账号上成功过，后续请求就尽量留在那个账号上。
   */
  sticky = /* @__PURE__ */ new Map();
  constructor(homeDir) {
    this.path = accountsPath(homeDir);
  }
  /** 从磁盘加载手动导入的账号。 */
  async load() {
    let text;
    try {
      text = await readFile2(this.path, "utf8");
    } catch {
      this.accounts = [];
      return;
    }
    try {
      const document = JSON.parse(text);
      const rows = isRecord2(document) && Array.isArray(document["accounts"]) ? document["accounts"] : Array.isArray(document) ? document : [];
      this.accounts = rows.map(parseAccount).filter((a) => a !== void 0);
    } catch {
      this.accounts = [];
    }
  }
  /** 当前账号快照（浅拷贝，避免外部直接改内部状态）。 */
  list() {
    return this.accounts.map((account) => ({ ...account }));
  }
  /** 最近一次桌面凭据刷新失败原因；空串表示没有错误。 */
  get refreshError() {
    return this.lastRefreshError;
  }
  /** 手动导入或覆盖一条账号。 */
  async upsert(credential) {
    const existing = this.accounts.find((account) => account.account === credential.account && account.variantId === credential.variantId);
    if (existing === void 0) {
      this.accounts.push(fromCredential(credential, "manual"));
    } else {
      Object.assign(existing, {
        accessToken: credential.accessToken,
        refreshToken: credential.refreshToken,
        domain: credential.domain,
        nickname: credential.nickname,
        expiresAtMs: credential.expiresAtMs,
        refreshExpiresAtMs: credential.refreshExpiresAtMs,
        source: "manual",
        cooldownUntilMs: 0,
        failStreak: 0,
        lastError: ""
      });
    }
    await this.persist();
  }
  /** 删除一条账号；桌面发现的账号删掉后会在下次扫描时回来。 */
  async remove(account, variantId) {
    const before = this.accounts.length;
    this.accounts = this.accounts.filter((a) => !(a.account === account && a.variantId === variantId));
    if (this.accounts.length === before) return false;
    await this.persist();
    return true;
  }
  /** 启用 / 停用一条账号。 */
  async setDisabled(account, variantId, disabled) {
    const target = this.accounts.find((a) => a.account === account && a.variantId === variantId);
    if (target === void 0) return false;
    target.disabled = disabled;
    if (!disabled) {
      target.cooldownUntilMs = 0;
      target.failStreak = 0;
      target.lastError = "";
    }
    await this.persist();
    return true;
  }
  /**
   * 重新扫描桌面 App 登录，并合并进池。
   *
   * 桌面来源的账号每次扫描都以最新凭据覆盖（App 会自己刷新 token），但保留
   * 用户的停用状态与冷却计数。手动导入的账号不被桌面扫描覆盖。
   */
  async refreshFromDesktop() {
    const errors = [];
    let changed = false;
    for (const variant of WORKBUDDY_VARIANTS) {
      const result = await readDesktopCredential(variant);
      if (!result.ok) {
        errors.push(result.reason);
        continue;
      }
      const credential = result.credential;
      if (credential.account === ":") continue;
      const existing = this.accounts.find((a) => a.account === credential.account && a.variantId === variant.id);
      if (existing === void 0) {
        this.accounts.push(fromCredential(credential, "desktop"));
        changed = true;
        continue;
      }
      if (existing.source === "manual") continue;
      const tokenChanged = existing.accessToken !== credential.accessToken;
      Object.assign(existing, {
        accessToken: credential.accessToken,
        refreshToken: credential.refreshToken,
        domain: credential.domain,
        nickname: credential.nickname,
        expiresAtMs: credential.expiresAtMs,
        refreshExpiresAtMs: credential.refreshExpiresAtMs
      });
      if (tokenChanged) {
        existing.cooldownUntilMs = 0;
        existing.failStreak = 0;
        existing.lastError = "";
        changed = true;
      }
    }
    this.lastRefreshError = errors.join("\uFF1B");
    if (changed) await this.persist();
  }
  /** 可用于请求的账号：启用、未冷却、凭据未过期。 */
  available(variantId) {
    const now = Date.now();
    return this.accounts.filter(
      (account) => !account.disabled && account.cooldownUntilMs <= now && account.accessToken !== "" && (variantId === void 0 || account.variantId === variantId)
    );
  }
  /**
   * 选一个账号并推进轮转游标。
   *
   * 有会话键且该会话已绑定过账号时优先复用绑定；绑定的账号不可用（冷却、停用、
   * 凭据缺失）就退回「使用次数最少 + 游标轮转」，避免把负载全压在一个账号上。
   *
   * @param variantId - 限定变体；省略表示全部。
   * @param sessionKey - 会话标识；省略表示不做亲和。
   * @returns 选中的账号，没有可用账号时为 undefined。
   */
  acquire(variantId, sessionKey) {
    const candidates = this.available(variantId);
    if (candidates.length === 0) return void 0;
    if (sessionKey !== void 0 && sessionKey !== "") {
      const bound = this.sticky.get(sessionKey);
      const pinned = candidates.find((a) => `${a.account}|${a.variantId}` === bound);
      if (pinned !== void 0) return pinned;
    }
    const minUsed = Math.min(...candidates.map((a) => a.lastUsedAtMs));
    const tier = candidates.filter((a) => a.lastUsedAtMs === minUsed);
    const picked = tier[this.cursor % tier.length];
    this.cursor = (this.cursor + 1) % Math.max(1, candidates.length);
    return picked;
  }
  /**
   * 记住某个会话落在哪个账号上。
   *
   * 只在请求成功时绑定：失败换号说明这个账号对这段会话不合适，绑定它只会让
   * 后续每个请求都先撞一次墙。
   *
   * @param sessionKey - 会话标识。
   * @param account - 账号标识。
   * @param variantId - 变体 id。
   */
  bindSession(sessionKey, account, variantId) {
    if (sessionKey === "") return;
    if (this.sticky.size >= STICKY_MAX_ENTRIES && !this.sticky.has(sessionKey)) {
      const entries = [...this.sticky.entries()].slice(-STICKY_MAX_ENTRIES / 2);
      this.sticky.clear();
      for (const [key, value] of entries) this.sticky.set(key, value);
    }
    this.sticky.set(sessionKey, `${account}|${variantId}`);
  }
  /** 某个会话当前绑定的账号；没有绑定时为 undefined。 */
  sessionBinding(sessionKey) {
    const bound = this.sticky.get(sessionKey);
    if (bound === void 0) return void 0;
    const target = this.accounts.find((a) => `${a.account}|${a.variantId}` === bound);
    return target === void 0 ? void 0 : { ...target };
  }
  /** 记一次成功：清除冷却与失败计数。 */
  noteSuccess(account, variantId) {
    const target = this.accounts.find((a) => a.account === account && a.variantId === variantId);
    if (target === void 0) return;
    target.cooldownUntilMs = 0;
    target.failStreak = 0;
    target.lastError = "";
    target.lastUsedAtMs = Date.now();
  }
  /**
   * 记一次失败并按指数退避进入冷却。
   *
   * @param account - 账号标识。
   * @param variantId - 变体 id。
   * @param message - 失败原因。
   * @param retryable - 是否值得重试；会话失效 / 额度不足这类硬失败同样要冷却，
   *   否则同一个坏账号会被反复选中。
   */
  noteFailure(account, variantId, message, retryable = true) {
    const target = this.accounts.find((a) => a.account === account && a.variantId === variantId);
    if (target === void 0) return;
    target.failStreak += 1;
    target.lastError = message;
    target.lastUsedAtMs = Date.now();
    if (!retryable) return;
    const backoff = Math.min(COOLDOWN_BASE_MS * 2 ** (target.failStreak - 1), COOLDOWN_MAX_MS);
    target.cooldownUntilMs = Date.now() + backoff;
  }
  /** 用最新凭据覆盖某账号的 token（刷新后调用）。 */
  async applyRefresh(account, variantId, next) {
    const target = this.accounts.find((a) => a.account === account && a.variantId === variantId);
    if (target === void 0) return;
    target.accessToken = next.accessToken;
    if (next.refreshToken !== void 0) target.refreshToken = next.refreshToken;
    if (next.domain !== void 0) target.domain = next.domain;
    if (next.expiresInSec !== void 0 && Number.isFinite(next.expiresInSec)) {
      target.expiresAtMs = Date.now() + next.expiresInSec * 1e3;
    }
    target.cooldownUntilMs = 0;
    target.failStreak = 0;
    target.lastError = "";
    await this.persist();
  }
  /**
   * 对需要续期的账号刷新 token。
   *
   * @returns 成功刷新的账号数。
   */
  async refreshExpiringTokens() {
    let refreshed = 0;
    for (const account of [...this.accounts]) {
      if (account.disabled) continue;
      const credential = toCredential(account);
      if (!isExpiringSoon(credential)) continue;
      if (credential.refreshToken === "") continue;
      try {
        const next = await refreshAccessToken(credential);
        await this.applyRefresh(account.account, account.variantId, next);
        refreshed += 1;
      } catch (error) {
        this.noteFailure(account.account, account.variantId, `\u5237\u65B0 token \u5931\u8D25\uFF1A${String(error)}`, false);
      }
    }
    if (refreshed > 0) await this.persist();
    return refreshed;
  }
  /**
   * 测试该账号当前是否可用。
   *
   * 顺带续一次令牌：refresh token 可能已失效，而 access token 仍在有效期内，
   * 所以续期失败不致命，结论以探测为准。
   */
  async testAccount(account, variantId) {
    const target = this.accounts.find((a) => a.account === account && a.variantId === variantId);
    if (target === void 0) throw new Error("\u8D26\u53F7\u4E0D\u5B58\u5728");
    let renewError = "";
    if (target.refreshToken !== "") {
      try {
        await this.applyRefresh(account, variantId, await refreshAccessToken(toCredential(target)));
      } catch (error) {
        renewError = String(error);
      }
    }
    const result = await probeAccount(toCredential(target), target.models.map((model) => model.id));
    if (result.ok) {
      this.noteSuccess(account, variantId);
      await this.persist();
      return result;
    }
    const message = renewError === "" ? `${result.kind}: ${result.message}` : `${result.kind}: ${result.message}\uFF08\u4EE4\u724C\u7EED\u671F\u4E5F\u5931\u8D25\uFF1A${renewError}\uFF09`;
    this.noteFailure(account, variantId, message, PROBE_RETRYABLE_KINDS.has(result.kind));
    return { ...result, message };
  }
  /**
   * 刷新某账号的积分快照。
   *
   * @param account - 账号标识。
   * @param variantId - 变体 id。
   * @param options - `force` 为真时跳过缓存强制请求（面板上手动点刷新）。
   * @returns 积分快照。
   */
  async refreshCredits(account, variantId, options = {}) {
    const target = this.accounts.find((a) => a.account === account && a.variantId === variantId);
    if (target === void 0) throw new Error("\u8D26\u53F7\u4E0D\u5B58\u5728");
    if (options.force !== true && this.creditsAreFresh(target)) return target.credits;
    const snapshot = await fetchCredits(toCredential(target));
    target.credits = snapshot;
    target.creditsAtMs = Date.now();
    await this.persist();
    return snapshot;
  }
  /** 该账号的积分缓存是否还在有效期内。 */
  creditsAreFresh(target) {
    if (target.credits === void 0 || target.creditsAtMs <= 0) return false;
    return Date.now() - target.creditsAtMs < CREDITS_TTL_MS;
  }
  /**
   * 拉取某账号的模型目录。
   *
   * 成功即覆盖并标记 live；失败保留上次成功结果，只记错误原因——面板要能
   * 同时看到「当前目录」与「为什么没更新」。
   */
  async refreshCatalog(account, variantId) {
    const target = this.accounts.find((a) => a.account === account && a.variantId === variantId);
    if (target === void 0) throw new Error("\u8D26\u53F7\u4E0D\u5B58\u5728");
    try {
      const models = await fetchCatalog(toCredential(target));
      target.models = models;
      target.modelsAtMs = Date.now();
      target.catalogSource = "live";
      target.catalogError = "";
      await this.persist();
      return models;
    } catch (error) {
      target.catalogError = String(error);
      await this.persist();
      throw error;
    }
  }
  /** 拉取全部可用账号的目录，逐个容错。 */
  async refreshAllCatalogs() {
    let ok = 0;
    let failed = 0;
    for (const account of [...this.accounts]) {
      if (account.disabled) continue;
      try {
        await this.refreshCatalog(account.account, account.variantId);
        ok += 1;
      } catch {
        failed += 1;
      }
    }
    return { ok, failed };
  }
  /** 全部可用账号的模型并集，按 id 去重。 */
  allModels() {
    const seen = /* @__PURE__ */ new Map();
    for (const account of this.accounts) {
      if (account.disabled) continue;
      for (const model of account.models) {
        if (!seen.has(model.id)) seen.set(model.id, model);
      }
    }
    return [...seen.values()];
  }
  /**
   * 某一变体的模型并集。
   *
   * 国内版与国际版的同名模型走不同上游，模型表必须按版本分开，否则选择器会把
   * 两区的同名模型混成一个，请求就可能发到错误区域。
   *
   * @param variantId - 变体 id。
   * @returns 该变体下所有账号目录的并集。
   */
  modelsFor(variantId) {
    const seen = /* @__PURE__ */ new Map();
    for (const account of this.accounts) {
      if (account.disabled || account.variantId !== variantId) continue;
      for (const model of account.models) {
        if (!seen.has(model.id)) seen.set(model.id, model);
      }
    }
    return [...seen.values()];
  }
  /**
   * 批量刷新全部账号的积分。
   *
   * @param options - `force` 为真时忽略缓存；`variantId` 限定版本。
   * @returns 成功与失败的账号数。
   */
  async refreshAllCredits(options = {}) {
    let ok = 0;
    let failed = 0;
    for (const account of [...this.accounts]) {
      if (account.disabled) continue;
      if (options.variantId !== void 0 && account.variantId !== options.variantId) continue;
      try {
        await this.refreshCredits(account.account, account.variantId, options);
        ok += 1;
      } catch {
        failed += 1;
      }
    }
    return { ok, failed };
  }
  /** 写回磁盘。 */
  async persist() {
    await persist(this.path, this.accounts);
  }
};

// src/adapter.ts
import { createProvider } from "@earendil-works/pi-ai";
import { openAICompletionsApi } from "@earendil-works/pi-ai/api/openai-completions.lazy";
import { PiAiAdapter } from "@deepseek-ai/dsh-llm-pi-ai";
import { resolveRetryPolicy } from "@deepseek-ai/dsh-llm";

// src/credits.ts
function formatCredits(credits) {
  if (credits === void 0) return "";
  const text = credits.trim().replace(/^x/iu, "").trim();
  if (text === "") return "";
  const value = Number(text);
  if (!Number.isFinite(value)) return `${text}x`;
  return `${value.toFixed(2)}x`;
}

// src/adapter.ts
var STREAM_IDLE_TIMEOUT_MS = 3e5;
var NO_COST = { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 };
var REQUEST_IMAGE_BUDGETS = {
  maxRequestImageBytes: 20971520,
  requestImagePixelBudget: 4194304,
  requestImageMaxBytes: 1048576
};
var INERT_AUTH = {
  credentials: {
    async read() {
      return void 0;
    },
    async list() {
      return [];
    },
    async modify() {
      throw new Error("dsh-hyperworkbuddy: \u672C\u8DEF\u7531\u6CA1\u6709 pi-ai \u51ED\u636E\u751F\u547D\u5468\u671F");
    },
    async delete() {
    }
  },
  authContext: {
    async env() {
      return void 0;
    },
    async fileExists() {
      return false;
    }
  }
};
function reasoningFields(info, probed = []) {
  const declared = info.reasoning.supportedEfforts;
  const efforts = declared !== void 0 && declared.length > 0 ? declared : probed.length > 0 ? probed : void 0;
  if (info.reasoning.supports !== true || efforts === void 0) {
    return { reasoning: false };
  }
  const has = (level) => efforts.includes(level) ? level : null;
  const map = {
    off: info.reasoning.canDisableThinking ? "off" : null,
    // `minimal` 不在上游的档位词表里。
    minimal: null,
    low: has("low"),
    medium: has("medium"),
    high: has("high"),
    xhigh: has("xhigh"),
    max: has("max")
  };
  return { reasoning: true, thinkingLevelMap: map };
}
function toPiModel(info, baseUrl, providerId, probed, useMaximumContextWindow) {
  const creditsText = formatCredits(info.billing.credits);
  return {
    id: info.id,
    // 倍率并进显示名：DSH 选择器只渲染 name，模型 id 不带这个信息。
    name: creditsText === "" ? info.name : `${info.name} (${creditsText})`,
    api: "openai-completions",
    provider: providerId,
    baseUrl,
    input: info.supportsImages ? ["text", "image"] : ["text"],
    ...reasoningFields(info, probed),
    cost: NO_COST,
    contextWindow: resolveContextWindow(info, useMaximumContextWindow),
    maxTokens: info.maxTokens,
    // pi-ai 无法从回环地址推断 WorkBuddy 的字段拼写，这里显式点名。
    // sendSessionAffinityHeaders 让 pi-ai 把 sessionId 转成 x-session-id 等头，
    // 回环 shim 靠它做会话粘性选号（非 OpenRouter 的 baseUrl 默认关闭）。
    compat: { maxTokensField: "max_tokens", sendSessionAffinityHeaders: true }
  };
}
function createHyperAdapter(options) {
  const { providerId, displayName, shim, pool, variantId } = options;
  const buildModels = () => {
    const baseUrl = `${shim.baseUrl()}/v1`;
    const useMaximum = options.useMaximumContextWindow?.() === true;
    return pool.modelsFor(variantId).map((model) => toPiModel(
      model,
      baseUrl,
      providerId,
      options.probedEfforts?.(model.id) ?? [],
      useMaximum
    ));
  };
  const visibleModels = () => {
    const hidden = new Set(options.hidden());
    return buildModels().filter((model) => !hidden.has(model.id));
  };
  const base = createProvider({
    id: providerId,
    name: displayName,
    auth: {
      apiKey: {
        name: "HyperWorkBuddy \u672C\u673A\u7AEF\u70B9\u5BC6\u94A5",
        async resolve({ credential }) {
          const apiKey = credential?.key;
          return apiKey === void 0 || apiKey.length === 0 ? void 0 : { auth: { apiKey }, source: "HyperWorkBuddy" };
        }
      }
    },
    models: buildModels(),
    api: openAICompletionsApi()
  });
  const provider = { ...base, getModels: () => buildModels() };
  const profile = {
    provider: providerId,
    displayName,
    streamIdleTimeoutMs: STREAM_IDLE_TIMEOUT_MS,
    retryPolicy: resolveRetryPolicy(void 0, "dsh-hyperworkbuddy retryPolicy"),
    configuredMaxTokens: /* @__PURE__ */ new Map(),
    modelErrors: /* @__PURE__ */ new Map(),
    ...REQUEST_IMAGE_BUDGETS,
    piProvider: provider
  };
  let profiles = /* @__PURE__ */ new Map([[providerId, profile]]);
  const adapterOptions = {
    profiles: () => profiles,
    auth: INERT_AUTH,
    // 把内部端点的进程内密钥解析成 OpenAI apiKey，pi-ai 会作为 Bearer 发出。
    resolveApiKey: async () => shim.token()
  };
  if (options.resolveAttachments !== void 0) {
    adapterOptions["resolveAttachments"] = () => options.resolveAttachments();
  }
  if (options.resolveImageAccess !== void 0) {
    adapterOptions["resolveImageAccess"] = options.resolveImageAccess;
  }
  const adapter = new FilteredPiAiAdapter(
    adapterOptions,
    visibleModels
  );
  return {
    adapter,
    invalidate: () => {
      profiles = /* @__PURE__ */ new Map([[providerId, profile]]);
    }
  };
}
var FilteredPiAiAdapter = class extends PiAiAdapter {
  constructor(options, visible) {
    super(options);
    this.visible = visible;
  }
  visible;
  async listModels(provider) {
    const models = await super.listModels(provider);
    const allowed = new Set(this.visible().map((model) => model.id));
    if (allowed.size === 0) return models;
    return models.filter((model) => allowed.has(model.id));
  }
};

// src/import.ts
function regionOf2(domain, token) {
  const lowered = domain.trim().toLowerCase();
  if (lowered === "workbuddy.ai" || lowered.endsWith(".workbuddy.ai")) return "global";
  if (lowered === "workbuddy.cn" || lowered.endsWith(".workbuddy.cn") || lowered.endsWith("codebuddy.cn")) return "cn";
  const segments = token.split(".");
  if (segments.length === 3) {
    try {
      const payload = JSON.parse(Buffer.from(segments[1], "base64url").toString("utf8"));
      const haystack = `${String(payload["iss"] ?? "")} ${String(payload["aud"] ?? "")} ${String(payload["domain"] ?? "")}`.toLowerCase();
      if (haystack.includes("workbuddy.ai") || haystack.includes("codebuddy.ai")) return "global";
    } catch {
    }
  }
  return "cn";
}
function variantOfRegion(region) {
  return region === "global" ? AI_VARIANT : CN_VARIANT;
}
function asRecord2(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value) ? value : void 0;
}
function asString2(value) {
  return typeof value === "string" && value.trim() !== "" ? value.trim() : void 0;
}
function coerceRows(blob) {
  if (Array.isArray(blob)) {
    const rows = blob.map(asRecord2).filter((r) => r !== void 0);
    if (rows.length === 0) return { rows: [], error: "\u6570\u7EC4\u91CC\u6CA1\u6709\u53EF\u8BC6\u522B\u7684\u8D26\u53F7\u5BF9\u8C61" };
    return { rows, error: "" };
  }
  const record = asRecord2(blob);
  if (record === void 0) return { rows: [], error: "\u671F\u671B\u4E00\u4E2A\u5BF9\u8C61\u6216\u8D26\u53F7\u6570\u7EC4" };
  const accounts = record["accounts"];
  if (Array.isArray(accounts)) {
    const rows = accounts.map(asRecord2).filter((r) => r !== void 0);
    if (rows.length === 0) return { rows: [], error: "\u5BFC\u51FA\u6587\u6863\u7684 accounts \u4E3A\u7A7A" };
    return { rows, error: "" };
  }
  const looksLikeAccount = record["accessToken"] !== void 0 || record["access_token"] !== void 0 || asRecord2(record["auth"]) !== void 0 || asRecord2(record["account"]) !== void 0;
  if (!looksLikeAccount) {
    const keys = Object.keys(record).slice(0, 6).join(", ");
    return { rows: [], error: `\u4E0D\u662F\u8D26\u53F7\u6587\u6863\uFF08\u671F\u671B accounts \u6570\u7EC4\u3001\u6570\u7EC4\u6216\u5355\u4E2A\u8D26\u53F7\u5BF9\u8C61\uFF1B\u5B9E\u9645\u952E\uFF1A${keys || "\u65E0"}\uFF09` };
  }
  return { rows: [record], error: "" };
}
function parseHubExport(raw) {
  const text = raw.trim();
  if (text === "") return { credentials: [], skipped: [], error: "\u5185\u5BB9\u4E3A\u7A7A" };
  let blob;
  try {
    blob = JSON.parse(text);
  } catch {
    return { credentials: [], skipped: [], error: "\u4E0D\u662F\u5408\u6CD5 JSON" };
  }
  const doc = asRecord2(blob);
  if (doc !== void 0) {
    const format = doc["format"];
    if (typeof format === "string" && format !== "" && format !== "workbuddy-accounts") {
      return { credentials: [], skipped: [], error: `\u4E0D\u652F\u6301\u7684\u5BFC\u51FA\u683C\u5F0F\uFF1A${format}\uFF08\u671F\u671B workbuddy-accounts\uFF09` };
    }
  }
  const { rows, error } = coerceRows(blob);
  if (error !== "") return { credentials: [], skipped: [], error };
  const credentials = [];
  const skipped = [];
  rows.forEach((row, index) => {
    const parsed = parseRow(row);
    if (typeof parsed === "string") skipped.push({ index: index + 1, reason: parsed });
    else credentials.push(parsed);
  });
  if (credentials.length === 0 && skipped.length === 0) {
    return { credentials: [], skipped: [], error: "\u6587\u6863\u91CC\u6CA1\u6709\u8D26\u53F7" };
  }
  return { credentials, skipped, error: "" };
}
function pick(row, keys) {
  const layers = [row, asRecord2(row["auth"]), asRecord2(row["account"])].filter((layer) => layer !== void 0);
  for (const key of keys) {
    for (const layer of layers) {
      const value = asString2(layer[key]);
      if (value !== void 0) return value;
    }
  }
  return void 0;
}
function parseRow(row) {
  const normalized = row["access_token"] !== void 0 && row["accessToken"] === void 0 ? {
    uid: row["uid"],
    nickname: row["nickname"] ?? row["email"] ?? "",
    domain: row["domain"],
    accessToken: row["access_token"],
    refreshToken: row["refresh_token"],
    expiresAt: row["expires_at"],
    realm: row["realm"]
  } : row;
  const accessToken = pick(normalized, ["accessToken", "access_token"]);
  if (accessToken === void 0) return "\u7F3A\u5C11 accessToken";
  if (accessToken.split(".").length !== 3) return "accessToken \u4E0D\u662F JWT \u5F62\u6001";
  const refreshToken = pick(normalized, ["refreshToken", "refresh_token"]) ?? "";
  const uid = pick(normalized, ["uid"]) ?? "";
  const enterpriseId = pick(normalized, ["enterpriseId", "enterprise_id"]) ?? "";
  const nickname = pick(normalized, ["nickname", "email"]) ?? "";
  const declared = pick(normalized, ["domain"]) ?? "";
  const region = regionOf2(declared, accessToken);
  const variant = variantOfRegion(region);
  const domain = declared !== "" ? declared : region === "global" ? "www.workbuddy.ai" : "www.workbuddy.cn";
  return {
    variantId: variant.id,
    account: `${uid}:${enterpriseId}`,
    uid,
    enterpriseId,
    domain,
    nickname,
    accessToken,
    refreshToken,
    expiresAtMs: normalizeEpoch(normalized["expiresAt"] ?? normalized["expires_at"]),
    refreshExpiresAtMs: normalizeEpoch(normalized["refreshExpiresAt"])
  };
}

// src/shim.ts
import { randomBytes as randomBytes2, timingSafeEqual } from "node:crypto";
import { createServer } from "node:http";
import { Readable } from "node:stream";

// src/usage.ts
import { mkdir as mkdir2, open, rm, writeFile as writeFile2 } from "node:fs/promises";
import { dirname as dirname2, join as join3 } from "node:path";
var USAGE_FILENAME = ".hyperworkbuddy-usage.jsonl";
var MAX_LOAD_BYTES = 32 * 1024 * 1024;
var KEEP_DAYS = 8;
function emptyTotals() {
  return { requests: 0, errors: 0, promptTokens: 0, completionTokens: 0, cachedTokens: 0, totalTokens: 0 };
}
function localDay(atMs) {
  const date = new Date(atMs);
  const pad = (n) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}
function addRow(target, row) {
  target.requests += 1;
  if (!row.ok) target.errors += 1;
  target.promptTokens += row.promptTokens;
  target.completionTokens += row.completionTokens;
  target.cachedTokens += row.cachedTokens;
  target.totalTokens += row.totalTokens;
}
function numberField(value) {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 0;
}
function parseRow2(value) {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return void 0;
  const row = value;
  const atMs = Number(row["atMs"]);
  if (!Number.isFinite(atMs) || atMs <= 0) return void 0;
  return {
    atMs,
    variantId: typeof row["variantId"] === "string" ? row["variantId"] : "",
    account: typeof row["account"] === "string" ? row["account"] : "",
    model: typeof row["model"] === "string" ? row["model"] : "",
    ok: row["ok"] !== false,
    ...typeof row["kind"] === "string" && row["kind"] !== "" ? { kind: row["kind"] } : {},
    promptTokens: numberField(row["promptTokens"]),
    completionTokens: numberField(row["completionTokens"]),
    cachedTokens: numberField(row["cachedTokens"]),
    totalTokens: numberField(row["totalTokens"]),
    elapsedMs: numberField(row["elapsedMs"])
  };
}
var UsageLedger = class {
  path;
  all = emptyTotals();
  days = /* @__PURE__ */ new Map();
  /** 跳过写入（落盘失败时置位，避免每次请求都重复报错）。 */
  writeDisabled = false;
  constructor(homeDir) {
    this.path = join3(homeDir, USAGE_FILENAME);
  }
  /** 流水文件路径。 */
  get filePath() {
    return this.path;
  }
  /** 从磁盘折入历史流水。 */
  async load() {
    const text = await this.readTail();
    if (text === "") return;
    for (const line of text.split("\n")) {
      const trimmed = line.trim();
      if (trimmed === "") continue;
      try {
        const row = parseRow2(JSON.parse(trimmed));
        if (row !== void 0) this.fold(row);
      } catch {
      }
    }
  }
  /** 读取文件内容；超大时只取尾部，并丢弃首个残行。 */
  async readTail() {
    let handle;
    try {
      handle = await open(this.path, "r");
    } catch {
      return "";
    }
    try {
      const size = (await handle.stat()).size;
      if (size === 0) return "";
      const start = size > MAX_LOAD_BYTES ? size - MAX_LOAD_BYTES : 0;
      const buffer = Buffer.alloc(size - start);
      await handle.read(buffer, 0, buffer.length, start);
      const text = buffer.toString("utf8");
      if (start === 0) return text;
      const firstBreak = text.indexOf("\n");
      return firstBreak < 0 ? "" : text.slice(firstBreak + 1);
    } catch {
      return "";
    } finally {
      await handle.close().catch(() => void 0);
    }
  }
  /** 记一条流水：先落盘，再入内存桶。 */
  async record(row) {
    this.fold(row);
    if (this.writeDisabled) return;
    try {
      await mkdir2(dirname2(this.path), { recursive: true });
      await writeFile2(this.path, `${JSON.stringify(row)}
`, { encoding: "utf8", flag: "a" });
    } catch {
      this.writeDisabled = true;
    }
  }
  /** 折进内存聚合。 */
  fold(row) {
    addRow(this.all, row);
    const day = localDay(row.atMs);
    let bucket = this.days.get(day);
    if (bucket === void 0) {
      bucket = { totals: emptyTotals(), accounts: /* @__PURE__ */ new Map(), models: /* @__PURE__ */ new Map() };
      this.days.set(day, bucket);
      this.prune();
    }
    addRow(bucket.totals, row);
    if (row.account !== "") {
      const totals = bucket.accounts.get(row.account) ?? { ...emptyTotals(), variantId: row.variantId };
      addRow(totals, row);
      bucket.accounts.set(row.account, totals);
    }
    if (row.model !== "") {
      const totals = bucket.models.get(row.model) ?? emptyTotals();
      addRow(totals, row);
      bucket.models.set(row.model, totals);
    }
  }
  /** 丢掉过期的日桶，内存占用不随运行时长增长。 */
  prune() {
    if (this.days.size <= KEEP_DAYS) return;
    const cutoff = localDay(Date.now() - (KEEP_DAYS - 1) * 864e5);
    for (const day of [...this.days.keys()]) {
      if (day < cutoff) this.days.delete(day);
    }
  }
  /** 面板用的汇总。 */
  summary() {
    const today = this.days.get(localDay(Date.now()));
    const daily = [];
    for (let back = 6; back >= 0; back--) {
      const day = localDay(Date.now() - back * 864e5);
      daily.push({ day, totals: this.days.get(day)?.totals ?? emptyTotals() });
    }
    const todayTotals = today?.totals ?? emptyTotals();
    return {
      all: { ...this.all },
      today: { ...todayTotals },
      ...todayTotals.promptTokens === 0 ? {} : { cacheHitRate: todayTotals.cachedTokens / todayTotals.promptTokens },
      byAccount: [...(today?.accounts ?? /* @__PURE__ */ new Map()).entries()].map(([account, totals]) => ({
        account,
        variantId: totals.variantId,
        totals: {
          requests: totals.requests,
          errors: totals.errors,
          promptTokens: totals.promptTokens,
          completionTokens: totals.completionTokens,
          cachedTokens: totals.cachedTokens,
          totalTokens: totals.totalTokens
        }
      })).sort((a, b) => b.totals.totalTokens - a.totals.totalTokens || b.totals.requests - a.totals.requests),
      byModel: [...(today?.models ?? /* @__PURE__ */ new Map()).entries()].map(([model, totals]) => ({ model, totals: { ...totals } })).sort((a, b) => b.totals.totalTokens - a.totals.totalTokens || b.totals.requests - a.totals.requests),
      daily
    };
  }
  /** 清空流水与聚合。 */
  async clear() {
    this.all.requests = 0;
    this.all.errors = 0;
    this.all.promptTokens = 0;
    this.all.completionTokens = 0;
    this.all.cachedTokens = 0;
    this.all.totalTokens = 0;
    this.days.clear();
    await rm(this.path, { force: true }).catch(() => void 0);
  }
};
function readUsageBlock(usage) {
  if (typeof usage !== "object" || usage === null || Array.isArray(usage)) return void 0;
  const block = usage;
  const promptTokens = numberField(block["prompt_tokens"] ?? block["input_tokens"]);
  const completionTokens = numberField(block["completion_tokens"] ?? block["output_tokens"]);
  const totalTokens = numberField(block["total_tokens"]) || promptTokens + completionTokens;
  if (promptTokens === 0 && completionTokens === 0 && totalTokens === 0) return void 0;
  return {
    promptTokens,
    completionTokens,
    cachedTokens: cachedTokenCount(block),
    totalTokens
  };
}
function createUsageTap() {
  let buffer = "";
  let last;
  return {
    feed(chunk) {
      buffer += typeof chunk === "string" ? chunk : chunk.toString("utf8");
      let index = buffer.indexOf("\n");
      while (index >= 0) {
        const line = buffer.slice(0, index).trim();
        buffer = buffer.slice(index + 1);
        index = buffer.indexOf("\n");
        if (!line.startsWith("data:")) continue;
        const payload = line.slice(5).trim();
        if (payload === "" || payload === "[DONE]") continue;
        let parsed;
        try {
          parsed = JSON.parse(payload);
        } catch {
          continue;
        }
        const usage = readUsageBlock(parsed["usage"]);
        if (usage !== void 0) last = usage;
      }
      if (buffer.length > 1048576) buffer = "";
    },
    usage: () => last
  };
}
function cachedTokenCount(block) {
  const details = typeof block["prompt_tokens_details"] === "object" && block["prompt_tokens_details"] !== null ? block["prompt_tokens_details"] : {};
  const inputDetails = typeof block["input_tokens_details"] === "object" && block["input_tokens_details"] !== null ? block["input_tokens_details"] : {};
  const candidates = [
    details["cached_tokens"],
    inputDetails["cached_tokens"],
    block["prompt_cache_hit_tokens"],
    block["cache_read_input_tokens"],
    block["cached_tokens"]
  ];
  for (const candidate of candidates) {
    const value = numberField(candidate);
    if (value > 0) return value;
  }
  return 0;
}

// src/shim.ts
var REQUEST_BODY_LIMIT = 16 * 1024 * 1024;
var KIND_STATUS = {
  hard_credit: 402,
  soft_rate: 429,
  session_dead: 401,
  not_found: 502,
  server: 502,
  intercepted: 429,
  client: 400
};
var FAILOVER_KINDS = /* @__PURE__ */ new Set([
  "hard_credit",
  "soft_rate",
  "session_dead",
  "server"
]);
var INTERCEPTED_RETRY_DELAY_MS = 1200;
var COOLDOWN_KINDS = /* @__PURE__ */ new Set([
  "hard_credit",
  "soft_rate",
  "session_dead",
  "server"
]);
function writeJson(res, status, body) {
  const payload = JSON.stringify(body);
  res.writeHead(status, { "Content-Type": "application/json", "Content-Length": Buffer.byteLength(payload) });
  res.end(payload);
}
function writeOpenAIError(res, status, kind, message) {
  writeJson(res, status, { error: { message, type: kind, code: kind } });
}
function hostIsLoopback(host) {
  if (typeof host !== "string" || host === "") return false;
  const name2 = host.replace(/:\d+$/u, "").replace(/^\[|\]$/gu, "").toLowerCase();
  return name2 === "127.0.0.1" || name2 === "localhost" || name2 === "::1" || name2 === "[::1]";
}
function originIsLoopback(origin) {
  if (origin === void 0 || origin === "") return true;
  try {
    const host = new URL(origin).hostname.toLowerCase();
    return host === "127.0.0.1" || host === "localhost" || host === "::1";
  } catch {
    return false;
  }
}
function secretEquals(a, b) {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}
function isJsonContentType(req) {
  const type = req.headers["content-type"];
  return typeof type === "string" && type.trim().toLowerCase().startsWith("application/json");
}
function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    req.on("data", (chunk) => {
      size += chunk.length;
      if (size > REQUEST_BODY_LIMIT) {
        reject(new Error("request body too large"));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on("end", () => resolve(Buffer.concat(chunks)));
    req.on("error", reject);
  });
}
function createHyperShim(options) {
  const { pool, variantId } = options;
  const logger = options.logger;
  const SHARED_SECRET = randomBytes2(32).toString("base64url");
  const scoped = () => pool.available(variantId);
  function authorize(req) {
    const header = req.headers.authorization;
    if (typeof header !== "string") return false;
    const match = /^Bearer\s+(.+)$/iu.exec(header.trim());
    if (match === null) return false;
    const presented = match[1];
    if (secretEquals(presented, SHARED_SECRET)) return true;
    const fallback = options.fallbackKey?.() ?? "";
    if (fallback !== "" && secretEquals(presented, fallback)) return true;
    return options.apiKeys().some((key) => secretEquals(presented, key));
  }
  const server = createServer((req, res) => {
    void handle(req, res);
  });
  const ready = new Promise((resolve, reject) => {
    server.once("listening", () => resolve());
    server.once("error", reject);
  });
  server.listen(options.port(), "127.0.0.1");
  const port = () => {
    const address = server.address();
    if (address === null || typeof address === "string") throw new Error("\u7AEF\u70B9\u6CA1\u6709\u76D1\u542C\u5730\u5740");
    return address.port;
  };
  const baseUrl = () => `http://127.0.0.1:${port()}`;
  async function handle(req, res) {
    try {
      if (!hostIsLoopback(req.headers.host)) {
        writeOpenAIError(res, 403, "host_not_allowed", "Host \u5934\u5FC5\u987B\u6307\u5411\u56DE\u73AF\u5730\u5740");
        return;
      }
      if (!originIsLoopback(req.headers.origin)) {
        writeOpenAIError(res, 403, "origin_not_allowed", "Origin \u5FC5\u987B\u662F\u56DE\u73AF\u6765\u6E90");
        return;
      }
      const url = (req.url ?? "/").split("?")[0] ?? "/";
      if (req.method === "GET" && (url === "/healthz" || url === "/healthz/")) {
        writeJson(res, 200, { ok: true, variant: variantId, accounts: scoped().length });
        return;
      }
      if (!authorize(req)) {
        writeOpenAIError(res, 401, "unauthorized", "\u7F3A\u5C11\u6216\u65E0\u6548\u7684 Authorization bearer");
        return;
      }
      if (req.method === "GET" && (url === "/v1/models" || url === "/v1/models/")) {
        listModels(res);
        return;
      }
      if (req.method === "POST" && (url === "/v1/chat/completions" || url === "/v1/chat/completions/")) {
        await chatRoute(req, res);
        return;
      }
      writeOpenAIError(res, 404, "not_found", `\u6CA1\u6709\u8BE5\u8DEF\u7531\uFF1A${req.method} ${url}`);
    } catch (error) {
      if (!res.headersSent) writeOpenAIError(res, 500, "internal", String(error));
      else res.end();
    }
  }
  function listModels(res) {
    const hidden = new Set(options.hiddenModels());
    const seen = /* @__PURE__ */ new Map();
    for (const account of scoped()) {
      for (const model of account.models) {
        if (hidden.has(model.id) || seen.has(model.id)) continue;
        seen.set(model.id, { id: model.id, object: "model", created: 0, owned_by: account.variantId });
      }
    }
    writeJson(res, 200, { object: "list", data: [...seen.values()] });
  }
  async function chatRoute(req, res) {
    if (!isJsonContentType(req)) {
      writeOpenAIError(res, 415, "unsupported_media_type", "Content-Type \u5FC5\u987B\u662F application/json");
      return;
    }
    const raw = (await readBody(req)).toString("utf8");
    const model = modelOfBody(raw);
    const hidden = new Set(options.hiddenModels());
    if (model !== "" && hidden.has(model)) {
      writeOpenAIError(res, 400, "model_hidden", `\u6A21\u578B ${model} \u5DF2\u88AB\u9690\u85CF`);
      return;
    }
    const candidates = scoped();
    if (candidates.length === 0) {
      writeOpenAIError(res, 401, "no_account", "\u6CA1\u6709\u53EF\u7528\u8D26\u53F7\uFF1B\u8BF7\u5728\u8BBE\u7F6E \u2192 WorkBuddy \u91CC\u767B\u5F55\u6216\u5BFC\u5165\u8D26\u53F7");
      return;
    }
    const controller = new AbortController();
    req.on("close", () => controller.abort());
    const sessionKey = sessionKeyOf(req);
    const startedAtMs = Date.now();
    let last;
    const tried = /* @__PURE__ */ new Set();
    let interceptedRetried = false;
    let pendingRetry;
    for (let attempt = 0; attempt < candidates.length; attempt++) {
      const account = pendingRetry ?? pickAccount(candidates, tried, sessionKey);
      pendingRetry = void 0;
      if (account === void 0) break;
      tried.add(`${account.account}|${account.variantId}`);
      const result = await chatCompletions(toCredential(account), raw, controller.signal);
      if (result.ok) {
        pool.noteSuccess(account.account, account.variantId);
        pool.bindSession(sessionKey, account.account, account.variantId);
        await streamThrough(res, result.response, controller, {
          variantId,
          account: account.account,
          model,
          startedAtMs
        });
        return;
      }
      last = { status: result.status, kind: result.kind, message: result.message };
      pool.noteFailure(
        account.account,
        account.variantId,
        `${result.kind}: ${result.message}`,
        COOLDOWN_KINDS.has(result.kind)
      );
      if (result.kind === "intercepted" && !interceptedRetried && !controller.signal.aborted) {
        interceptedRetried = true;
        logger?.warn(`hyperworkbuddy: \u8D26\u53F7 ${account.account} \u88AB\u4E0A\u6E38\u62E6\u622A\uFF0C${INTERCEPTED_RETRY_DELAY_MS}ms \u540E\u539F\u5730\u91CD\u8BD5\u4E00\u6B21`);
        await new Promise((resolve) => {
          const timer = setTimeout(resolve, INTERCEPTED_RETRY_DELAY_MS);
          timer.unref?.();
          controller.signal.addEventListener("abort", () => {
            clearTimeout(timer);
            resolve();
          }, { once: true });
        });
        if (controller.signal.aborted) break;
        pendingRetry = account;
        attempt -= 1;
        continue;
      }
      logger?.warn(`hyperworkbuddy: \u8D26\u53F7 ${account.account} \u5931\u8D25\uFF08${result.kind}\uFF09\uFF0C\u5C1D\u8BD5\u4E0B\u4E00\u4E2A`);
      if (!FAILOVER_KINDS.has(result.kind)) break;
      if (controller.signal.aborted) break;
    }
    if (last === void 0) {
      writeOpenAIError(res, 503, "no_account", "\u6CA1\u6709\u53EF\u7528\u8D26\u53F7");
      return;
    }
    await options.usage?.record({
      atMs: startedAtMs,
      variantId,
      account: "",
      model,
      ok: false,
      kind: last.kind,
      promptTokens: 0,
      completionTokens: 0,
      cachedTokens: 0,
      totalTokens: 0,
      elapsedMs: Date.now() - startedAtMs
    });
    const scope = tried.size >= candidates.length ? "\u5168\u90E8\u8D26\u53F7\u5747\u5931\u8D25" : `\u5DF2\u5C1D\u8BD5 ${tried.size}/${candidates.length} \u4E2A\u8D26\u53F7`;
    writeOpenAIError(
      res,
      KIND_STATUS[last.kind],
      last.kind,
      last.kind === "intercepted" ? `${scope}\uFF0C\u6700\u540E\u4E00\u4E2A\u9519\u8BEF\uFF1A${last.message}\u3002\u8FD9\u662F\u4E0A\u6E38\u7684\u77AC\u65F6\u98CE\u63A7\uFF0C\u8D26\u53F7\u672C\u8EAB\u6CA1\u6709\u95EE\u9898\uFF0C\u7A0D\u7B49\u7247\u523B\u91CD\u8BD5\u5373\u53EF` : `${scope}\uFF0C\u6700\u540E\u4E00\u4E2A\u9519\u8BEF\uFF1A${last.message}`
    );
  }
  function sessionKeyOf(req) {
    for (const name2 of ["x-session-id", "session_id", "x-session-affinity", "x-client-request-id"]) {
      const value = req.headers[name2];
      if (typeof value === "string" && value.trim() !== "") return value.trim();
    }
    return "";
  }
  function pickAccount(candidates, tried, sessionKey) {
    const fresh = candidates.filter((a) => !tried.has(`${a.account}|${a.variantId}`));
    if (fresh.length === 0) return void 0;
    if (sessionKey !== "") {
      const bound = pool.sessionBinding(sessionKey);
      if (bound !== void 0) {
        const pinned = fresh.find((a) => a.account === bound.account && a.variantId === bound.variantId);
        if (pinned !== void 0) return pinned;
      }
    }
    const minUsed = Math.min(...fresh.map((a) => a.lastUsedAtMs));
    return fresh.filter((a) => a.lastUsedAtMs === minUsed)[0];
  }
  async function streamThrough(res, upstream, controller, context) {
    const contentType = upstream.headers.get("content-type") ?? "";
    if (!contentType.includes("text/event-stream")) {
      await relayJson(res, upstream, context);
      return;
    }
    res.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "Connection": "keep-alive",
      "X-Accel-Buffering": "no"
    });
    if (upstream.body === null) {
      res.end("data: [DONE]\n\n");
      return;
    }
    let sawDone = false;
    let recorded = false;
    const tap = createUsageTap();
    const flush = () => {
      if (recorded) return;
      recorded = true;
      void recordUsage(context, tap.usage(), Date.now() - context.startedAtMs);
    };
    const body = Readable.fromWeb(upstream.body);
    body.on("data", (chunk) => {
      if (chunk.includes("[DONE]")) sawDone = true;
      tap.feed(chunk);
    });
    body.on("error", (error) => {
      logger?.warn("hyperworkbuddy: \u4E0A\u6E38\u6D41\u4E2D\u9014\u5931\u8D25", error);
      if (!sawDone && res.writable) res.end("data: [DONE]\n\n");
      flush();
    });
    body.on("end", flush);
    controller.signal.addEventListener("abort", () => {
      body.destroy();
      if (!res.writableEnded) res.end();
      flush();
    }, { once: true });
    body.pipe(res);
  }
  async function relayJson(res, upstream, context) {
    const text = upstream.body === null ? "" : await new Response(upstream.body).text();
    let usage;
    try {
      usage = readUsageBlock(JSON.parse(text)["usage"]);
    } catch {
      usage = void 0;
    }
    await recordUsage(context, usage, Date.now() - context.startedAtMs);
    res.writeHead(upstream.status, {
      "Content-Type": upstream.headers.get("content-type") ?? "application/json",
      "Content-Length": Buffer.byteLength(text)
    });
    res.end(text);
  }
  async function recordUsage(context, usage, elapsedMs) {
    await options.usage?.record({
      atMs: context.startedAtMs,
      variantId: context.variantId,
      account: context.account,
      model: context.model,
      ok: true,
      promptTokens: usage?.promptTokens ?? 0,
      completionTokens: usage?.completionTokens ?? 0,
      cachedTokens: usage?.cachedTokens ?? 0,
      totalTokens: usage?.totalTokens ?? 0,
      elapsedMs
    });
  }
  return {
    ready,
    baseUrl,
    token: () => SHARED_SECRET,
    port,
    close: () => new Promise((resolve, reject) => {
      server.close(() => resolve());
      server.closeAllConnections();
      server.once("error", reject);
    })
  };
}

// src/state.ts
import { mkdir as mkdir3, readFile as readFile3, rename as rename2, writeFile as writeFile3 } from "node:fs/promises";
import { dirname as dirname3, join as join4 } from "node:path";
var STATE_FILENAME = ".hyperworkbuddy-state.json";
function isRecord3(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
function toStringList(value) {
  return Array.isArray(value) ? value.filter((item) => typeof item === "string" && item !== "") : [];
}
function statePath(homeDir) {
  return join4(homeDir, STATE_FILENAME);
}
var PluginState = class {
  path;
  data;
  constructor(homeDir, defaults = {}) {
    this.path = statePath(homeDir);
    this.data = {
      endpointEnabled: defaults.endpointEnabled ?? true,
      hiddenModels: { ...defaults.hiddenModels },
      probedEfforts: { ...defaults.probedEfforts },
      useMaximumContextWindow: { ...defaults.useMaximumContextWindow },
      autoCheckin: { ...defaults.autoCheckin },
      checkinDay: { ...defaults.checkinDay }
    };
  }
  /** 从磁盘读取；不存在或损坏时保留默认值。 */
  async load() {
    let text;
    try {
      text = await readFile3(this.path, "utf8");
    } catch {
      return;
    }
    try {
      const document = JSON.parse(text);
      if (!isRecord3(document)) return;
      if (typeof document["endpointEnabled"] === "boolean") {
        this.data.endpointEnabled = document["endpointEnabled"];
      }
      const hidden = document["hiddenModels"];
      if (isRecord3(hidden)) {
        const next = {};
        for (const variant of WORKBUDDY_VARIANTS) {
          const list = toStringList(hidden[variant.id]);
          if (list.length > 0) next[variant.id] = list;
        }
        this.data.hiddenModels = next;
      }
      const probed = document["probedEfforts"];
      if (isRecord3(probed)) {
        const next = {};
        for (const variant of WORKBUDDY_VARIANTS) {
          const models = probed[variant.id];
          if (!isRecord3(models)) continue;
          const bucket = {};
          for (const [modelId, list] of Object.entries(models)) {
            const efforts = toStringList(list);
            if (efforts.length > 0) bucket[modelId] = efforts;
          }
          if (Object.keys(bucket).length > 0) next[variant.id] = bucket;
        }
        this.data.probedEfforts = next;
      }
      const maximum = document["useMaximumContextWindow"];
      if (isRecord3(maximum)) {
        const next = {};
        for (const variant of WORKBUDDY_VARIANTS) {
          if (maximum[variant.id] === true) next[variant.id] = true;
        }
        this.data.useMaximumContextWindow = next;
      }
      const auto = document["autoCheckin"];
      if (isRecord3(auto)) {
        const next = {};
        for (const variant of WORKBUDDY_VARIANTS) {
          if (auto[variant.id] === true) next[variant.id] = true;
        }
        this.data.autoCheckin = next;
      }
      const days = document["checkinDay"];
      if (isRecord3(days)) {
        const next = {};
        for (const variant of WORKBUDDY_VARIANTS) {
          const day = days[variant.id];
          if (typeof day === "string" && day !== "") next[variant.id] = day;
        }
        this.data.checkinDay = next;
      }
    } catch {
    }
  }
  /** 对外端点总开关。 */
  get endpointEnabled() {
    return this.data.endpointEnabled;
  }
  /** 设置对外端点总开关并落盘。 */
  async setEndpointEnabled(enabled) {
    this.data.endpointEnabled = enabled;
    await this.persist();
  }
  /** 某版本被隐藏的模型 id。 */
  hidden(variantId) {
    return this.data.hiddenModels[variantId] ?? [];
  }
  /**
   * 打开 / 关闭某版本下的一个模型。
   *
   * @param variantId - 变体 id。
   * @param modelId - 模型 id。
   * @param visible - true 表示显示，false 表示隐藏。
   */
  async setVisible(variantId, modelId, visible) {
    const current = new Set(this.hidden(variantId));
    if (visible) current.delete(modelId);
    else current.add(modelId);
    const next = { ...this.data.hiddenModels };
    if (current.size === 0) delete next[variantId];
    else next[variantId] = [...current];
    this.data.hiddenModels = next;
    await this.persist();
  }
  /** 某模型探测到的档位；没有探测过时为空数组。 */
  probedFor(variantId, modelId) {
    return this.data.probedEfforts[variantId]?.[modelId] ?? [];
  }
  /** 该版本是否使用上游声明的最大上下文窗口。 */
  usesMaximumContextWindow(variantId) {
    return this.data.useMaximumContextWindow[variantId] === true;
  }
  /** 设置「使用最大上下文窗口」并落盘。 */
  async setMaximumContextWindow(variantId, useMaximum) {
    const next = { ...this.data.useMaximumContextWindow };
    if (useMaximum) next[variantId] = true;
    else delete next[variantId];
    this.data.useMaximumContextWindow = next;
    await this.persist();
  }
  /**
   * 记录一个模型探测到的档位。
   *
   * @param variantId - 变体 id。
   * @param modelId - 模型 id。
   * @param efforts - 被上游接受的档位。
   */
  async setEfforts(variantId, modelId, efforts) {
    const next = { ...this.data.probedEfforts };
    const bucket = { ...next[variantId] ?? {} };
    if (efforts.length === 0) delete bucket[modelId];
    else bucket[modelId] = efforts;
    if (Object.keys(bucket).length === 0) delete next[variantId];
    else next[variantId] = bucket;
    this.data.probedEfforts = next;
    await this.persist();
  }
  /** 该版本是否开着每日自动签到。 */
  autoCheckinEnabled(variantId) {
    return this.data.autoCheckin[variantId] === true;
  }
  /** 设置「每日自动签到」并落盘。 */
  async setAutoCheckin(variantId, enabled) {
    const next = { ...this.data.autoCheckin };
    if (enabled) next[variantId] = true;
    else delete next[variantId];
    this.data.autoCheckin = next;
    await this.persist();
  }
  /** 该版本自动签到上次尝试的日期（`YYYY-MM-DD`），没试过时为空串。 */
  lastCheckinDay(variantId) {
    return this.data.checkinDay[variantId] ?? "";
  }
  /**
   * 记下自动签到在某天已尝试过。
   *
   * @param variantId - 变体 id。
   * @param day - `YYYY-MM-DD`；空串表示清掉记录。
   */
  async markCheckinDay(variantId, day) {
    const next = { ...this.data.checkinDay };
    if (day === "") delete next[variantId];
    else next[variantId] = day;
    this.data.checkinDay = next;
    await this.persist();
  }
  /** 写回磁盘。 */
  async persist() {
    const document = {
      version: 1,
      endpointEnabled: this.data.endpointEnabled,
      hiddenModels: this.data.hiddenModels,
      probedEfforts: this.data.probedEfforts,
      useMaximumContextWindow: this.data.useMaximumContextWindow,
      autoCheckin: this.data.autoCheckin,
      checkinDay: this.data.checkinDay
    };
    await mkdir3(dirname3(this.path), { recursive: true });
    const temp = `${this.path}.${process.pid}.tmp`;
    await writeFile3(temp, JSON.stringify(document, null, 2), "utf8");
    await rename2(temp, this.path);
  }
};

// src/index.ts
var name = "llm-hyperworkbuddy";
var inject = ["llm"];
var ROUTE_PREFIX = "/api-hyperworkbuddy";
var DESKTOP_POLL_MS = 3e4;
var MIGRATION_MARKER_FILENAME = ".hyperworkbuddy-migrated";
var Config = z.object({
  port: z.natural().default(8791).description("\u56FD\u5185\u7248\u5BF9\u5916\u7AEF\u70B9\u7AEF\u53E3\uFF080 \u8868\u793A\u968F\u673A\u7AEF\u53E3\uFF09"),
  portAI: z.natural().default(8792).description("\u56FD\u9645\u7248\u5BF9\u5916\u7AEF\u70B9\u7AEF\u53E3\uFF080 \u8868\u793A\u968F\u673A\u7AEF\u53E3\uFF09"),
  endpointEnabled: z.boolean().default(true).description("\u662F\u5426\u542F\u7528\u5BF9\u5916\u7AEF\u70B9\uFF08\u53EF\u5728\u8BBE\u7F6E\u9762\u677F\u91CC\u968F\u65F6\u5207\u6362\uFF09"),
  apiKeys: z.array(z.string()).default([]).description("\u5916\u90E8\u5BA2\u6237\u7AEF\u4F7F\u7528\u7684 API Key\uFF1B\u7559\u7A7A\u4F7F\u7528\u81EA\u52A8\u751F\u6210\u7684\u5BC6\u94A5"),
  hiddenModels: z.array(z.string()).default([]).description("\u521D\u59CB\u9690\u85CF\u7684\u6A21\u578B id\uFF08\u53EF\u5728\u8BBE\u7F6E\u9762\u677F\u91CC\u9010\u4E2A\u5207\u6362\uFF09"),
  followDesktop: z.boolean().default(true).description("\u81EA\u52A8\u8DDF\u968F WorkBuddy \u684C\u9762 App \u7684\u767B\u5F55\u72B6\u6001")
});
function json(res, status, body) {
  const payload = JSON.stringify(body);
  res.writeHead(status, { "Content-Type": "application/json; charset=utf-8", "Content-Length": Buffer.byteLength(payload) });
  res.end(payload);
}
function loopbackRequest(req) {
  const host = req.headers.host;
  if (typeof host !== "string" || host === "") return false;
  const name2 = host.replace(/:\d+$/u, "").replace(/^\[|\]$/gu, "").toLowerCase();
  return name2 === "127.0.0.1" || name2 === "localhost" || name2 === "::1";
}
async function readJsonBody(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  const text = Buffer.concat(chunks).toString("utf8").trim();
  if (text === "") return {};
  const parsed = JSON.parse(text);
  return typeof parsed === "object" && parsed !== null && !Array.isArray(parsed) ? parsed : {};
}
function apply(ctx, config) {
  const homeDir = ctx.get("dshHomePaths")?.home ?? (process.env["DSH_HOME"] !== void 0 && process.env["DSH_HOME"] !== "" ? process.env["DSH_HOME"] : resolveDshHome());
  const resolvedHome = homeDir === "" ? process.cwd() : homeDir;
  const pool = new AccountPool(resolvedHome);
  const state = new PluginState(resolvedHome, { endpointEnabled: config.endpointEnabled !== false });
  const usage = new UsageLedger(resolvedHome);
  let stopped = false;
  let endpointKey = "";
  let pollTimer;
  let lastDesktopError = "";
  const runtimes = /* @__PURE__ */ new Map();
  const pendingLogins = /* @__PURE__ */ new Map();
  for (const variant of WORKBUDDY_VARIANTS) {
    runtimes.set(variant.id, {
      variant,
      internal: void 0,
      external: void 0,
      adapter: void 0,
      releaseAdapter: void 0,
      registered: false,
      error: "",
      externalError: ""
    });
  }
  const portFor = (variant) => {
    const raw = variant.region === "global" ? config.portAI : config.port;
    if (typeof raw === "number" && Number.isFinite(raw) && raw >= 0) return Math.floor(raw);
    return variant.region === "global" ? 8792 : 8791;
  };
  async function readFileText(path) {
    return await readFile4(path, "utf8");
  }
  async function migrateLegacyState() {
    const marker = join5(resolvedHome, MIGRATION_MARKER_FILENAME);
    if (existsSync(marker)) return;
    const candidates = [
      // 环境变量指向的根（旧行为）
      process.env["DSH_HOME"] === void 0 || process.env["DSH_HOME"] === "" ? void 0 : join5(process.env["DSH_HOME"], ACCOUNTS_FILENAME),
      // 默认 home
      join5(resolveDshHome(), ACCOUNTS_FILENAME)
    ].filter((path) => path !== void 0 && dirname4(path) !== resolvedHome);
    const target = join5(resolvedHome, ACCOUNTS_FILENAME);
    let targetCount = 0;
    if (existsSync(target)) {
      try {
        const parsed = JSON.parse(await readFileText(target));
        targetCount = Array.isArray(parsed.accounts) ? parsed.accounts.length : 0;
      } catch {
        targetCount = 0;
      }
    }
    let migrated = false;
    for (const source of candidates) {
      if (!existsSync(source)) continue;
      let sourceCount = 0;
      try {
        const parsed = JSON.parse(await readFileText(source));
        sourceCount = Array.isArray(parsed.accounts) ? parsed.accounts.length : 0;
      } catch {
        continue;
      }
      if (sourceCount <= targetCount) continue;
      try {
        await mkdir4(dirname4(target), { recursive: true });
        await copyFile(source, `${target}.migrated-from-legacy`);
        await copyFile(source, target);
        ctx.logger.info(`hyperworkbuddy: \u5DF2\u4ECE\u65E7\u4F4D\u7F6E\u8FC1\u79FB ${sourceCount} \u4E2A\u8D26\u53F7\uFF08${source}\uFF09`);
        targetCount = sourceCount;
        migrated = true;
      } catch (error) {
        ctx.logger.warn(`hyperworkbuddy: \u8FC1\u79FB\u65E7\u8D26\u53F7\u6587\u4EF6\u5931\u8D25 ${String(error)}`);
      }
    }
    if (!migrated) return;
    try {
      await writeFile4(marker, (/* @__PURE__ */ new Date()).toISOString(), "utf8");
    } catch (error) {
      ctx.logger.warn(`hyperworkbuddy: \u8FC1\u79FB\u6807\u8BB0\u5199\u5165\u5931\u8D25 ${String(error)}`);
    }
  }
  async function healMaximumContextWindows() {
    let healed = 0;
    for (const variant of WORKBUDDY_VARIANTS) {
      if (!state.usesMaximumContextWindow(variant.id)) continue;
      const cached = pool.modelsFor(variant.id);
      if (cached.length === 0) continue;
      if (cached.some((model) => model.supportedContextWindows.length > 0)) continue;
      for (const account of pool.list()) {
        if (account.variantId !== variant.id || account.disabled) continue;
        await pool.refreshCatalog(account.account, variant.id).catch(() => void 0);
      }
      const count = pool.modelsFor(variant.id).filter((model) => model.supportedContextWindows.length > 0).length;
      healed += count;
      ctx.logger.info(`hyperworkbuddy: ${variant.id} \u5F00\u5173\u5DF2\u5F00\u4F46\u7F13\u5B58\u7F3A\u7A97\u53E3\u6863\u4F4D\uFF0C\u5DF2\u8865\u5237\u76EE\u5F55\uFF08${count} \u4E2A\u6A21\u578B\u58F0\u660E\u4E86\u66F4\u5927\u6863\u4F4D\uFF09`);
    }
    return healed;
  }
  async function bootstrap() {
    await migrateLegacyState();
    await state.load();
    await pool.load();
    await usage.load();
    endpointKey = await ensureEndpointKey(resolvedHome);
    if (config.followDesktop !== false) {
      await pool.refreshFromDesktop();
      lastDesktopError = pool.refreshError;
    }
    if (pool.allModels().length === 0) {
      await pool.refreshAllCatalogs().catch(() => void 0);
    }
    void healMaximumContextWindows().then(() => {
      if (!stopped) invalidate();
    }).catch(() => void 0);
  }
  function startPolling() {
    pollTimer = setInterval(() => {
      if (stopped) return;
      void (async () => {
        try {
          if (config.followDesktop !== false) {
            await pool.refreshFromDesktop();
            lastDesktopError = pool.refreshError;
          }
          await pool.refreshExpiringTokens();
          await runAutoCheckin();
          invalidate();
        } catch (error) {
          ctx.logger.warn(`hyperworkbuddy: \u8D26\u53F7\u8F6E\u8BE2\u5931\u8D25 ${String(error)}`);
        }
      })();
    }, DESKTOP_POLL_MS);
    pollTimer.unref?.();
  }
  function todayKey() {
    const now = /* @__PURE__ */ new Date();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");
    return `${now.getFullYear()}-${month}-${day}`;
  }
  async function runAutoCheckin() {
    const day = todayKey();
    for (const variant of WORKBUDDY_VARIANTS) {
      if (!variant.hasCheckin) continue;
      if (!state.autoCheckinEnabled(variant.id)) continue;
      if (state.lastCheckinDay(variant.id) === day) continue;
      const accounts = pool.list().filter((a) => a.variantId === variant.id && !a.disabled);
      if (accounts.length === 0) continue;
      await state.markCheckinDay(variant.id, day);
      for (const account of accounts) {
        try {
          const result = await checkin(toCredential(account));
          if (!result.ok) {
            ctx.logger.warn(`hyperworkbuddy: ${account.account} \u81EA\u52A8\u7B7E\u5230\u5931\u8D25 ${result.message}`);
          }
        } catch (error) {
          ctx.logger.warn(`hyperworkbuddy: ${account.account} \u81EA\u52A8\u7B7E\u5230\u5931\u8D25 ${String(error)}`);
        }
      }
      for (const account of accounts) {
        await pool.refreshCredits(account.account, variant.id).catch(() => void 0);
      }
    }
  }
  function invalidate() {
    for (const runtime of runtimes.values()) runtime.adapter?.invalidate();
    ctx.emit("llm/adapters-updated");
  }
  function withNicknames(summary) {
    const names = new Map(pool.list().map((account) => [account.account, account.nickname]));
    return {
      ...summary,
      byAccount: summary.byAccount.map((row) => {
        const nickname = names.get(row.account);
        return nickname === void 0 || nickname === "" ? row : { ...row, nickname };
      })
    };
  }
  function panelDocument(importResult) {
    const now = Date.now();
    const variants = WORKBUDDY_VARIANTS.map((variant) => {
      const runtime = runtimes.get(variant.id);
      const hidden = new Set(state.hidden(variant.id));
      const accounts = pool.list().filter((account) => account.variantId === variant.id).map((account) => ({
        account: account.account,
        variantId: account.variantId,
        source: account.source,
        nickname: account.nickname,
        domain: account.domain,
        disabled: account.disabled,
        cooling: account.cooldownUntilMs > now,
        cooldownRemainingMs: Math.max(0, account.cooldownUntilMs - now),
        failStreak: account.failStreak,
        lastError: account.lastError,
        expiresAtMs: account.expiresAtMs,
        expired: account.expiresAtMs > 0 && account.expiresAtMs <= now,
        modelCount: account.models.length,
        catalogSource: account.catalogSource,
        catalogError: account.catalogError,
        ...account.credits === void 0 ? {} : { credits: account.credits },
        creditsAtMs: account.creditsAtMs
      }));
      const byId = /* @__PURE__ */ new Map();
      const useMaximum = state.usesMaximumContextWindow(variant.id);
      for (const account of pool.list()) {
        if (account.variantId !== variant.id) continue;
        for (const model of account.models) {
          if (byId.has(model.id)) continue;
          const declared = model.reasoning.supportedEfforts ?? [];
          const probed = state.probedFor(variant.id, model.id);
          const efforts = declared.length > 0 ? declared : probed;
          byId.set(model.id, {
            id: model.id,
            name: model.name,
            contextWindow: resolveContextWindow(model, useMaximum),
            declaredContextWindow: model.contextWindow,
            supportedContextWindows: model.supportedContextWindows,
            maxTokens: model.maxTokens,
            ...model.billing.credits === void 0 ? {} : { credits: model.billing.credits },
            free: model.billing.free,
            visible: !hidden.has(model.id),
            available: true,
            efforts,
            defaultEffort: model.reasoning.defaultEffort ?? "",
            effortsSource: declared.length > 0 ? "declared" : probed.length > 0 ? "probed" : "none"
          });
        }
      }
      for (const modelId of hidden) {
        if (byId.has(modelId)) continue;
        byId.set(modelId, {
          id: modelId,
          name: modelId,
          contextWindow: 0,
          declaredContextWindow: 0,
          supportedContextWindows: [],
          maxTokens: 0,
          free: false,
          visible: false,
          available: false,
          efforts: [],
          defaultEffort: "",
          effortsSource: "none"
        });
      }
      return {
        id: variant.id,
        displayName: variant.displayName,
        appName: variant.appName,
        region: variant.region,
        authFile: (() => {
          const explicit = process.env[variant.env];
          return explicit !== void 0 && explicit !== "" ? explicit : "";
        })(),
        baseUrl: runtime.external === void 0 ? "" : `${runtime.external.baseUrl()}/v1`,
        port: runtime.external?.port() ?? 0,
        externalRunning: runtime.external !== void 0,
        externalError: runtime.externalError,
        hasCheckin: variant.hasCheckin,
        autoCheckin: state.autoCheckinEnabled(variant.id),
        checkinDay: state.lastCheckinDay(variant.id),
        useMaximumContextWindow: useMaximum,
        providerRegistered: runtime.registered,
        providerError: runtime.error,
        accounts,
        models: [...byId.values()].sort((a, b) => a.id.localeCompare(b.id)),
        hiddenCount: hidden.size,
        desktopError: lastDesktopError
      };
    });
    return {
      ok: true,
      endpointEnabled: state.endpointEnabled,
      apiKey: (config.apiKeys ?? [])[0] ?? endpointKey,
      apiKeysConfigured: (config.apiKeys ?? []).length > 0,
      variants,
      usage: withNicknames(usage.summary()),
      ...importResult === void 0 ? {} : { importResult }
    };
  }
  async function stopExternal(variantId) {
    const runtime = runtimes.get(variantId);
    if (runtime === void 0) return;
    const shim = runtime.external;
    runtime.external = void 0;
    if (shim !== void 0) await shim.close().catch(() => void 0);
  }
  async function startExternal(variant) {
    const runtime = runtimes.get(variant.id);
    if (runtime.external !== void 0) return;
    try {
      const shim = createHyperShim({
        pool,
        // 端点只服务本版本的账号：同名模型在两区走不同上游，混用会发错区域。
        variantId: variant.id,
        apiKeys: () => config.apiKeys ?? [],
        fallbackKey: () => endpointKey,
        port: () => portFor(variant),
        // 对外端点不做隐藏过滤：隐藏只影响 DSH 选择器，外部客户端应拿到完整目录。
        hiddenModels: () => [],
        usage,
        logger: ctx.logger
      });
      await shim.ready;
      runtime.external = shim;
      runtime.externalError = "";
      ctx.logger.info(`hyperworkbuddy: ${variant.displayName} \u5BF9\u5916\u7AEF\u70B9 ${shim.baseUrl()}/v1`);
    } catch (error) {
      const detail = error instanceof Error ? error.message : String(error);
      runtime.externalError = detail.includes("EADDRINUSE") ? `\u7AEF\u53E3 ${portFor(variant)} \u5DF2\u88AB\u5360\u7528\uFF1B\u6539\u914D\u7F6E\u91CC\u7684 port/portAI\uFF0C\u6216\u8BBE 0 \u7528\u968F\u673A\u7AEF\u53E3` : detail;
      ctx.logger.error(`hyperworkbuddy: ${variant.displayName} \u5BF9\u5916\u7AEF\u70B9\u542F\u52A8\u5931\u8D25 ${detail}`);
      await stopExternal(variant.id);
    }
  }
  async function startProvider(variant) {
    const runtime = runtimes.get(variant.id);
    if (runtime.registered) return;
    runtime.error = "";
    try {
      const shim = createHyperShim({
        pool,
        variantId: variant.id,
        // 内部端点只认进程内密钥：外部客户端拿不到它。
        apiKeys: () => [],
        fallbackKey: () => "",
        // 随机端口：它是实现细节，不占用户配置的端口，也不对外暴露固定入口。
        port: () => 0,
        hiddenModels: () => [],
        usage,
        logger: ctx.logger
      });
      await shim.ready;
      runtime.internal = shim;
      const adapter = createHyperAdapter({
        providerId: variant.id,
        displayName: variant.displayName,
        shim,
        pool,
        variantId: variant.id,
        hidden: () => state.hidden(variant.id),
        probedEfforts: (modelId) => state.probedFor(variant.id, modelId),
        useMaximumContextWindow: () => state.usesMaximumContextWindow(variant.id),
        // 图片必须走宿主的附件服务，否则声明了图片能力的模型一发图就报
        // 「pi-ai image input requires the durable attachment service」。
        resolveAttachments: () => ctx.get("attachments"),
        resolveImageAccess: (attachments, ref) => resolveImageAttachmentAccess(
          attachments,
          (hostPath) => ctx.get("fs")?.processPathFromHostPath(hostPath),
          ref
        )
      });
      runtime.adapter = adapter;
      runtime.releaseAdapter = ctx.llm.registerAdapter([variant.id], adapter.adapter);
      runtime.registered = true;
      ctx.logger.info(`hyperworkbuddy: ${variant.displayName} provider \u5DF2\u6CE8\u518C\uFF0C\u8D26\u53F7 ${pool.available(variant.id).length} \u4E2A`);
    } catch (error) {
      runtime.error = error instanceof Error ? `${error.name}: ${error.message}` : String(error);
      ctx.logger.error(`hyperworkbuddy: ${variant.displayName} provider \u6CE8\u518C\u5931\u8D25 ${runtime.error}`);
      await stopProvider(variant.id);
    }
  }
  async function stopProvider(variantId) {
    const runtime = runtimes.get(variantId);
    if (runtime === void 0) return;
    try {
      runtime.releaseAdapter?.();
    } catch {
    }
    runtime.releaseAdapter = void 0;
    runtime.adapter = void 0;
    runtime.registered = false;
    const shim = runtime.internal;
    runtime.internal = void 0;
    if (shim !== void 0) await shim.close().catch(() => void 0);
  }
  async function applyEndpointSwitch() {
    for (const variant of WORKBUDDY_VARIANTS) {
      if (state.endpointEnabled) await startExternal(variant);
      else await stopExternal(variant.id);
    }
  }
  function registerRoutes() {
    ctx.inject(["webServer"], (webCtx) => {
      const mount = (path, handler) => {
        ctx.effect(() => {
          const dispose = webCtx.webServer.register({
            kind: "exact",
            path,
            handler: (req, res) => {
              void (async () => {
                if (!loopbackRequest(req)) {
                  json(res, 403, { ok: false, error: "\u4EC5\u5141\u8BB8\u56DE\u73AF\u8BBF\u95EE" });
                  return;
                }
                try {
                  await handler(req, res);
                } catch (error) {
                  if (!res.headersSent) json(res, 500, { ok: false, error: String(error) });
                  else res.end();
                }
              })();
            }
          });
          return () => {
            dispose();
          };
        }, `dsh-hyperworkbuddy: route ${path}`);
      };
      mount(`${ROUTE_PREFIX}/status`, async (_req, res) => {
        json(res, 200, panelDocument());
      });
      mount(`${ROUTE_PREFIX}/endpoint`, async (req, res) => {
        const body = await readJsonBody(req);
        await state.setEndpointEnabled(body["enabled"] === true);
        await applyEndpointSwitch();
        json(res, 200, { ok: true, document: panelDocument() });
      });
      mount(`${ROUTE_PREFIX}/apikey`, async (req, res) => {
        if ((config.apiKeys ?? []).length > 0) {
          json(res, 200, {
            ok: false,
            error: "\u5F53\u524D API Key \u6765\u81EA profile \u914D\u7F6E\uFF08apiKeys\uFF09\uFF0C\u8BF7\u5728\u914D\u7F6E\u91CC\u4FEE\u6539\uFF1B\u6216\u6E05\u7A7A\u8BE5\u914D\u7F6E\u540E\u7528\u8FD9\u91CC\u7684\u81EA\u5B9A\u4E49",
            document: panelDocument()
          });
          return;
        }
        const body = await readJsonBody(req);
        const custom = typeof body["key"] === "string" ? body["key"].trim() : void 0;
        const key = await resetEndpointKey(resolvedHome, custom);
        endpointKey = key;
        ctx.logger.info(custom === void 0 ? "hyperworkbuddy: API Key \u5DF2\u91CD\u65B0\u751F\u6210" : "hyperworkbuddy: API Key \u5DF2\u6309\u81EA\u5B9A\u4E49\u503C\u66F4\u65B0");
        json(res, 200, { ok: true, apiKey: key, document: panelDocument() });
      });
      mount(`${ROUTE_PREFIX}/model`, async (req, res) => {
        const body = await readJsonBody(req);
        const variantId = typeof body["variantId"] === "string" ? body["variantId"] : "";
        const modelId = typeof body["modelId"] === "string" ? body["modelId"] : "";
        if (variantFor(variantId) === void 0 || modelId === "") {
          json(res, 400, { ok: false, error: "\u7F3A\u5C11 variantId \u6216 modelId", document: panelDocument() });
          return;
        }
        await state.setVisible(variantId, modelId, body["visible"] === true);
        invalidate();
        json(res, 200, { ok: true, document: panelDocument() });
      });
      mount(`${ROUTE_PREFIX}/models`, async (req, res) => {
        const body = await readJsonBody(req);
        const variantId = typeof body["variantId"] === "string" ? body["variantId"] : "";
        const variant = variantFor(variantId);
        if (variant === void 0) {
          json(res, 400, { ok: false, error: "\u672A\u77E5\u7684 variantId", document: panelDocument() });
          return;
        }
        const visible = body["visible"] === true;
        const ids = Array.isArray(body["modelIds"]) ? body["modelIds"].filter((id) => typeof id === "string" && id !== "") : panelDocument().variants.find((v) => v.id === variantId)?.models.map((m) => m.id) ?? [];
        for (const modelId of ids) await state.setVisible(variantId, modelId, visible);
        invalidate();
        json(res, 200, { ok: true, document: panelDocument() });
      });
      mount(`${ROUTE_PREFIX}/refresh`, async (_req, res) => {
        await pool.refreshFromDesktop();
        lastDesktopError = pool.refreshError;
        const result = await pool.refreshAllCatalogs();
        invalidate();
        json(res, 200, { ok: true, ...result, document: panelDocument() });
      });
      mount(`${ROUTE_PREFIX}/contextwindow`, async (req, res) => {
        const body = await readJsonBody(req);
        const variantId = typeof body["variantId"] === "string" ? body["variantId"] : "";
        if (variantFor(variantId) === void 0) {
          json(res, 400, { ok: false, error: "\u672A\u77E5\u7684 variantId", document: panelDocument() });
          return;
        }
        const useMaximum = body["useMaximum"] === true;
        let catalogsOk = 0;
        let catalogsFailed = 0;
        if (useMaximum) {
          for (const account of pool.list().filter((a) => a.variantId === variantId)) {
            try {
              await pool.refreshCatalog(account.account, variantId);
              catalogsOk += 1;
            } catch {
              catalogsFailed += 1;
            }
          }
        }
        await state.setMaximumContextWindow(variantId, useMaximum);
        invalidate();
        json(res, 200, { ok: true, catalogsOk, catalogsFailed, document: panelDocument() });
      });
      mount(`${ROUTE_PREFIX}/usage`, async (_req, res) => {
        json(res, 200, { ok: true, usage: withNicknames(usage.summary()), document: panelDocument() });
      });
      mount(`${ROUTE_PREFIX}/usage/clear`, async (_req, res) => {
        await usage.clear();
        json(res, 200, { ok: true, document: panelDocument() });
      });
      mount(`${ROUTE_PREFIX}/variant/refresh`, async (req, res) => {
        const body = await readJsonBody(req);
        const variantId = typeof body["variantId"] === "string" ? body["variantId"] : "";
        if (variantFor(variantId) === void 0) {
          json(res, 400, { ok: false, error: "\u672A\u77E5\u7684 variantId", document: panelDocument() });
          return;
        }
        const force = body["force"] !== false;
        let catalogsOk = 0;
        let catalogsFailed = 0;
        for (const account of pool.list().filter((a) => a.variantId === variantId)) {
          try {
            await pool.refreshCatalog(account.account, variantId);
            catalogsOk += 1;
          } catch {
            catalogsFailed += 1;
          }
        }
        const credits = await pool.refreshAllCredits({ variantId, force });
        invalidate();
        json(res, 200, {
          ok: true,
          catalogsOk,
          catalogsFailed,
          creditsOk: credits.ok,
          creditsFailed: credits.failed,
          document: panelDocument()
        });
      });
      mount(`${ROUTE_PREFIX}/variant/checkin`, async (req, res) => {
        const body = await readJsonBody(req);
        const variantId = typeof body["variantId"] === "string" ? body["variantId"] : "";
        const variant = variantFor(variantId);
        if (variant === void 0) {
          json(res, 400, { ok: false, error: "\u672A\u77E5\u7684 variantId", document: panelDocument() });
          return;
        }
        if (!variant.hasCheckin) {
          json(res, 200, { ok: false, error: "\u8BE5\u7248\u672C\u6CA1\u6709\u7B7E\u5230\u529F\u80FD", document: panelDocument() });
          return;
        }
        const results = [];
        for (const account of pool.list().filter((a) => a.variantId === variantId && !a.disabled)) {
          try {
            const result = await checkin(toCredential(account));
            results.push({ account: account.account, ok: result.ok, message: result.message });
          } catch (error) {
            results.push({ account: account.account, ok: false, message: String(error) });
          }
        }
        for (const account of pool.list().filter((a) => a.variantId === variantId)) {
          await pool.refreshCredits(account.account, variantId).catch(() => void 0);
        }
        json(res, 200, { ok: true, results, document: panelDocument() });
      });
      mount(`${ROUTE_PREFIX}/variant/autocheckin`, async (req, res) => {
        const body = await readJsonBody(req);
        const variantId = typeof body["variantId"] === "string" ? body["variantId"] : "";
        const variant = variantFor(variantId);
        if (variant === void 0) {
          json(res, 400, { ok: false, error: "\u672A\u77E5\u7684 variantId", document: panelDocument() });
          return;
        }
        if (!variant.hasCheckin) {
          json(res, 200, { ok: false, error: "\u8BE5\u7248\u672C\u6CA1\u6709\u7B7E\u5230\u529F\u80FD", document: panelDocument() });
          return;
        }
        const enabled = body["enabled"] === true;
        await state.setAutoCheckin(variantId, enabled);
        if (enabled) await state.markCheckinDay(variantId, "");
        json(res, 200, { ok: true, document: panelDocument() });
        if (enabled) void runAutoCheckin().catch(() => void 0);
      });
      mount(`${ROUTE_PREFIX}/model/probe`, async (req, res) => {
        const body = await readJsonBody(req);
        const variantId = typeof body["variantId"] === "string" ? body["variantId"] : "";
        const modelId = typeof body["modelId"] === "string" ? body["modelId"] : "";
        if (variantFor(variantId) === void 0 || modelId === "") {
          json(res, 400, { ok: false, error: "\u7F3A\u5C11 variantId \u6216 modelId", document: panelDocument() });
          return;
        }
        const account = pool.available(variantId)[0];
        if (account === void 0) {
          json(res, 200, { ok: false, error: "\u8BE5\u7248\u672C\u6CA1\u6709\u53EF\u7528\u8D26\u53F7", document: panelDocument() });
          return;
        }
        try {
          const result = await probeEfforts(toCredential(account), modelId);
          if (result.aborted === "") {
            await state.setEfforts(variantId, modelId, result.accepted);
            invalidate();
          }
          json(res, 200, {
            ok: result.aborted === "",
            ...result,
            ...result.aborted === "" ? {} : { error: result.detail.at(-1)?.reason ?? "\u63A2\u6D4B\u4E2D\u6B62" },
            document: panelDocument()
          });
        } catch (error) {
          json(res, 200, { ok: false, error: String(error), document: panelDocument() });
        }
      });
      mount(`${ROUTE_PREFIX}/login/start`, async (req, res) => {
        const body = await readJsonBody(req);
        const variantId = typeof body["variantId"] === "string" ? body["variantId"] : "";
        const variant = variantFor(variantId);
        if (variant === void 0) {
          json(res, 400, { ok: false, error: "\u672A\u77E5\u7684 variantId", document: panelDocument() });
          return;
        }
        try {
          const { state: state2, authUrl } = await startLogin(variant);
          pendingLogins.set(state2, { variantId, startedAtMs: Date.now() });
          json(res, 200, { ok: true, state: state2, authUrl, document: panelDocument() });
        } catch (error) {
          json(res, 200, { ok: false, error: String(error), document: panelDocument() });
        }
      });
      mount(`${ROUTE_PREFIX}/login/poll`, async (req, res) => {
        const body = await readJsonBody(req);
        const state2 = typeof body["state"] === "string" ? body["state"] : "";
        const pending = pendingLogins.get(state2);
        if (pending === void 0) {
          json(res, 200, { ok: false, status: "unknown", error: "\u767B\u5F55\u4F1A\u8BDD\u5DF2\u5931\u6548\uFF0C\u8BF7\u91CD\u65B0\u53D1\u8D77", document: panelDocument() });
          return;
        }
        if (Date.now() - pending.startedAtMs > 10 * 60 * 1e3) {
          pendingLogins.delete(state2);
          json(res, 200, { ok: false, status: "expired", error: "\u767B\u5F55\u7A97\u53E3\u5DF2\u8FC7\u671F\uFF0C\u8BF7\u91CD\u65B0\u53D1\u8D77", document: panelDocument() });
          return;
        }
        const variant = variantFor(pending.variantId);
        const poll = await pollLogin(variant, state2);
        if (poll.status === "pending") {
          json(res, 200, { ok: true, status: "pending", message: poll.message, document: panelDocument() });
          return;
        }
        if (poll.status === "error") {
          json(res, 200, { ok: false, status: "error", error: poll.message, document: panelDocument() });
          return;
        }
        pendingLogins.delete(state2);
        const credential = poll.credential;
        await pool.upsert(credential);
        await pool.refreshCatalog(credential.account, credential.variantId).catch(() => void 0);
        await pool.refreshCredits(credential.account, credential.variantId).catch(() => void 0);
        invalidate();
        json(res, 200, {
          ok: true,
          status: "ok",
          account: { account: credential.account, nickname: credential.nickname, uid: credential.uid },
          document: panelDocument()
        });
      });
      mount(`${ROUTE_PREFIX}/import`, async (req, res) => {
        const body = await readJsonBody(req);
        const payload = typeof body["payload"] === "string" ? body["payload"] : "";
        const outcome = parseHubExport(payload);
        if (outcome.error !== "") {
          json(res, 200, { ok: false, document: panelDocument({ imported: 0, skipped: [], error: outcome.error }) });
          return;
        }
        for (const credential of outcome.credentials) await pool.upsert(credential);
        for (const credential of outcome.credentials) {
          await pool.refreshCatalog(credential.account, credential.variantId).catch(() => void 0);
        }
        invalidate();
        json(res, 200, {
          ok: true,
          document: panelDocument({ imported: outcome.credentials.length, skipped: outcome.skipped, error: "" })
        });
      });
      mount(`${ROUTE_PREFIX}/account/import`, async (req, res) => {
        const body = await readJsonBody(req);
        const variantId = typeof body["variantId"] === "string" ? body["variantId"] : "";
        const variant = variantFor(variantId);
        if (variant === void 0) {
          json(res, 400, { ok: false, error: "\u672A\u77E5\u7684\u53D8\u4F53 id", document: panelDocument() });
          return;
        }
        const accessToken = typeof body["accessToken"] === "string" ? body["accessToken"].trim() : "";
        if (accessToken === "") {
          json(res, 400, { ok: false, error: "accessToken \u4E0D\u80FD\u4E3A\u7A7A", document: panelDocument() });
          return;
        }
        const uid = typeof body["uid"] === "string" ? body["uid"].trim() : "";
        const enterpriseId = typeof body["enterpriseId"] === "string" ? body["enterpriseId"].trim() : "";
        const domain = typeof body["domain"] === "string" && body["domain"].trim() !== "" ? body["domain"].trim() : variant.region === "global" ? "www.workbuddy.ai" : "www.workbuddy.cn";
        const account = `${uid}:${enterpriseId}`;
        await pool.upsert({
          variantId,
          account,
          uid,
          enterpriseId,
          domain,
          nickname: typeof body["nickname"] === "string" ? body["nickname"] : "",
          accessToken,
          refreshToken: typeof body["refreshToken"] === "string" ? body["refreshToken"] : "",
          expiresAtMs: Number.isFinite(Number(body["expiresAtMs"])) ? Number(body["expiresAtMs"]) : 0,
          refreshExpiresAtMs: 0
        });
        let catalogError = "";
        try {
          await pool.refreshCatalog(account, variantId);
        } catch (error) {
          catalogError = String(error);
        }
        invalidate();
        json(res, 200, { ok: true, catalogError, document: panelDocument() });
      });
      mount(`${ROUTE_PREFIX}/account/remove`, async (req, res) => {
        const body = await readJsonBody(req);
        const account = typeof body["account"] === "string" ? body["account"] : "";
        const variantId = typeof body["variantId"] === "string" ? body["variantId"] : "";
        const removed = await pool.remove(account, variantId);
        invalidate();
        json(res, 200, { ok: removed, document: panelDocument() });
      });
      mount(`${ROUTE_PREFIX}/account/toggle`, async (req, res) => {
        const body = await readJsonBody(req);
        const account = typeof body["account"] === "string" ? body["account"] : "";
        const variantId = typeof body["variantId"] === "string" ? body["variantId"] : "";
        const changed = await pool.setDisabled(account, variantId, body["disabled"] === true);
        invalidate();
        json(res, 200, { ok: changed, document: panelDocument() });
      });
      mount(`${ROUTE_PREFIX}/account/credits`, async (req, res) => {
        const body = await readJsonBody(req);
        const account = typeof body["account"] === "string" ? body["account"] : "";
        const variantId = typeof body["variantId"] === "string" ? body["variantId"] : "";
        try {
          await pool.refreshCredits(account, variantId, { force: true });
          json(res, 200, { ok: true, document: panelDocument() });
        } catch (error) {
          json(res, 200, { ok: false, error: String(error), document: panelDocument() });
        }
      });
      mount(`${ROUTE_PREFIX}/account/catalog`, async (req, res) => {
        const body = await readJsonBody(req);
        const account = typeof body["account"] === "string" ? body["account"] : "";
        const variantId = typeof body["variantId"] === "string" ? body["variantId"] : "";
        try {
          await pool.refreshCatalog(account, variantId);
          invalidate();
          json(res, 200, { ok: true, document: panelDocument() });
        } catch (error) {
          json(res, 200, { ok: false, error: String(error), document: panelDocument() });
        }
      });
      mount(`${ROUTE_PREFIX}/account/test`, async (req, res) => {
        const body = await readJsonBody(req);
        const account = typeof body["account"] === "string" ? body["account"] : "";
        const variantId = typeof body["variantId"] === "string" ? body["variantId"] : "";
        try {
          const result = await pool.testAccount(account, variantId);
          invalidate();
          json(res, 200, { ok: result.ok, ...result, ...result.ok ? {} : { error: result.message }, document: panelDocument() });
        } catch (error) {
          json(res, 200, { ok: false, error: String(error), document: panelDocument() });
        }
      });
    });
  }
  ctx.effect(() => {
    void (async () => {
      try {
        await bootstrap();
        if (stopped) return;
        for (const variant of WORKBUDDY_VARIANTS) await startProvider(variant);
        if (stopped) return;
        await applyEndpointSwitch();
        if (stopped) return;
        registerRoutes();
        startPolling();
        const registered = [...runtimes.values()].filter((r) => r.registered).length;
        ctx.logger.info(`hyperworkbuddy: \u5C31\u7EEA\uFF0Cprovider ${registered}/${WORKBUDDY_VARIANTS.length}\uFF0C\u5BF9\u5916\u7AEF\u70B9${state.endpointEnabled ? "\u5DF2\u542F\u7528" : "\u5DF2\u5173\u95ED"}`);
      } catch (error) {
        ctx.logger.error(`hyperworkbuddy: \u542F\u52A8\u5931\u8D25 ${String(error)}`);
      }
    })();
    return () => {
      stopped = true;
      if (pollTimer !== void 0) clearInterval(pollTimer);
      for (const runtime of runtimes.values()) {
        try {
          runtime.releaseAdapter?.();
        } catch {
        }
        void runtime.internal?.close();
        void runtime.external?.close();
      }
    };
  }, "dsh-hyperworkbuddy: lifecycle");
  ctx.provide("hyperworkbuddy", {
    pool,
    state,
    document: panelDocument,
    /** 对外端点地址；关闭时为 undefined。 */
    endpoint: (variantId) => {
      const shim = runtimes.get(variantId)?.external;
      return shim === void 0 ? void 0 : `${shim.baseUrl()}/v1`;
    },
    /** 内部端点地址（DSH 自己在用）。 */
    internalEndpoint: (variantId) => {
      const shim = runtimes.get(variantId)?.internal;
      return shim === void 0 ? void 0 : `${shim.baseUrl()}/v1`;
    },
    shimToken: (variantId) => runtimes.get(variantId)?.internal?.token(),
    diagnosis: () => [...runtimes.values()].map((runtime) => ({
      variantId: runtime.variant.id,
      registered: runtime.registered,
      error: runtime.error,
      externalRunning: runtime.external !== void 0
    }))
  });
}
export {
  Config,
  ROUTE_PREFIX,
  WORKBUDDY_VARIANTS,
  apply,
  inject,
  name,
  toCredential,
  variantFor
};
