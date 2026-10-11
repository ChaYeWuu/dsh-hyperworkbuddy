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
  apiKeyRefresh: "\u91CD\u65B0\u751F\u6210",
  apiKeyEdit: "\u81EA\u5B9A\u4E49",
  apiKeySave: "\u4FDD\u5B58",
  apiKeyCancel: "\u53D6\u6D88",
  apiKeyPlaceholder: "\u7559\u7A7A\u5219\u968F\u673A\u751F\u6210",
  apiKeyFromConfig: "\u5F53\u524D Key \u6765\u81EA profile \u914D\u7F6E\uFF08apiKeys\uFF09\uFF0C\u8BF7\u5728\u914D\u7F6E\u91CC\u4FEE\u6539\u3002",
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
  linkLoginOpenHint: "\u82E5\u6D4F\u89C8\u5668\u6CA1\u6709\u81EA\u52A8\u6253\u5F00\uFF0C\u70B9\u4E0B\u9762\u7684\u6309\u94AE\u3002",
  linkLoginWaiting: "\u7B49\u5F85\u6D4F\u89C8\u5668\u5B8C\u6210\u6388\u6743\u2026",
  linkLoginOk: "\u5DF2\u6DFB\u52A0\u8D26\u53F7 {name}",
  linkLoginFailed: "\u767B\u5F55\u672A\u5B8C\u6210",
  addAccount: "\u5BFC\u5165\u5355\u4E2A\u8D26\u53F7",
  addHint: "\u7C98\u8D34 accessToken \u53EF\u8FFD\u52A0\u5355\u4E2A\u8D26\u53F7\u3002",
  accountImport: "\u8D26\u53F7\u5BFC\u5165",
  thirdPartyImport: "\u7B2C\u4E09\u65B9\u5BFC\u5165",
  thirdPartyHint: "\u4ECE\u5176\u5B83 WorkBuddy \u7BA1\u7406\u9762\u677F\u8FC1\u79FB\u8D26\u53F7\u3002",
  importHub: "WorkBuddy2API-Hub \u5BFC\u5165",
  importHubHint: "\u7C98\u8D34 WorkBuddy2API-Hub \u7684\u5BFC\u51FA\u6587\u6863\uFF1B\u4E5F\u63A5\u53D7\u8D26\u53F7\u6570\u7EC4\u3001\u5355\u4E2A\u8D26\u53F7\u5BF9\u8C61\u4E0E\u684C\u9762\u5BA2\u6237\u7AEF\u51ED\u636E\uFF0C\u53EF\u4E00\u6B21\u5BFC\u5165\u591A\u4E2A\u8D26\u53F7\u3002",
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
  refreshAccount: "\u5237\u65B0\u8D26\u53F7",
  refreshAccountDone: "\u51ED\u636E\u53EF\u7528 \xB7 OK \xB7 {status}",
  refreshAccountHint: "\u5237\u65B0\u4EE4\u724C\u5E76\u7528\u4E00\u6761\u6700\u5C0F\u8BF7\u6C42\u9A8C\u8BC1\u8D26\u53F7\u72B6\u6001",
  sourceDesktop: "\u684C\u9762 App",
  sourceManual: "\u5BFC\u5165",
  statusReady: "\u53EF\u7528",
  statusDisabled: "\u5DF2\u505C\u7528",
  statusCooling: "\u51B7\u5374\u4E2D",
  statusExpired: "\u51ED\u636E\u8FC7\u671F",
  credits: "\u79EF\u5206",
  creditsUnknown: "\u672A\u83B7\u53D6",
  creditsAt: "\u66F4\u65B0\u4E8E",
  creditsCached: "\uFF08\u7F13\u5B58\uFF09",
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
  reasoningProbed: "\u63A2\u6D4B\u5F97\u51FA",
  reasoningProbe: "\u63A2\u6D4B\u6863\u4F4D",
  reasoningProbing: "\u63A2\u6D4B\u4E2D",
  reasoningNone: "\u672A\u58F0\u660E",
  reasoningProbeHint: "\u4E0A\u6E38\u672A\u58F0\u660E\u6863\u4F4D\u65F6\u53EF\u624B\u52A8\u63A2\u6D4B\uFF1A\u9010\u4E2A\u6863\u4F4D\u53D1\u4E00\u6761\u6700\u5C0F\u8BF7\u6C42\uFF0C\u53EA\u91C7\u7EB3\u4E0A\u6E38\u63A5\u53D7\u7684\u6863\u4F4D\u3002\u4F1A\u6D88\u8017\u5C11\u91CF\u989D\u5EA6\u3002",
  modelContext: "\u4E0A\u4E0B\u6587",
  modelMaxOutput: "\u6700\u5927\u8F93\u51FA",
  modelContextTiers: "\u591A\u6863",
  contextWindowUseMax: "\u4F7F\u7528\u4E0A\u6E38\u58F0\u660E\u7684\u6700\u5927\u7A97\u53E3",
  contextWindowHint: "\u4E0A\u6E38\u4E3A\u90E8\u5206\u6A21\u578B\u58F0\u660E\u4E86\u591A\u6863\u7A97\u53E3\uFF1A\u9ED8\u8BA4\u6863\u4E0E\u66F4\u5927\u6863\u3002\u5F00\u542F\u540E\u6309\u6700\u5927\u6863\u4E0A\u62A5\u7ED9 DSH\uFF0C\u53EA\u5F71\u54CD\u58F0\u660E\u4E86\u66F4\u5927\u6863\u4F4D\u7684\u6A21\u578B\u3002",
  contextWindowEffect: "\u6539\u52A8\u5BF9\u4E0B\u4E00\u6761\u8BF7\u6C42\u751F\u6548\uFF1B\u6B63\u5728\u8FDB\u884C\u7684\u5BF9\u8BDD\u4F1A\u5728\u4E0B\u6B21\u53D1\u9001\u65F6\u624D\u66F4\u65B0\u663E\u793A\u3002",
  contextWindowRefreshed: "\u5DF2\u5237\u65B0 {ok} \u4E2A\u8D26\u53F7\u7684\u6A21\u578B\u76EE\u5F55\uFF08\u5931\u8D25 {failed} \u4E2A\uFF09",
  contextWindowNoTiers: "\u5DF2\u5F00\u542F\uFF0C\u4F46\u5F53\u524D\u76EE\u5F55\u91CC\u6CA1\u6709\u58F0\u660E\u66F4\u5927\u6863\u4F4D\u7684\u6A21\u578B",
  usageSection: "\u7528\u91CF",
  usageToday: "\u4ECA\u65E5",
  usageAll: "\u7D2F\u8BA1",
  usageRequests: "\u8BF7\u6C42",
  usageErrors: "\u5931\u8D25",
  usagePrompt: "\u8F93\u5165",
  usageCompletion: "\u8F93\u51FA",
  usageCacheRate: "\u7F13\u5B58\u547D\u4E2D\u7387",
  usageDaily: "\u8FD1 7 \u5929",
  usageByAccount: "\u4ECA\u65E5\u5206\u8D26\u53F7",
  usageByModel: "\u4ECA\u65E5\u5206\u6A21\u578B",
  usageEmpty: "\u8FD8\u6CA1\u6709\u8BF7\u6C42\u8BB0\u5F55\u3002",
  usageClear: "\u6E05\u7A7A\u8BB0\u5F55",
  usageClearConfirm: "\u786E\u8BA4\u6E05\u7A7A",
  usageClearDone: "\u7528\u91CF\u8BB0\u5F55\u5DF2\u6E05\u7A7A",
  usageHint: "\u7EDF\u8BA1\u6765\u81EA\u672C\u63D2\u4EF6\u7684\u4E24\u4E2A\u56DE\u73AF\u7AEF\u70B9\uFF08DSH \u81EA\u8EAB\u4E0E\u5916\u90E8\u5BA2\u6237\u7AEF\uFF09\uFF0C\u53EA\u8BB0\u5728\u672C\u673A\u3002",
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
  apiKeyRefresh: "Regenerate",
  apiKeyEdit: "Custom",
  apiKeySave: "Save",
  apiKeyCancel: "Cancel",
  apiKeyPlaceholder: "Leave blank to generate one",
  apiKeyFromConfig: "This key comes from the profile config (apiKeys); edit it there.",
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
  linkLoginOpenHint: "If the browser did not open automatically, use the button below.",
  linkLoginWaiting: "Waiting for the browser to finish\u2026",
  linkLoginOk: "Added account {name}",
  linkLoginFailed: "Sign-in did not complete",
  addAccount: "Import one account",
  addHint: "Paste an accessToken to add a single account.",
  accountImport: "Account import",
  thirdPartyImport: "Third-party import",
  thirdPartyHint: "Migrate accounts from another WorkBuddy management panel.",
  importHub: "WorkBuddy2API-Hub import",
  importHubHint: "Paste a WorkBuddy2API-Hub export document; account arrays, single account objects and desktop credentials are also accepted.",
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
  refreshAccount: "Refresh account",
  refreshAccountDone: "Credentials work \xB7 OK \xB7 {status}",
  refreshAccountHint: "Refresh the token and verify the account with one minimal request",
  sourceDesktop: "Desktop app",
  sourceManual: "Imported",
  statusReady: "Ready",
  statusDisabled: "Disabled",
  statusCooling: "Cooling down",
  statusExpired: "Expired",
  credits: "Credits",
  creditsUnknown: "not fetched",
  creditsAt: "updated",
  creditsCached: " (cached)",
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
  reasoningProbed: "probed",
  reasoningProbe: "Probe levels",
  reasoningProbing: "Probing",
  reasoningNone: "not declared",
  reasoningProbeHint: "When the upstream declares no levels, probe them: one minimal request per level, keeping only the accepted ones. Consumes a little credit.",
  modelContext: "Context",
  modelMaxOutput: "Max output",
  modelContextTiers: "multi-tier",
  contextWindowUseMax: "Use the largest window the upstream declares",
  contextWindowHint: "The upstream declares several window tiers for some models: a default tier and larger ones. When on, the largest tier is reported to DSH; models without a larger tier are unaffected.",
  contextWindowEffect: "The change applies to the next request; an ongoing conversation updates its display on the next send.",
  contextWindowRefreshed: "Refreshed the model catalog of {ok} account(s) ({failed} failed)",
  contextWindowNoTiers: "Enabled, but the current catalog declares no larger tier",
  usageSection: "Usage",
  usageToday: "Today",
  usageAll: "All time",
  usageRequests: "Requests",
  usageErrors: "Failed",
  usagePrompt: "Input",
  usageCompletion: "Output",
  usageCacheRate: "Cache hit rate",
  usageDaily: "Last 7 days",
  usageByAccount: "Today by account",
  usageByModel: "Today by model",
  usageEmpty: "No requests recorded yet.",
  usageClear: "Clear",
  usageClearConfirm: "Confirm clear",
  usageClearDone: "Usage records cleared",
  usageHint: "Counted from this plugin\u2019s two loopback endpoints (DSH itself and external clients), stored on this machine only.",
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
async function postPayload(path, body) {
  const response = await fetch(`${ROUTE_PREFIX}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
  const payload = await response.json();
  if (!response.ok && payload["document"] === void 0) {
    throw new Error(typeof payload["error"] === "string" ? payload["error"] : `HTTP ${response.status}`);
  }
  return payload;
}
async function postDocument(path, body) {
  const payload = await postPayload(path, body);
  if (payload.document !== void 0) return payload.document;
  throw new Error(typeof payload["error"] === "string" ? payload["error"] : "\u54CD\u5E94\u7F3A\u5C11 document");
}
function numField(payload, key) {
  const value = payload[key];
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}
function openExternal(url) {
  try {
    window.open(url, "_blank", "noopener,noreferrer");
  } catch {
  }
}
function formatTime(ms) {
  if (!Number.isFinite(ms) || ms <= 0) return "\u2014";
  const date = new Date(ms);
  const pad = (n) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}
function contextTiers(model) {
  return Array.isArray(model.supportedContextWindows) ? model.supportedContextWindows : [];
}
function formatDuration(ms) {
  if (ms <= 0) return "0s";
  const seconds = Math.ceil(ms / 1e3);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.ceil(seconds / 60);
  if (minutes < 60) return `${minutes}m`;
  return `${Math.ceil(minutes / 60)}h`;
}
function formatTokens(n) {
  if (!Number.isFinite(n) || n <= 0) return "0";
  if (n < 1e3) return String(n);
  if (n < 1e6) return `${(n / 1e3).toFixed(n < 1e4 ? 1 : 0)}k`;
  return `${(n / 1e6).toFixed(2)}M`;
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
  ok: { color: "#3cb46e", fontSize: "12px" },
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
  pkgRow: { display: "flex", justifyContent: "space-between", gap: "12px", fontSize: "12px", padding: "1px 0" },
  statGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))", gap: "8px" },
  statCell: { border: "1px solid var(--dsw-alias-border-l2, #3333)", borderRadius: "8px", padding: "8px 10px" },
  statLabel: { color: "var(--dsw-alias-label-secondary, #888)", fontSize: "11px" },
  statValue: { fontSize: "15px", fontWeight: 600, marginTop: "2px" },
  barTrack: { display: "flex", alignItems: "flex-end", gap: "4px", height: "52px", marginTop: "8px" },
  barColumn: { flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: "4px", height: "100%", justifyContent: "flex-end" },
  bar: {
    width: "100%",
    background: "var(--dsw-alias-brand-primary-new-colorprimary-new-color, #4a7dff)",
    borderRadius: "3px 3px 0 0",
    opacity: 0.65,
    minHeight: "2px"
  },
  usageTable: { width: "100%", borderCollapse: "collapse", fontSize: "12px", marginTop: "6px" },
  usageTh: {
    textAlign: "left",
    color: "var(--dsw-alias-label-secondary, #888)",
    fontWeight: 500,
    fontSize: "11px",
    padding: "2px 8px 2px 0"
  },
  usageTd: { padding: "2px 8px 2px 0", whiteSpace: "nowrap" }
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
  const [keyDraft, setKeyDraft] = useState(null);
  const [form, setForm] = useState({ variantId: "", accessToken: "", uid: "", enterpriseId: "", nickname: "" });
  const [hubText, setHubText] = useState("");
  const [notice, setNotice] = useState("");
  const [accountNotice, setAccountNotice] = useState({});
  const [clearArmed, setClearArmed] = useState(false);
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
    const creditsFresh = account.creditsAtMs > 0 && Date.now() - account.creditsAtMs < 10 * 60 * 1e3;
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
          actionButton(`refreshAccount:${key}`, t("refreshAccount"), () => {
            const busyKey = `refreshAccount:${key}`;
            setAccountNotice((prev) => ({ ...prev, [key]: { text: "", ok: true } }));
            setBusy(busyKey);
            void (async () => {
              try {
                const raw = await postPayload("/account/refresh", { account: account.account, variantId: account.variantId });
                if (raw.document !== void 0) setDoc(raw.document);
                const ok = raw.ok === true;
                setAccountNotice((prev) => ({
                  ...prev,
                  [key]: {
                    ok,
                    text: ok ? t("refreshAccountDone", {
                      status: typeof raw["status"] === "number" ? String(raw["status"]) : "200"
                    }) : `${t("refreshAccount")}: ${typeof raw["error"] === "string" ? raw["error"] : t("refreshAccountHint")}`
                  }
                }));
                setError("");
              } catch (err) {
                setAccountNotice((prev) => ({ ...prev, [key]: { ok: false, text: `${t("refreshAccount")}: ${String(err)}` } }));
              } finally {
                setBusy("");
              }
            })();
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
      accountNotice[key] === void 0 || accountNotice[key].text === "" ? null : h("div", { style: accountNotice[key].ok ? { ...S.ok, marginTop: "6px" } : { ...S.error, marginTop: "6px" } }, accountNotice[key].text),
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
        credits === void 0 ? null : h(
          "span",
          { style: S.muted },
          `${t("creditsAt")} ${formatTime(account.creditsAtMs)}`,
          creditsFresh ? null : t("creditsCached")
        ),
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
                  const raw = await postPayload("/variant/checkin", { variantId: variant.id });
                  if (raw.document !== void 0) setDoc(raw.document);
                  const results = Array.isArray(raw["results"]) ? raw["results"] : [];
                  const okCount = results.filter((r) => r.ok).length;
                  const failure = typeof raw["error"] === "string" ? raw["error"] : "";
                  setNotice(failure !== "" ? failure : t("checkinDone", { ok: okCount, total: results.length }));
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
                  const raw = await postPayload("/variant/refresh", { variantId: variant.id });
                  if (raw.document !== void 0) setDoc(raw.document);
                  setNotice(t("refreshDone", {
                    ok: numField(raw, "catalogsOk"),
                    failed: numField(raw, "catalogsFailed"),
                    credits: numField(raw, "creditsOk")
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
        h("p", { style: { ...S.sub, marginBottom: "8px" } }, t("reasoningProbeHint")),
        // 窗口档位开关：上游给国际版声明了默认档（300k）与更大档（1M）
        h(
          "label",
          { style: S.switchRow },
          h("input", {
            type: "checkbox",
            checked: variant.useMaximumContextWindow,
            disabled: busyAny,
            onChange: () => {
              const useMaximum = !variant.useMaximumContextWindow;
              setNotice("");
              setBusy(`ctxwindow:${variant.id}`);
              void (async () => {
                try {
                  const raw = await postPayload("/contextwindow", { variantId: variant.id, useMaximum });
                  if (raw.document !== void 0) setDoc(raw.document);
                  const ok = numField(raw, "catalogsOk");
                  const failed = numField(raw, "catalogsFailed");
                  setNotice(useMaximum ? ok + failed === 0 ? t("contextWindowNoTiers") : t("contextWindowRefreshed", { ok, failed }) : "");
                  setError("");
                } catch (err) {
                  setError(String(err));
                } finally {
                  setBusy("");
                }
              })();
            }
          }),
          h("span", null, t("contextWindowUseMax")),
          busy === `ctxwindow:${variant.id}` ? h("span", { style: S.muted }, "\u27F3") : null
        ),
        h("p", { style: { ...S.sub, marginTop: "4px" } }, t("contextWindowHint")),
        h("p", { style: { ...S.sub, marginBottom: "8px" } }, t("contextWindowEffect")),
        variant.models.length === 0 ? h("div", { style: S.muted }, t("noModels")) : h(
          "div",
          { style: S.modelGrid },
          variant.models.map((model) => {
            const modelKey = `model:${variant.id}:${model.id}`;
            const probeKey = `probe:${variant.id}:${model.id}`;
            const tiers = contextTiers(model);
            const canProbe = model.effortsSource === "none" && model.available;
            return h(
              "div",
              {
                key: model.id,
                style: { ...S.modelCell, opacity: model.visible ? 1 : 0.55, flexDirection: "column", alignItems: "stretch", gap: "2px" },
                title: [
                  model.id,
                  tiers.length > 1 ? `${t("modelContext")}: ${tiers.join(" / ")}` : "",
                  model.credits === void 0 ? "" : `${model.credits} credits`
                ].filter(Boolean).join("\n")
              },
              h(
                "label",
                { style: { ...S.row, gap: "6px", cursor: "pointer" } },
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
              h(
                "div",
                { style: { ...S.row, gap: "4px", paddingLeft: "22px" } },
                h("span", { style: { ...S.muted, fontSize: "11px" } }, `${t("reasoning")}:`),
                model.efforts.length === 0 ? h("span", { style: { ...S.muted, fontSize: "11px" } }, t("reasoningNone")) : model.efforts.map((effort) => h("span", {
                  key: effort,
                  style: {
                    ...S.badge,
                    ...effort === model.defaultEffort ? S.badgeInfo : {},
                    fontSize: "10px",
                    padding: "0 4px"
                  },
                  title: [
                    effort === model.defaultEffort ? t("reasoningDefault") : "",
                    model.effortsSource === "probed" ? t("reasoningProbed") : ""
                  ].filter(Boolean).join(" \xB7 ") || void 0
                }, effort)),
                model.effortsSource === "probed" ? h("span", { style: { ...S.badge, ...S.badgeInfo, fontSize: "10px", padding: "0 4px" } }, t("reasoningProbed")) : null,
                canProbe ? actionButton(probeKey, t("reasoningProbe"), () => {
                  setBusy(probeKey);
                  setNotice("");
                  void (async () => {
                    try {
                      const next = await postPayload("/model/probe", { variantId: variant.id, modelId: model.id });
                      if (next.document !== void 0) setDoc(next.document);
                      const r = next;
                      setNotice(r.ok === true && (r.accepted?.length ?? 0) > 0 ? `${model.name}: ${(r.accepted ?? []).join(" / ")}` : `${model.name}: ${r.error ?? t("reasoningNone")}`);
                      setError("");
                    } catch (err) {
                      setError(String(err));
                    } finally {
                      setBusy("");
                    }
                  })();
                }, t("reasoningProbing")) : null
              ),
              // 容量信息：窗口 / 输出上限，与推理档位同处一行起，便于横向比较
              h(
                "div",
                { style: { ...S.row, gap: "4px", paddingLeft: "22px" } },
                h("span", { style: { ...S.muted, fontSize: "11px" } }, `${t("modelContext")}:`),
                h("span", { style: { fontSize: "11px" } }, formatTokens(model.contextWindow)),
                tiers.length > 1 ? h("span", {
                  style: { ...S.badge, ...S.badgeInfo, fontSize: "10px", padding: "0 4px" },
                  title: tiers.join(" / ")
                }, t("modelContextTiers")) : null,
                h("span", { style: { ...S.muted, fontSize: "11px" } }, `${t("modelMaxOutput")}:`),
                h("span", { style: { fontSize: "11px" } }, formatTokens(model.maxTokens))
              )
            );
          })
        )
      )
    );
  };
  const usageSection = (usage) => {
    if (usage === void 0) return null;
    const today = usage.today;
    const maxDaily = Math.max(1, ...usage.daily.map((d) => d.totals.totalTokens));
    const cell = (label, value) => h(
      "div",
      { style: S.statCell },
      h("div", { style: S.statLabel }, label),
      h("div", { style: S.statValue }, value)
    );
    const table = (title, rows) => rows.length === 0 ? null : h(
      "div",
      { style: { marginTop: "10px" } },
      h("div", { style: S.statLabel }, title),
      h(
        "table",
        { style: S.usageTable },
        h("thead", null, h(
          "tr",
          null,
          h("th", { style: S.usageTh }, ""),
          h("th", { style: S.usageTh }, t("usageRequests")),
          h("th", { style: S.usageTh }, t("usagePrompt")),
          h("th", { style: S.usageTh }, t("usageCompletion"))
        )),
        h("tbody", null, rows.map((row) => h(
          "tr",
          { key: row.name },
          h("td", { style: { ...S.usageTd, ...S.mono, maxWidth: "260px", overflow: "hidden", textOverflow: "ellipsis" }, title: row.hint }, row.name),
          h("td", { style: S.usageTd }, `${row.totals.requests}${row.totals.errors === 0 ? "" : ` (${row.totals.errors} \u2717)`}`),
          h("td", { style: S.usageTd }, formatTokens(row.totals.promptTokens)),
          h("td", { style: S.usageTd }, formatTokens(row.totals.completionTokens))
        )))
      )
    );
    return h(
      "div",
      { style: S.card, key: "usage" },
      h(
        "div",
        { style: { ...S.cardTitle, justifyContent: "space-between" } },
        h("span", null, t("usageSection")),
        h(
          "div",
          { style: S.row },
          h("span", { style: S.badge }, t("usageAll")),
          h(
            "span",
            { style: { ...S.muted, ...S.mono } },
            `${usage.all.requests} ${t("usageRequests").toLowerCase()} \xB7 ${formatTokens(usage.all.totalTokens)}`
          ),
          // 两步确认：清空不可逆，不给一键误触的机会。
          clearArmed ? actionButton("usageClear", t("usageClearConfirm"), () => {
            setClearArmed(false);
            setBusy("usageClear");
            void (async () => {
              try {
                await postDocument("/usage/clear", {});
                setNotice(t("usageClearDone"));
                setError("");
                await load();
              } catch (err) {
                setError(String(err));
              } finally {
                setBusy("");
              }
            })();
          }, t("working")) : h("button", { style: S.btn, onClick: () => setClearArmed(true) }, t("usageClear"))
        )
      ),
      h(
        "div",
        { style: S.statGrid },
        cell(t("usageRequests"), String(today.requests)),
        cell(t("usagePrompt"), formatTokens(today.promptTokens)),
        cell(t("usageCompletion"), formatTokens(today.completionTokens)),
        cell(t("usageCacheRate"), usage.cacheHitRate === void 0 ? "\u2014" : `${Math.round(usage.cacheHitRate * 100)}%`)
      ),
      h(
        "div",
        { style: { marginTop: "12px" } },
        h("div", { style: S.statLabel }, t("usageDaily")),
        h("div", { style: S.barTrack }, usage.daily.map((day) => h(
          "div",
          {
            key: day.day,
            style: S.barColumn,
            title: `${day.day} \xB7 ${day.totals.requests} \xB7 ${day.totals.totalTokens}`
          },
          h("div", {
            style: {
              ...S.bar,
              height: `${Math.max(2, Math.round(day.totals.totalTokens / maxDaily * 100))}%`
            }
          }),
          h("span", { style: { ...S.statLabel, fontSize: "10px" } }, day.day.slice(5))
        )))
      ),
      today.requests === 0 && usage.all.requests === 0 ? h("p", { style: { ...S.sub, marginTop: "10px" } }, t("usageEmpty")) : null,
      table(t("usageByAccount"), usage.byAccount.map((row) => ({
        name: row.nickname ?? row.account,
        hint: row.nickname === void 0 ? void 0 : row.account,
        totals: row.totals
      }))),
      table(t("usageByModel"), usage.byModel.map((row) => ({ name: row.model, totals: row.totals }))),
      h("p", { style: { ...S.sub, marginTop: "10px" } }, t("usageHint"))
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
        }),
        // 来自 profile 配置时不给改，避免改了没效果
        doc.apiKeysConfigured ? null : actionButton("apikeyRefresh", t("apiKeyRefresh"), () => {
          setBusy("apikeyRefresh");
          void (async () => {
            try {
              const next = await postPayload("/apikey", {});
              if (next.document !== void 0) setDoc(next.document);
              const r = next;
              if (r.ok !== true) setError(r.error ?? "");
              else setError("");
            } catch (err) {
              setError(String(err));
            } finally {
              setBusy("");
            }
          })();
        }, t("working")),
        doc.apiKeysConfigured ? null : h("button", {
          style: S.btn,
          onClick: () => setKeyDraft(keyDraft === null ? doc.apiKey : null)
        }, keyDraft === null ? t("apiKeyEdit") : t("apiKeyCancel"))
      ),
      // 自定义输入行
      keyDraft === null ? null : h(
        "div",
        { style: { ...S.row, marginTop: "8px" } },
        h("input", {
          style: { ...S.input, flex: 1, fontFamily: "ui-monospace, monospace" },
          placeholder: t("apiKeyPlaceholder"),
          value: keyDraft,
          onChange: (e) => setKeyDraft(e.target.value)
        }),
        h("button", {
          style: S.btnPrimary,
          disabled: busyAny,
          onClick: () => {
            setBusy("apikeySave");
            void (async () => {
              try {
                const next = await postPayload("/apikey", { key: keyDraft });
                if (next.document !== void 0) setDoc(next.document);
                const r = next;
                if (r.ok !== true) setError(r.error ?? "");
                else {
                  setError("");
                  setKeyDraft(null);
                }
              } catch (err) {
                setError(String(err));
              } finally {
                setBusy("");
              }
            })();
          }
        }, busy === "apikeySave" ? `${t("apiKeySave")} \u2026` : t("apiKeySave"))
      ),
      h(
        "p",
        { style: { ...S.sub, marginTop: "4px" } },
        doc.apiKeysConfigured ? t("apiKeyFromConfig") : t("apiKeyHint")
      ),
      h("p", { style: { ...S.sub, marginTop: "2px" } }, t("endpointHint"))
    ),
    // 版本分区
    doc.variants.map(variantSection),
    // 用量看板
    usageSection(doc.usage),
    // 账号导入
    h(
      "div",
      { style: S.card },
      h(
        "div",
        { style: { ...S.cardTitle, justifyContent: "space-between" } },
        h("span", null, t("accountImport")),
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
                  const raw = await postPayload("/login/start", { variantId: form.variantId });
                  const payload = raw;
                  if (raw.document !== void 0) setDoc(raw.document);
                  if (payload.ok && payload.state !== void 0 && payload.authUrl !== void 0) {
                    setLogin({ variantId: form.variantId, state: payload.state, authUrl: payload.authUrl, message: "" });
                    setBusy("");
                    openExternal(payload.authUrl);
                    const started = Date.now();
                    const timer = setInterval(() => {
                      void (async () => {
                        try {
                          const raw2 = await postPayload("/login/poll", { state: payload.state });
                          const r = raw2;
                          if (raw2.document !== void 0) setDoc(raw2.document);
                          if (r.status === "pending") {
                            setLogin((prev) => prev === void 0 ? prev : { ...prev, message: r.message ?? "" });
                          } else {
                            clearInterval(timer);
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
          h("p", { style: { ...S.sub, marginBottom: "6px" } }, t("linkLoginOpenHint")),
          h(
            "div",
            { style: S.row },
            h("button", {
              style: S.btnPrimary,
              onClick: () => openExternal(login.authUrl)
            }, t("linkLoginOpen")),
            actionButton("loginUrl", copied === "loginUrl" ? t("copied") : t("copy"), () => {
              void copyText("loginUrl", login.authUrl);
            })
          ),
          h("code", { style: { ...S.mono, display: "block", marginTop: "6px", wordBreak: "break-all", ...S.muted } }, login.authUrl)
        )
      ) : null,
      notice === "" ? null : h("div", { style: { ...S.muted, marginBottom: "8px", color: "inherit" } }, notice),
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
    // 第三方导入
    h(
      "div",
      { style: S.card },
      h("div", { style: S.cardTitle }, t("thirdPartyImport")),
      h("p", { style: { ...S.sub, marginBottom: "10px" } }, t("thirdPartyHint")),
      h(
        "div",
        { style: { ...S.row, justifyContent: "space-between" } },
        h("span", { style: { fontWeight: 600 } }, t("importHub")),
        h("button", {
          style: S.btn,
          onClick: () => setOpenForm(openForm === "hub" ? "" : "hub")
        }, openForm === "hub" ? t("cancel") : t("doImport"))
      ),
      openForm === "hub" ? h(
        "div",
        { style: { marginTop: "8px" } },
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
      ) : null
    ),
    error === "" ? null : h("div", { style: S.error }, error)
  );
}
return module.exports; } });
