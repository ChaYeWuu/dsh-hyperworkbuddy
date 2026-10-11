window.__ModuleLoader__.load({
	id: "dsh-hyperworkbuddy",
	factory: (require) => {
		var module = { exports: {} };
		var exports = module.exports;
"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name2 in all)
    __defProp(target, name2, { get: all[name2], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/client/index.tsx
var index_exports = {};
__export(index_exports, {
  BUNDLE_NAME: () => BUNDLE_NAME,
  apply: () => apply,
  inject: () => inject,
  name: () => name
});
module.exports = __toCommonJS(index_exports);
var React = __toESM(require("react"), 1);
var name = "dsh-hyperworkbuddy-client";
var BUNDLE_NAME = "dsh-hyperworkbuddy";
var inject = ["slots", "locale"];
var ROUTE_PREFIX = "/api-hyperworkbuddy";
var zh = {
  nav: "WorkBuddy",
  title: "WorkBuddy \u591A\u8D26\u53F7",
  subtitle: "\u7BA1\u7406\u56FD\u5185\u7248\u4E0E\u56FD\u9645\u7248\u8D26\u53F7\u6C60\uFF0C\u5E76\u628A\u6A21\u578B\u63A5\u8FDB DSH\u3002",
  endpointSection: "OpenAI \u517C\u5BB9\u7AEF\u70B9",
  endpointSwitch: "\u5BF9\u5916\u63D0\u4F9B OpenAI \u517C\u5BB9\u7AEF\u70B9",
  endpointSwitchHint: "\u5173\u95ED\u53EA\u5F71\u54CD\u5916\u90E8\u5BA2\u6237\u7AEF\uFF08Codex / Claude Code \u7B49\uFF09\uFF1A\u7AEF\u70B9\u505C\u6B62\u76D1\u542C\u5E76\u91CA\u653E\u7AEF\u53E3\u3002DSH \u91CC\u7684 WorkBuddy \u6A21\u578B\u7167\u5E38\u53EF\u7528\uFF0C\u4E0D\u53D7\u5F71\u54CD\u3002",
  endpointOn: "\u5BF9\u5916\u5DF2\u5F00\u542F",
  endpointOff: "\u5BF9\u5916\u5DF2\u5173\u95ED",
  endpointBindFailed: "\u5BF9\u5916\u7AEF\u70B9\u672A\u542F\u52A8",
  externalOnly: "\u4EC5\u5916\u90E8\u5BA2\u6237\u7AEF",
  copy: "\u590D\u5236",
  copied: "\u5DF2\u590D\u5236",
  apiKey: "API Key",
  apiKeyHint: "\u5916\u90E8\u5BA2\u6237\u7AEF\u586B\u8FD9\u4E2A Key\uFF1BDSH \u81EA\u8EAB\u4E0D\u9700\u8981\u3002",
  endpointHint: "\u628A\u5730\u5740\u586B\u8FDB Codex / Claude Code \u7B49\u5BA2\u6237\u7AEF\u7684 Base URL\u3002",
  refresh: "\u91CD\u65B0\u626B\u63CF\u5E76\u5237\u65B0",
  refreshVariant: "\u4E00\u952E\u5237\u65B0",
  refreshDone: "\u5DF2\u5237\u65B0 {ok} \u4E2A\u8D26\u53F7\uFF08\u5931\u8D25 {failed}\uFF09\uFF0C\u79EF\u5206 {credits} \u4E2A",
  refreshAllHint: "\u5237\u65B0\u8BE5\u7248\u672C\u5168\u90E8\u8D26\u53F7\u7684\u6A21\u578B\u4E0E\u79EF\u5206\u3002",
  checkinAll: "\u4E00\u952E\u7B7E\u5230",
  checkinDone: "\u7B7E\u5230\u5B8C\u6210\uFF1A\u6210\u529F {ok} / {total}",
  externalEndpoint: "\u5BF9\u5916\u7AEF\u70B9",
  linkLogin: "\u94FE\u63A5\u767B\u5F55",
  linkLoginHint: "\u5728\u6D4F\u89C8\u5668\u91CC\u5B8C\u6210\u6388\u6743\u5373\u53EF\u81EA\u52A8\u52A0\u8D26\u53F7\uFF0C\u65E0\u9700\u624B\u52A8\u590D\u5236 token\u3002",
  linkLoginStart: "\u751F\u6210\u6388\u6743\u94FE\u63A5",
  linkLoginOpening: "\u6B63\u5728\u751F\u6210\u2026",
  linkLoginStep: "\u2460 \u70B9\u4E0B\u9762\u7684\u6309\u94AE\u5728\u6D4F\u89C8\u5668\u91CC\u6253\u5F00\u6388\u6743\u9875\uFF1B\u2461 \u5B8C\u6210\u767B\u5F55\u540E\u56DE\u5230\u8FD9\u91CC\uFF0C\u63D2\u4EF6\u4F1A\u81EA\u52A8\u6536\u53D6\u8D26\u53F7\u3002",
  linkLoginOpen: "\u6253\u5F00\u6388\u6743\u9875",
  linkLoginWaiting: "\u7B49\u5F85\u6D4F\u89C8\u5668\u5B8C\u6210\u6388\u6743\u2026",
  linkLoginOk: "\u5DF2\u6DFB\u52A0\u8D26\u53F7 {name}",
  linkLoginFailed: "\u767B\u5F55\u672A\u5B8C\u6210",
  addAccount: "\u5BFC\u5165\u5355\u4E2A\u8D26\u53F7",
  addHint: "\u7C98\u8D34 accessToken \u53EF\u8FFD\u52A0\u5355\u4E2A\u8D26\u53F7\u3002",
  importHub: "\u5BFC\u5165 hub \u5BFC\u51FA",
  importHubHint: "\u7C98\u8D34 workbuddy2api-hub \u7684\u5BFC\u51FA JSON\uFF08\u6216\u88F8\u8D26\u53F7\u6570\u7EC4 / \u5355\u4E2A\u8D26\u53F7\u5BF9\u8C61\uFF09\uFF0C\u53EF\u4E00\u6B21\u5BFC\u5165\u591A\u4E2A\u8D26\u53F7\u3002",
  importHubPlaceholder: '{ "format": "workbuddy-accounts", "accounts": [ \u2026 ] }',
  doImport: "\u5BFC\u5165",
  importOk: "\u5DF2\u5BFC\u5165 {n} \u4E2A\u8D26\u53F7",
  importSkipped: "\uFF0C\u8DF3\u8FC7 {n} \u4E2A",
  variant: "\u7248\u672C",
  accessToken: "accessToken",
  uid: "uid\uFF08\u53EF\u9009\uFF09",
  enterpriseId: "enterpriseId\uFF08\u53EF\u9009\uFF09",
  nickname: "\u5907\u6CE8\u540D\uFF08\u53EF\u9009\uFF09",
  cancel: "\u53D6\u6D88",
  expand: "\u5C55\u5F00",
  collapse: "\u6536\u8D77",
  accounts: "\u8D26\u53F7",
  accountsEmpty: "\u8BE5\u7248\u672C\u8FD8\u6CA1\u6709\u8D26\u53F7\u3002\u767B\u5F55\u5BF9\u5E94\u684C\u9762 App\uFF0C\u6216\u5728\u4E0B\u65B9\u5BFC\u5165\u3002",
  remove: "\u79FB\u9664",
  enable: "\u542F\u7528",
  disable: "\u505C\u7528",
  refreshCredits: "\u5237\u65B0\u79EF\u5206",
  refreshCatalog: "\u5237\u65B0\u6A21\u578B",
  sourceDesktop: "\u684C\u9762 App",
  sourceManual: "\u5BFC\u5165",
  statusReady: "\u53EF\u7528",
  statusDisabled: "\u5DF2\u505C\u7528",
  statusCooling: "\u51B7\u5374\u4E2D",
  statusExpired: "\u51ED\u636E\u8FC7\u671F",
  credits: "\u79EF\u5206",
  creditsUnknown: "\u672A\u83B7\u53D6",
  creditsAt: "\u66F4\u65B0\u4E8E",
  packages: "\u5957\u9910\u660E\u7EC6",
  packagesNone: "\u6CA1\u6709\u53EF\u7528\u5957\u9910",
  expiresAt: "\u5230\u671F",
  lastError: "\u6700\u8FD1\u9519\u8BEF",
  working: "\u5904\u7406\u4E2D",
  modelsSection: "\u6A21\u578B\u5F00\u5173",
  modelsHint: "\u5173\u6389\u7684\u6A21\u578B\u4E0D\u4F1A\u51FA\u73B0\u5728 DSH \u7684\u6A21\u578B\u9009\u62E9\u5668\u91CC\uFF1B\u5DF2\u7ECF\u5728\u7528\u8BE5\u6A21\u578B\u7684\u4F1A\u8BDD\u4E0D\u53D7\u5F71\u54CD\u3002",
  showAll: "\u5168\u90E8\u5F00\u542F",
  hideAll: "\u5168\u90E8\u5173\u95ED",
  noModels: "\u8FD8\u6CA1\u6709\u6A21\u578B\u3002\u5148\u70B9\u4E0A\u9762\u7684\u300C\u91CD\u65B0\u626B\u63CF\u5E76\u5237\u65B0\u300D\u3002",
  gone: "\u4E0A\u6E38\u5DF2\u4E0B\u67B6",
  reasoning: "\u63A8\u7406\u6863\u4F4D",
  reasoningDefault: "\u9ED8\u8BA4",
  loading: "\u52A0\u8F7D\u4E2D\u2026",
  loadFailed: "\u52A0\u8F7D\u5931\u8D25",
  retry: "\u91CD\u8BD5",
  regionCn: "\u56FD\u5185\u7248",
  regionGlobal: "\u56FD\u9645\u7248"
};
var en = {
  nav: "WorkBuddy",
  title: "WorkBuddy Accounts",
  subtitle: "Manage the CN and international account pools and bring their models into DSH.",
  endpointSection: "OpenAI-compatible endpoint",
  endpointSwitch: "Serve the OpenAI-compatible endpoint",
  endpointSwitchHint: "Turning this off only affects external clients (Codex / Claude Code): the listener stops and the port is released. The WorkBuddy models inside DSH keep working.",
  endpointOn: "Serving",
  endpointOff: "Not serving",
  endpointBindFailed: "External endpoint not running",
  externalOnly: "external clients only",
  copy: "Copy",
  copied: "Copied",
  apiKey: "API Key",
  apiKeyHint: "Use this key in external clients; DSH itself does not need it.",
  endpointHint: "Use this as the Base URL in Codex / Claude Code and other clients.",
  refresh: "Rescan and refresh",
  refreshVariant: "Refresh all",
  refreshDone: "Refreshed {ok} account(s) ({failed} failed), {credits} with credits",
  refreshAllHint: "Refresh models and credits for every account in this variant.",
  checkinAll: "Daily check-in",
  checkinDone: "Check-in: {ok} / {total} succeeded",
  externalEndpoint: "External endpoint",
  linkLogin: "Sign in via link",
  linkLoginHint: "Authorise in your browser and the account is added automatically \u2014 no token copying.",
  linkLoginStart: "Generate authorisation link",
  linkLoginOpening: "Generating\u2026",
  linkLoginStep: "\u2460 Open the authorisation page below in your browser; \u2461 come back here once signed in \u2014 the plugin collects the account automatically.",
  linkLoginOpen: "Open authorisation page",
  linkLoginWaiting: "Waiting for the browser to finish\u2026",
  linkLoginOk: "Added account {name}",
  linkLoginFailed: "Sign-in did not complete",
  addAccount: "Import one account",
  addHint: "Paste an accessToken to add a single account.",
  importHub: "Import hub export",
  importHubHint: "Paste a workbuddy2api-hub export JSON (or a bare account array / single account object) to import many at once.",
  importHubPlaceholder: '{ "format": "workbuddy-accounts", "accounts": [ \u2026 ] }',
  doImport: "Import",
  importOk: "Imported {n} account(s)",
  importSkipped: ", skipped {n}",
  variant: "Variant",
  accessToken: "accessToken",
  uid: "uid (optional)",
  enterpriseId: "enterpriseId (optional)",
  nickname: "Label (optional)",
  cancel: "Cancel",
  expand: "Expand",
  collapse: "Collapse",
  accounts: "Accounts",
  accountsEmpty: "No accounts for this variant yet. Sign in to its desktop app, or import below.",
  remove: "Remove",
  enable: "Enable",
  disable: "Disable",
  refreshCredits: "Refresh credits",
  refreshCatalog: "Refresh models",
  sourceDesktop: "Desktop app",
  sourceManual: "Imported",
  statusReady: "Ready",
  statusDisabled: "Disabled",
  statusCooling: "Cooling down",
  statusExpired: "Expired",
  credits: "Credits",
  creditsUnknown: "not fetched",
  creditsAt: "updated",
  packages: "Packages",
  packagesNone: "no usable package",
  expiresAt: "Expires",
  lastError: "Last error",
  working: "Working",
  modelsSection: "Model switches",
  modelsHint: "A switched-off model disappears from the DSH picker; sessions already using it are unaffected.",
  showAll: "Enable all",
  hideAll: "Disable all",
  noModels: 'No models yet. Press "Rescan and refresh" above.',
  gone: "no longer served",
  reasoning: "Reasoning levels",
  reasoningDefault: "default",
  loading: "Loading\u2026",
  loadFailed: "Failed to load",
  retry: "Retry",
  regionCn: "CN",
  regionGlobal: "International"
};
async function fetchStatus() {
  const response = await fetch(`${ROUTE_PREFIX}/status`, { headers: { "Accept": "application/json" } });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return await response.json();
}
async function postDocument(path, body) {
  const response = await fetch(`${ROUTE_PREFIX}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
  const payload = await response.json();
  if (payload.document !== void 0) return payload.document;
  throw new Error(payload.error ?? `HTTP ${response.status}`);
}
function formatTime(ms) {
  if (!Number.isFinite(ms) || ms <= 0) return "\u2014";
  const date = new Date(ms);
  const pad = (n) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}
function formatDuration(ms) {
  if (ms <= 0) return "0s";
  const seconds = Math.ceil(ms / 1e3);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.ceil(seconds / 60);
  if (minutes < 60) return `${minutes}m`;
  return `${Math.ceil(minutes / 60)}h`;
}
var S = {
  root: { display: "flex", flexDirection: "column", gap: "18px", padding: "4px 0 24px", fontSize: "13px" },
  h1: { fontSize: "16px", fontWeight: 600, margin: 0 },
  sub: { color: "var(--dsw-alias-label-secondary, #888)", margin: "4px 0 0", fontSize: "12px" },
  card: { border: "1px solid var(--dsw-alias-border-l2, #3333)", borderRadius: "10px", padding: "14px 16px" },
  cardTitle: { fontSize: "13px", fontWeight: 600, margin: "0 0 10px", display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" },
  row: { display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" },
  mono: { fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace", fontSize: "12px" },
  btn: {
    border: "1px solid var(--dsw-alias-border-l2, #3333)",
    background: "transparent",
    color: "inherit",
    borderRadius: "6px",
    padding: "4px 10px",
    fontSize: "12px",
    cursor: "pointer",
    fontFamily: "inherit"
  },
  btnBusy: {
    border: "1px solid var(--dsw-alias-border-l2, #3333)",
    background: "transparent",
    color: "var(--dsw-alias-label-secondary, #888)",
    borderRadius: "6px",
    padding: "4px 10px",
    fontSize: "12px",
    cursor: "progress",
    fontFamily: "inherit"
  },
  btnPrimary: {
    border: "1px solid var(--dsw-alias-brand-primary-new-colorprimary-new-color, #4a7dff)",
    background: "var(--dsw-alias-brand-primary-new-colorprimary-new-color, #4a7dff)",
    color: "#fff",
    borderRadius: "6px",
    padding: "4px 12px",
    fontSize: "12px",
    cursor: "pointer",
    fontFamily: "inherit"
  },
  input: {
    border: "1px solid var(--dsw-alias-border-l2, #3333)",
    background: "transparent",
    color: "inherit",
    borderRadius: "6px",
    padding: "5px 8px",
    fontSize: "12px",
    fontFamily: "inherit",
    width: "100%",
    boxSizing: "border-box"
  },
  badge: { borderRadius: "4px", padding: "1px 6px", fontSize: "11px", border: "1px solid var(--dsw-alias-border-l2, #3333)", whiteSpace: "nowrap" },
  badgeOk: { background: "rgba(60,180,110,.15)", borderColor: "rgba(60,180,110,.4)" },
  badgeWarn: { background: "rgba(230,160,40,.15)", borderColor: "rgba(230,160,40,.4)" },
  badgeOff: { background: "rgba(140,140,140,.15)", borderColor: "rgba(140,140,140,.4)" },
  badgeInfo: { background: "rgba(90,140,240,.15)", borderColor: "rgba(90,140,240,.4)" },
  accountRow: { border: "1px solid var(--dsw-alias-border-l2, #3333)", borderRadius: "8px", padding: "10px 12px", marginBottom: "8px" },
  muted: { color: "var(--dsw-alias-label-secondary, #888)", fontSize: "12px" },
  error: { color: "#e05a5a", fontSize: "12px", wordBreak: "break-all" },
  variantHead: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    paddingBottom: "8px",
    marginBottom: "10px",
    borderBottom: "1px solid var(--dsw-alias-border-l2, #3333)"
  },
  modelGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: "6px" },
  modelCell: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    border: "1px solid var(--dsw-alias-border-l2, #3333)",
    borderRadius: "6px",
    padding: "6px 8px",
    fontSize: "12px"
  },
  switchRow: { display: "flex", alignItems: "center", gap: "8px", cursor: "pointer", userSelect: "none" },
  // 全局进行中提示条：任何操作在跑都可见
  progress: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    fontSize: "12px",
    color: "var(--dsw-alias-label-secondary, #888)",
    border: "1px solid var(--dsw-alias-border-l2, #3333)",
    borderRadius: "8px",
    padding: "6px 10px"
  },
  caret: { fontSize: "11px", width: "12px", display: "inline-block", textAlign: "center" },
  pkgRow: { display: "flex", justifyContent: "space-between", gap: "12px", fontSize: "12px", padding: "1px 0" }
};
function apply(ctx) {
  const namespace = "settings.hyperworkbuddy";
  ctx.effect(() => ctx.locale.register(namespace, { zh, en }), "dsh-hyperworkbuddy: copy");
  const rawT = ctx.locale.bind(namespace);
  const t = (key, vars) => {
    let text = rawT(key);
    if (vars !== void 0) {
      for (const [name2, value] of Object.entries(vars)) text = text.replace(`{${name2}}`, String(value));
    }
    return text;
  };
  try {
    ctx.slots.inject("settings.section", () => ctx.slots.register({
      name: "settings.section",
      id: "hyperworkbuddy",
      order: 55,
      label: () => rawT("nav"),
      inject: () => ({ t })
    }, HyperWorkBuddyPanel) ?? (() => {
    }));
  } catch (error) {
    console.error("[dsh-hyperworkbuddy] settings.section \u6CE8\u518C\u5931\u8D25", error);
  }
}
function HyperWorkBuddyPanel(props) {
  const { t } = props;
  const { useCallback, useEffect, useState } = React;
  const h = React.createElement;
  const [doc, setDoc] = useState(void 0);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState("");
  const [copied, setCopied] = useState("");
  const [collapsed, setCollapsed] = useState({});
  const [openPkgs, setOpenPkgs] = useState({});
  const [openForm, setOpenForm] = useState("");
  const [login, setLogin] = useState(void 0);
  const [form, setForm] = useState({ variantId: "", accessToken: "", uid: "", enterpriseId: "", nickname: "" });
  const [hubText, setHubText] = useState("");
  const [notice, setNotice] = useState("");
  const load = useCallback(async () => {
    try {
      setDoc(await fetchStatus());
      setError("");
    } catch (err) {
      setError(String(err));
    }
  }, []);
  useEffect(() => {
    void load();
  }, [load]);
  const run = useCallback(async (key, path, body) => {
    setBusy(key);
    try {
      setDoc(await postDocument(path, body));
      setError("");
    } catch (err) {
      setError(String(err));
    } finally {
      setBusy("");
    }
  }, []);
  const copyText = useCallback(async (key, text) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(key);
      setTimeout(() => setCopied(""), 1500);
    } catch {
    }
  }, []);
  if (error !== "" && doc === void 0) {
    return h(
      "div",
      { style: S.root },
      h("div", { style: S.error }, `${t("loadFailed")}: ${error}`),
      h("button", { style: S.btn, onClick: () => void load() }, t("retry"))
    );
  }
  if (doc === void 0) return h("div", { style: S.root }, h("div", { style: S.muted }, t("loading")));
  const busyAny = busy !== "";
  const actionButton = (key, label, onClick, busyLabel) => {
    const isBusy = busy === key;
    return h("button", {
      style: isBusy ? S.btnBusy : S.btn,
      disabled: busyAny,
      onClick
    }, isBusy ? `${busyLabel ?? label} \u2026` : label);
  };
  const accountCard = (account) => {
    const statusLabel = account.disabled ? t("statusDisabled") : account.expired ? t("statusExpired") : account.cooling ? `${t("statusCooling")} ${formatDuration(account.cooldownRemainingMs)}` : t("statusReady");
    const statusStyle = account.disabled ? { ...S.badge, ...S.badgeOff } : account.expired || account.cooling ? { ...S.badge, ...S.badgeWarn } : { ...S.badge, ...S.badgeOk };
    const key = `${account.variantId}|${account.account}`;
    const credits = account.credits;
    const creditsText = credits === void 0 ? t("creditsUnknown") : credits.remaining === void 0 ? "\u2014" : credits.total === void 0 ? String(credits.remaining) : `${credits.remaining} / ${credits.total}`;
    const useful = (credits?.packages ?? []).filter((pkg) => (pkg.remain ?? 0) > 0);
    const pkgOpen = openPkgs[key] === true;
    return h(
      "div",
      { style: S.accountRow, key },
      h(
        "div",
        { style: { ...S.row, justifyContent: "space-between" } },
        h(
          "div",
          { style: S.row },
          h("span", { style: S.badge }, account.source === "desktop" ? t("sourceDesktop") : t("sourceManual")),
          h("span", { style: statusStyle }, statusLabel),
          h("span", { style: { ...S.muted, ...S.mono } }, account.account)
        ),
        h(
          "div",
          { style: S.row },
          actionButton(`credits:${key}`, t("refreshCredits"), () => {
            void run(`credits:${key}`, "/account/credits", { account: account.account, variantId: account.variantId });
          }, t("working")),
          actionButton(`catalog:${key}`, t("refreshCatalog"), () => {
            void run(`catalog:${key}`, "/account/catalog", { account: account.account, variantId: account.variantId });
          }, t("working")),
          actionButton(`toggle:${key}`, account.disabled ? t("enable") : t("disable"), () => {
            void run(`toggle:${key}`, "/account/toggle", {
              account: account.account,
              variantId: account.variantId,
              disabled: !account.disabled
            });
          }),
          actionButton(`remove:${key}`, t("remove"), () => {
            void run(`remove:${key}`, "/account/remove", { account: account.account, variantId: account.variantId });
          })
        )
      ),
      h(
        "div",
        { style: { ...S.row, marginTop: "6px", gap: "16px" } },
        h("span", { style: S.muted }, account.nickname === "" ? "\u2014" : account.nickname),
        account.domain === "" ? null : h("span", { style: S.muted }, account.domain),
        h("span", { style: S.muted }, `${t("models")}: ${account.modelCount}`),
        h("span", { style: S.muted }, `${t("expiresAt")}: ${formatTime(account.expiresAtMs)}`)
      ),
      h(
        "div",
        { style: { ...S.row, marginTop: "6px", gap: "10px" } },
        h("span", null, `${t("credits")}: `, h("strong", null, creditsText)),
        credits === void 0 ? null : h("span", { style: S.muted }, `${t("creditsAt")} ${formatTime(account.creditsAtMs)}`),
        useful.length === 0 ? null : h("button", {
          style: S.btn,
          onClick: () => setOpenPkgs((prev) => ({ ...prev, [key]: !pkgOpen }))
        }, `${t("packages")}\uFF08${useful.length}\uFF09${pkgOpen ? " \u25BE" : " \u25B8"}`)
      ),
      pkgOpen ? h(
        "div",
        { style: { marginTop: "6px", paddingLeft: "8px" } },
        useful.length === 0 ? h("div", { style: S.muted }, t("packagesNone")) : useful.map((pkg, index) => h(
          "div",
          { key: `${pkg.name}-${index}`, style: S.pkgRow },
          h("span", { style: { overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" } }, pkg.name),
          h("span", { style: S.muted }, `${pkg.remain ?? 0}${pkg.size === void 0 ? "" : ` / ${pkg.size}`}`)
        ))
      ) : null,
      account.lastError === "" ? null : h("div", { style: { ...S.error, marginTop: "4px" } }, `${t("lastError")}: ${account.lastError}`),
      account.catalogError === "" ? null : h("div", { style: { ...S.error, marginTop: "4px" } }, account.catalogError)
    );
  };
  const variantSection = (variant) => {
    const regionLabel = variant.region === "cn" ? t("regionCn") : t("regionGlobal");
    const allVisible = variant.models.length > 0 && variant.models.every((m) => m.visible);
    const isCollapsed = collapsed[variant.id] === true;
    const visibleCount = variant.models.filter((m) => m.visible).length;
    return h(
      "div",
      { style: S.card, key: variant.id },
      // 头部固定两行：第一行是身份与操作，第二行是端点地址。
      // 之前把端点地址塞进同一行，勾上对外开关后地址一出现就把操作挤到第二行，
      // 折叠按钮和状态徽章跟着换行，看起来像布局坏了。
      h(
        "div",
        { style: { borderBottom: isCollapsed ? "none" : S.variantHead.borderBottom, paddingBottom: isCollapsed ? 0 : "8px", marginBottom: isCollapsed ? 0 : "10px" } },
        h(
          "div",
          { style: { ...S.row, justifyContent: "space-between" } },
          h(
            "div",
            { style: { ...S.row, minWidth: 0 } },
            h("button", {
              style: { ...S.btn, padding: "2px 8px" },
              onClick: () => setCollapsed((prev) => ({ ...prev, [variant.id]: !isCollapsed })),
              title: isCollapsed ? t("expand") : t("collapse")
            }, `${isCollapsed ? "\u25B8" : "\u25BE"} ${isCollapsed ? t("expand") : t("collapse")}`),
            h("strong", { style: { whiteSpace: "nowrap" } }, variant.displayName),
            h("span", { style: S.badge }, regionLabel),
            h("span", {
              style: variant.providerRegistered ? { ...S.badge, ...S.badgeOk } : { ...S.badge, ...S.badgeWarn }
            }, variant.providerRegistered ? "DSH \u53EF\u7528" : "DSH \u672A\u5C31\u7EEA"),
            h("span", { style: { ...S.muted, whiteSpace: "nowrap" } }, `${variant.accounts.length} \u8D26\u53F7 \xB7 ${visibleCount}/${variant.models.length} \u6A21\u578B`)
          ),
          // 一键操作：刷新本版本全部账号（目录 + 积分），国内版另有签到
          h(
            "div",
            { style: { ...S.row, flexShrink: 0 } },
            variant.hasCheckin ? actionButton(`checkin:${variant.id}`, t("checkinAll"), () => {
              setNotice("");
              setBusy(`checkin:${variant.id}`);
              void (async () => {
                try {
                  const next = await postDocument("/variant/checkin", { variantId: variant.id });
                  setDoc(next);
                  const results = next.results ?? [];
                  const okCount = results.filter((r) => r.ok).length;
                  setNotice(t("checkinDone", { ok: okCount, total: results.length }));
                  setError("");
                } catch (err) {
                  setError(String(err));
                } finally {
                  setBusy("");
                }
              })();
            }, t("working")) : null,
            actionButton(`refreshVariant:${variant.id}`, t("refreshVariant"), () => {
              setNotice("");
              setBusy(`refreshVariant:${variant.id}`);
              void (async () => {
                try {
                  const next = await postDocument("/variant/refresh", { variantId: variant.id });
                  setDoc(next);
                  const r = next;
                  setNotice(t("refreshDone", {
                    ok: r.catalogsOk,
                    failed: r.catalogsFailed,
                    credits: r.creditsOk
                  }));
                  setError("");
                } catch (err) {
                  setError(String(err));
                } finally {
                  setBusy("");
                }
              })();
            }, t("working"))
          )
        ),
        // 第二行：对外端点地址（未启用时给出提示）
        isCollapsed ? null : h(
          "div",
          { style: { ...S.row, marginTop: "6px" } },
          h("span", { style: S.muted }, t("externalEndpoint")),
          variant.baseUrl === "" ? h("span", { style: { ...S.badge, ...S.badgeOff } }, t("endpointOff")) : h(
            "div",
            { style: { ...S.row, minWidth: 0 } },
            h("code", { style: { ...S.mono, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" } }, variant.baseUrl),
            actionButton(`url:${variant.id}`, copied === `url:${variant.id}` ? t("copied") : t("copy"), () => {
              void copyText(`url:${variant.id}`, variant.baseUrl);
            })
          )
        )
      ),
      isCollapsed ? null : h(
        "div",
        null,
        variant.externalError === "" ? null : h("div", { style: { ...S.error, marginBottom: "8px" } }, `${t("endpointBindFailed")}: ${variant.externalError}`),
        variant.providerError === "" ? null : h("div", { style: { ...S.error, marginBottom: "8px" } }, variant.providerError),
        variant.desktopError === "" ? null : h("div", { style: { ...S.muted, marginBottom: "8px" } }, variant.desktopError),
        // 账号
        h("div", { style: S.cardTitle }, `${t("accounts")}\uFF08${variant.accounts.length}\uFF09`),
        variant.accounts.length === 0 ? h("div", { style: S.muted }, t("accountsEmpty")) : variant.accounts.map(accountCard),
        // 模型开关
        h(
          "div",
          { style: { ...S.cardTitle, marginTop: "14px", justifyContent: "space-between" } },
          h("span", null, `${t("modelsSection")}\uFF08${visibleCount}/${variant.models.length}\uFF09`),
          h(
            "div",
            { style: S.row },
            actionButton(`models:${variant.id}:on`, t("showAll"), () => {
              void run(`models:${variant.id}:on`, "/models", { variantId: variant.id, visible: true });
            }, t("working")),
            actionButton(`models:${variant.id}:off`, t("hideAll"), () => {
              void run(`models:${variant.id}:off`, "/models", { variantId: variant.id, visible: false });
            }, t("working"))
          )
        ),
        h("p", { style: { ...S.sub, marginBottom: "8px" } }, t("modelsHint")),
        variant.models.length === 0 ? h("div", { style: S.muted }, t("noModels")) : h(
          "div",
          { style: S.modelGrid },
          variant.models.map((model) => {
            const modelKey = `model:${variant.id}:${model.id}`;
            return h(
              "label",
              {
                key: model.id,
                style: { ...S.modelCell, opacity: model.visible ? 1 : 0.55, flexDirection: "column", alignItems: "stretch", gap: "2px" },
                title: `${model.id}
ctx ${model.contextWindow} \xB7 max ${model.maxTokens}${model.supportsImages ? " \xB7 \u56FE\u7247" : ""}${model.credits === void 0 ? "" : ` \xB7 ${model.credits}`}`
              },
              h(
                "div",
                { style: { ...S.row, gap: "6px" } },
                h("input", {
                  type: "checkbox",
                  checked: model.visible,
                  disabled: busyAny,
                  onChange: () => {
                    void run(modelKey, "/model", { variantId: variant.id, modelId: model.id, visible: !model.visible });
                  }
                }),
                h("span", { style: { flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" } }, model.name),
                busy === modelKey ? h("span", { style: S.muted }, "\u2026") : null,
                model.free ? h("span", { style: { ...S.badge, ...S.badgeOk } }, "\u514D\u8D39") : null,
                model.available ? null : h("span", { style: { ...S.badge, ...S.badgeOff } }, t("gone"))
              ),
              model.efforts.length === 0 ? null : h(
                "div",
                { style: { ...S.row, gap: "4px", paddingLeft: "22px" } },
                h("span", { style: { ...S.muted, fontSize: "11px" } }, `${t("reasoning")}:`),
                model.efforts.map((effort) => h("span", {
                  key: effort,
                  style: {
                    ...S.badge,
                    ...effort === model.defaultEffort ? S.badgeInfo : {},
                    fontSize: "10px",
                    padding: "0 4px"
                  },
                  title: effort === model.defaultEffort ? t("reasoningDefault") : void 0
                }, effort))
              )
            );
          })
        )
      )
    );
  };
  return h(
    "div",
    { style: S.root },
    h(
      "div",
      null,
      h("h1", { style: S.h1 }, t("title")),
      h("p", { style: S.sub }, t("subtitle"))
    ),
    // 全局进行中提示
    busyAny ? h(
      "div",
      { style: S.progress },
      h("span", null, "\u27F3"),
      h("span", null, `${t("working")} \u2026`)
    ) : null,
    // 对外端点总开关 + API Key
    h(
      "div",
      { style: S.card },
      h(
        "div",
        { style: S.cardTitle },
        h("span", null, t("endpointSection")),
        h("span", { style: S.badge }, t("externalOnly")),
        h("span", {
          style: doc.endpointEnabled ? { ...S.badge, ...S.badgeOk } : { ...S.badge, ...S.badgeOff }
        }, doc.endpointEnabled ? t("endpointOn") : t("endpointOff"))
      ),
      h(
        "label",
        { style: S.switchRow },
        h("input", {
          type: "checkbox",
          checked: doc.endpointEnabled,
          disabled: busyAny,
          onChange: () => {
            void run("endpoint", "/endpoint", { enabled: !doc.endpointEnabled });
          }
        }),
        h("span", null, t("endpointSwitch")),
        busy === "endpoint" ? h("span", { style: S.muted }, "\u27F3") : null
      ),
      h("p", { style: { ...S.sub, marginTop: "4px" } }, t("endpointSwitchHint")),
      h(
        "div",
        { style: { ...S.row, marginTop: "10px" } },
        h("span", { style: S.muted }, `${t("apiKey")}:`),
        h("code", { style: { ...S.mono, flex: 1, wordBreak: "break-all" } }, doc.apiKey === "" ? "\u2014" : doc.apiKey),
        actionButton("apikey", copied === "apikey" ? t("copied") : t("copy"), () => {
          void copyText("apikey", doc.apiKey);
        })
      ),
      h("p", { style: { ...S.sub, marginTop: "4px" } }, t("apiKeyHint")),
      h("p", { style: { ...S.sub, marginTop: "2px" } }, t("endpointHint"))
    ),
    // 版本分区
    doc.variants.map(variantSection),
    // 刷新与导入
    h(
      "div",
      { style: S.card },
      h(
        "div",
        { style: { ...S.cardTitle, justifyContent: "space-between" } },
        h("span", null, t("importHub")),
        h(
          "div",
          { style: S.row },
          actionButton("refresh", t("refresh"), () => {
            void run("refresh", "/refresh", {});
          }, t("working")),
          h("button", {
            style: S.btn,
            onClick: () => {
              setForm((f) => ({ ...f, variantId: f.variantId === "" ? doc.variants[0]?.id ?? "" : f.variantId }));
              setLogin(void 0);
              setNotice("");
              setOpenForm(openForm === "login" ? "" : "login");
            }
          }, t("linkLogin")),
          h("button", {
            style: S.btn,
            onClick: () => setOpenForm(openForm === "hub" ? "" : "hub")
          }, t("importHub")),
          h("button", {
            style: S.btn,
            onClick: () => {
              setForm((f) => ({ ...f, variantId: f.variantId === "" ? doc.variants[0]?.id ?? "" : f.variantId }));
              setOpenForm(openForm === "single" ? "" : "single");
            }
          }, t("addAccount"))
        )
      ),
      notice === "" ? null : h("div", { style: { ...S.muted, marginBottom: "8px", color: "inherit" } }, notice),
      openForm === "login" ? h(
        "div",
        { style: { marginTop: "6px" } },
        h("p", { style: { ...S.sub, marginBottom: "8px" } }, t("linkLoginHint")),
        h("p", { style: { ...S.sub, marginBottom: "8px" } }, t("linkLoginStep")),
        h(
          "div",
          { style: S.row },
          h(
            "label",
            { style: S.muted },
            t("variant"),
            h("select", {
              style: { ...S.input, width: "auto" },
              value: form.variantId,
              onChange: (e) => {
                setForm((f) => ({ ...f, variantId: e.target.value }));
                setLogin(void 0);
              }
            }, doc.variants.map((v) => h("option", { key: v.id, value: v.id }, `${v.displayName}\uFF08${v.appName}\uFF09`)))
          ),
          h("button", {
            style: S.btnPrimary,
            disabled: busyAny || form.variantId === "",
            onClick: () => {
              void (async () => {
                setBusy("login");
                setNotice("");
                try {
                  const next = await postDocument("/login/start", { variantId: form.variantId });
                  const payload = next;
                  setDoc(next);
                  if (payload.ok && payload.state !== void 0 && payload.authUrl !== void 0) {
                    setLogin({ variantId: form.variantId, state: payload.state, authUrl: payload.authUrl, message: "" });
                    try {
                      window.open(payload.authUrl, "_blank", "noopener");
                    } catch {
                    }
                    const started = Date.now();
                    const timer = setInterval(() => {
                      void (async () => {
                        try {
                          const polled = await postDocument("/login/poll", { state: payload.state });
                          const r = polled;
                          setDoc(polled);
                          if (r.status === "pending") {
                            setLogin((prev) => prev === void 0 ? prev : { ...prev, message: r.message ?? "" });
                          } else {
                            clearInterval(timer);
                            setBusy("");
                            if (r.ok && r.account !== void 0) {
                              setNotice(t("linkLoginOk", { name: r.account.nickname || r.account.account }));
                              setLogin(void 0);
                              setOpenForm("");
                            } else {
                              setLogin((prev) => prev === void 0 ? prev : { ...prev, message: r.error ?? t("linkLoginFailed") });
                            }
                          }
                          if (Date.now() - started > 9 * 60 * 1e3) {
                            clearInterval(timer);
                            setBusy("");
                            setLogin(void 0);
                          }
                        } catch {
                        }
                      })();
                    }, 2e3);
                  } else {
                    setBusy("");
                    setError(payload.error ?? t("linkLoginFailed"));
                  }
                } catch (err) {
                  setBusy("");
                  setError(String(err));
                }
              })();
            }
          }, busy === "login" ? t("linkLoginOpening") : t("linkLoginStart")),
          h("button", { style: S.btn, onClick: () => {
            setOpenForm("");
            setLogin(void 0);
          } }, t("cancel"))
        ),
        login === void 0 ? null : h(
          "div",
          { style: { ...S.accountRow, marginTop: "10px" } },
          h(
            "div",
            { style: { ...S.row, marginBottom: "6px" } },
            h("span", { style: { ...S.badge, ...S.badgeInfo } }, "\u27F3"),
            h("span", { style: S.muted }, login.message === "" ? t("linkLoginWaiting") : login.message)
          ),
          h(
            "div",
            { style: S.row },
            h("button", {
              style: S.btn,
              onClick: () => {
                try {
                  window.open(login.authUrl, "_blank", "noopener");
                } catch {
                }
              }
            }, t("linkLoginOpen")),
            actionButton("loginUrl", copied === "loginUrl" ? t("copied") : t("copy"), () => {
              void copyText("loginUrl", login.authUrl);
            })
          ),
          h("code", { style: { ...S.mono, display: "block", marginTop: "6px", wordBreak: "break-all", ...S.muted } }, login.authUrl)
        )
      ) : null,
      openForm === "hub" ? h(
        "div",
        { style: { marginTop: "6px" } },
        h("p", { style: { ...S.sub, marginBottom: "8px" } }, t("importHubHint")),
        h("textarea", {
          style: { ...S.input, minHeight: "120px", resize: "vertical", fontFamily: "ui-monospace, monospace" },
          placeholder: t("importHubPlaceholder"),
          value: hubText,
          onChange: (e) => setHubText(e.target.value)
        }),
        h(
          "div",
          { style: { ...S.row, marginTop: "8px" } },
          h("button", {
            style: S.btnPrimary,
            disabled: busyAny || hubText.trim() === "",
            onClick: () => {
              void (async () => {
                setBusy("import");
                try {
                  const next = await postDocument("/import", { payload: hubText });
                  setDoc(next);
                  const result = next.importResult;
                  if (result !== void 0 && result.error !== "") setNotice(result.error);
                  else if (result !== void 0) {
                    setNotice(
                      t("importOk", { n: result.imported }) + (result.skipped.length > 0 ? t("importSkipped", { n: result.skipped.length }) : "")
                    );
                    setHubText("");
                    setOpenForm("");
                  }
                  setError("");
                } catch (err) {
                  setError(String(err));
                } finally {
                  setBusy("");
                }
              })();
            }
          }, busy === "import" ? `${t("doImport")} \u2026` : t("doImport")),
          h("button", { style: S.btn, onClick: () => setOpenForm("") }, t("cancel"))
        )
      ) : null,
      openForm === "single" ? h(
        "div",
        { style: { marginTop: "6px" } },
        h("p", { style: { ...S.sub, marginBottom: "8px" } }, t("addHint")),
        h(
          "div",
          { style: { display: "grid", gap: "8px" } },
          h(
            "label",
            { style: S.muted },
            t("variant"),
            h("select", {
              style: { ...S.input, marginTop: "4px" },
              value: form.variantId,
              onChange: (e) => setForm((f) => ({ ...f, variantId: e.target.value }))
            }, doc.variants.map((v) => h("option", { key: v.id, value: v.id }, `${v.displayName}\uFF08${v.appName}\uFF09`)))
          ),
          h(
            "label",
            { style: S.muted },
            t("accessToken"),
            h("textarea", {
              style: { ...S.input, marginTop: "4px", minHeight: "60px", resize: "vertical" },
              value: form.accessToken,
              onChange: (e) => setForm((f) => ({ ...f, accessToken: e.target.value }))
            })
          ),
          h(
            "label",
            { style: S.muted },
            t("uid"),
            h("input", {
              style: { ...S.input, marginTop: "4px" },
              value: form.uid,
              onChange: (e) => setForm((f) => ({ ...f, uid: e.target.value }))
            })
          ),
          h(
            "label",
            { style: S.muted },
            t("enterpriseId"),
            h("input", {
              style: { ...S.input, marginTop: "4px" },
              value: form.enterpriseId,
              onChange: (e) => setForm((f) => ({ ...f, enterpriseId: e.target.value }))
            })
          ),
          h(
            "label",
            { style: S.muted },
            t("nickname"),
            h("input", {
              style: { ...S.input, marginTop: "4px" },
              value: form.nickname,
              onChange: (e) => setForm((f) => ({ ...f, nickname: e.target.value }))
            })
          )
        ),
        h(
          "div",
          { style: { ...S.row, marginTop: "10px" } },
          h("button", {
            style: S.btnPrimary,
            disabled: busyAny || form.accessToken.trim() === "" || form.variantId === "",
            onClick: () => {
              void run("import", "/account/import", form).then(() => {
                setOpenForm("");
                setForm({ variantId: form.variantId, accessToken: "", uid: "", enterpriseId: "", nickname: "" });
              });
            }
          }, busy === "import" ? `${t("doImport")} \u2026` : t("doImport")),
          h("button", { style: S.btn, onClick: () => setOpenForm("") }, t("cancel"))
        )
      ) : null
    ),
    error === "" ? null : h("div", { style: S.error }, error)
  );
}
return module.exports; } });
