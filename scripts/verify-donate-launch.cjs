"use strict";

const fs = require("node:fs");
const path = require("node:path");

// Replace these only with the exact IDs copied from the approved dashboard embed.
const EXPECTED_WIDGET_ID = "";
const EXPECTED_ACCOUNT_ID = "";
const SELF = path.resolve(__filename);
const TEST_SELF = path.resolve(__dirname, "verify-donate-launch.test.cjs");
const HOSTED_MOCKUP_FLAG = "--allow-hosted-mockup";

const SOURCE_EXTENSIONS = new Set([
  ".html", ".css", ".js", ".mjs", ".cjs", ".json", ".xml", ".txt",
  ".svg", ".md", ".map", ".webmanifest", ".manifest"
]);
const IGNORED_DIRS = new Set([".git", "node_modules"]);

function duplicateAttributes(tag) {
  const seen = new Set();
  const duplicates = new Set();
  const pattern = /(?:^|[\s<])([:\w-]+)(?:\s*=\s*(?:"[^"]*"|'[^']*'|[^\s"'=<>`]+))?/g;
  for (const match of tag.matchAll(pattern)) {
    const name = match[1].toLowerCase();
    if (seen.has(name)) duplicates.add(name);
    seen.add(name);
  }
  return [...duplicates];
}

function attrMap(tag) {
  const attrs = new Map();
  const pattern = /([:\w-]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+))/g;
  for (const match of tag.matchAll(pattern)) {
    attrs.set(match[1].toLowerCase(), match[2] ?? match[3] ?? match[4] ?? "");
  }
  for (const match of tag.matchAll(/(?:^|\s)(async|defer)(?=\s|\/?>)/gi)) {
    attrs.set(match[1].toLowerCase(), "");
  }
  return attrs;
}

function stripComments(value) {
  return value.replace(/<!--[\s\S]*?-->/g, "");
}

function stripIgnoredBlocks(value) {
  return stripComments(value).replace(
    /<(script|style|template|noscript)(?=[\s/>])[^>]*>[\s\S]*?<\/\1\s*>/gi,
    ""
  );
}

function bodyMarkup(html) {
  return html.match(/<body\b[^>]*>([\s\S]*?)<\/body\s*>/i)?.[1] ?? "";
}

function visibleBodyText(html) {
  return stripIgnoredBlocks(bodyMarkup(html))
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function noindexRobotNames(html, reportDuplicate) {
  const names = new Set(["robots", "googlebot", "bingbot"]);
  const found = [];
  for (const match of html.matchAll(/<meta\b[^>]*>/gi)) {
    const duplicates = duplicateAttributes(match[0]);
    if (duplicates.length) reportDuplicate(`meta tag has duplicate attributes: ${duplicates.join(", ")}`);
    const attrs = attrMap(match[0]);
    const name = (attrs.get("name") || "").toLowerCase();
    if (names.has(name) && /(?:^|[\s,;])(?:noindex|none)(?=$|[\s,;])/i.test(attrs.get("content") || "")) found.push(name);
  }
  return found;
}

function walk(root) {
  const files = [];
  for (const entry of fs.readdirSync(root, { withFileTypes: true })) {
    if (IGNORED_DIRS.has(entry.name)) continue;
    const file = path.join(root, entry.name);
    if (entry.isDirectory()) files.push(...walk(file));
    else files.push(file);
  }
  return files;
}

function isPublicTextFile(file) {
  const ext = path.extname(file).toLowerCase();
  return SOURCE_EXTENSIONS.has(ext);
}

function buildLegacyTokens() {
  const chars = values => values.map(value => String.fromCharCode(value)).join("");
  return [
    chars([103, 111, 102, 117, 110, 100, 109, 101]),
    chars([103, 102, 109]),
    chars([103, 105, 118, 101, 98, 117, 116, 116, 101, 114]),
    chars([103, 111, 102, 117, 110, 100, 46, 109, 101])
  ];
}

function removeTechnicalWidgetReferences(value) {
  return value
    .replace(/<\/?givebutter-widget(?=[\s/>])[^>]*>/gi, "")
    .replace(/https:\/\/widgets\.givebutter\.com\/latest\.umd\.cjs(?:\?[^\s"'<>]*)?/gi, "");
}

function scanLegacySources(root, suppliedSources) {
  const sources = suppliedSources || new Map(
    walk(root)
      .filter(isPublicTextFile)
      .filter(file => path.resolve(file) !== SELF && path.resolve(file) !== TEST_SELF)
      .map(file => [file, fs.readFileSync(file, "utf8")])
  );
  const hits = [];
  const [goFundMe, gfm, givebutter, goFundDotMe] = buildLegacyTokens();
  const escapeRegExp = value => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const patterns = [
    [goFundMe, new RegExp(`\\b${escapeRegExp(goFundMe)}\\b`, "i")],
    [gfm, new RegExp(`\\b${escapeRegExp(gfm)}\\b`, "i")],
    [givebutter, new RegExp(`\\b${escapeRegExp(givebutter)}\\b`, "i")],
    [goFundDotMe, new RegExp(`\\b${escapeRegExp(goFundDotMe)}\\b`, "i")]
  ];
  for (const [file, source] of sources) {
    const cleaned = removeTechnicalWidgetReferences(source);
    for (const [label, pattern] of patterns) {
      const match = pattern.exec(cleaned);
      if (match) {
        const line = cleaned.slice(0, match.index).split(/\r?\n/).length;
        hits.push(`${file}:${line} contains banned token ${label}`);
      }
    }
  }
  return hits;
}

function configHasXRoboNoindex(config) {
  function appliesToDonateOrGlobal(source) {
    if (typeof source !== "string") return false;
    const normalized = source.replace(/\/$/, "");
    if (["/donate", "/donate.html", "/donate(.*)", "/:path*", "/(.*)"].includes(normalized)) return true;
    return /^\/donate\/.*$/.test(normalized);
  }
  function visit(value, sourceScope = "") {
    if (!value || typeof value !== "object") return false;
    const nextSource = typeof value.source === "string" ? value.source : sourceScope;
    if (
      typeof value.key === "string" &&
      value.key.toLowerCase() === "x-robots-tag" &&
      typeof value.value === "string" &&
      /\bnoindex\b/i.test(value.value) &&
      appliesToDonateOrGlobal(nextSource)
    ) return true;
    return Object.values(value).some(childValue => visit(childValue, nextSource));
  }
  return visit(config);
}

function frequencyIsMonthly(value) {
  return String(value || "") === "monthly";
}

function parseWidget(markup, expectedWidgetId, report, reportDuplicate) {
  const open = [...markup.matchAll(/<givebutter-widget(?=[\s/>])([^>]*)>/gi)];
  const close = [...markup.matchAll(/<\/givebutter-widget(?=[\s>])\s*>/gi)];
  if (open.length !== 1 || close.length !== 1) {
    report(`Expected exactly one body <givebutter-widget> with closing tag; found ${open.length} opening and ${close.length} closing tags`);
    return;
  }
  const duplicates = duplicateAttributes(open[0][0]);
  if (duplicates.length) reportDuplicate(`givebutter-widget has duplicate attributes: ${duplicates.join(", ")}`);
  const attrs = attrMap(open[0][0]);
  if (!expectedWidgetId) {
    report("EXPECTED_WIDGET_ID is blank/TODO; insert the exact dashboard widget ID before production");
  } else if (attrs.get("id") !== expectedWidgetId) {
    report(`Widget id must equal EXPECTED_WIDGET_ID (${expectedWidgetId})`);
  }
  if (attrs.get("amount") !== "5.17") {
    report("Widget amount must be the literal 5.17");
  }
  if (!frequencyIsMonthly(attrs.get("frequency"))) {
    report("Widget frequency must normalize to monthly");
  }
}

function validate(options = {}) {
  const root = options.root || path.resolve(__dirname, "..");
  const html = options.html ?? fs.readFileSync(path.join(root, "donate.html"), "utf8");
  const config = options.config ?? JSON.parse(fs.readFileSync(path.join(root, "vercel.json"), "utf8"));
  const env = options.env || process.env;
  const expectedWidgetId = options.expectedWidgetId ?? EXPECTED_WIDGET_ID;
  const expectedAccountId = options.expectedAccountId ?? EXPECTED_ACCOUNT_ID;
  const errors = [];
  const warnings = [];
  const previewOverride = env.VERCEL_ENV === "preview" && env.ALLOW_INCOMPLETE_DONATE_PREVIEW === "1";
  const hostedRequested = options.allowHostedMockup === true;
  const body = stripIgnoredBlocks(bodyMarkup(html));
  const visible = visibleBodyText(html);
  const head = stripComments(html.match(/<head\b[^>]*>([\s\S]*?)<\/head\s*>/i)?.[1] || "");
  const exactPendingMount = '<div class="donation-provider-mount" data-donation-provider="pending" role="region" aria-labelledby="sponsor-light-heading">';
  const exactNoindex = '<meta content="noindex,follow" name="robots"/>';
  const hostedMockup = hostedRequested && !expectedWidgetId && !expectedAccountId &&
    body.split(exactPendingMount).length === 2 &&
    html.split(exactNoindex).length === 2 &&
    (body.match(/<givebutter-widget(?=[\s/>])/gi) || []).length === 0 &&
    !/<script\b[^>]*src=["'][^"']*widgets\.givebutter\.com\/latest\.umd\.cjs/i.test(head) &&
    visible.split("Online sponsorship checkout is not active yet.").length === 2;

  function incomplete(message) {
    if (hostedMockup) warnings.push(`AUTHORIZED HOSTED MOCKUP: ${message}`);
    else if (previewOverride) warnings.push(`INCOMPLETE PREVIEW OVERRIDE: ${message}`);
    else errors.push(message);
  }

  if (configHasXRoboNoindex(config)) {
    errors.push("vercel.json contains an X-Robots-Tag noindex directive");
  }

  for (const name of noindexRobotNames(html, message => errors.push(message))) {
    incomplete(`donate.html contains noindex in meta name=${name}`);
  }

  const pendingAttribute = /(?:^|\s)(?:class|id|data-[\w:-]+)\s*=\s*(?:"[^"]*(?:pending|placeholder|staging)[^"]*"|'[^']*(?:pending|placeholder|staging)[^']*'|[^\s>]*(?:pending|placeholder|staging)[^\s>]*)/i;
  const pendingPatterns = [
    /data-donation-provider\s*=\s*["']pending["']/i,
    /donation-provider-mount/i,
    pendingAttribute,
    /no payment form is active/i,
    /(?:checkout|payment|sponsorship)[^.!?]{0,120}(?:pending|being prepared|coming soon|staging)/i,
    /(?:pending|staging|placeholder)[^.!?]{0,120}(?:checkout|payment|widget)/i
  ];
  for (const pattern of pendingPatterns) {
    if (pattern.test(body) || pattern.test(visible)) {
      incomplete(`donate.html contains a pending/staging marker or visible copy (${pattern})`);
    }
  }

  if (!expectedWidgetId) incomplete("EXPECTED_WIDGET_ID is blank/TODO");
  if (!expectedAccountId) incomplete("EXPECTED_ACCOUNT_ID is blank/TODO");
  parseWidget(body, expectedWidgetId, incomplete, message => errors.push(message));

  const scripts = [...head.matchAll(/<script(?=[\s/>])[^>]*>/gi)].map(match => {
    const tag = match[0];
    const attrs = attrMap(tag);
    const duplicates = duplicateAttributes(tag);
    if (duplicates.length) errors.push(`script tag has duplicate attributes: ${duplicates.join(", ")}`);
    const rawSrc = (attrs.get("src") || "").replace(/&amp;/gi, "&");
    let url = null;
    try {
      url = rawSrc ? new URL(rawSrc, "https://flashforwardfoundation.org/") : null;
    } catch {
      url = null;
    }
    return { attrs, rawSrc, url };
  });
  const libraryScripts = scripts.filter(script => {
    if (!script.url) return false;
    return script.url.protocol === "https:" &&
      script.url.host === "widgets.givebutter.com" &&
      script.url.username === "" &&
      script.url.password === "" &&
      script.url.pathname === "/latest.umd.cjs" &&
      /^https:\/\/widgets\.givebutter\.com\/latest\.umd\.cjs(?:\?[^#]*)?$/i.test(script.rawSrc);
  });
  if (libraryScripts.length !== 1) {
    incomplete(`Expected exactly one async HTTPS Givebutter library script at widgets.givebutter.com/latest.umd.cjs; found ${libraryScripts.length}`);
  } else {
    const script = libraryScripts[0];
    if (!script.attrs.has("async")) incomplete("Givebutter library script must have async");
    if (!expectedAccountId) {
      incomplete("EXPECTED_ACCOUNT_ID is blank/TODO; insert the exact dashboard account ID before production");
    } else if (script.url.searchParams.get("acct") !== expectedAccountId) {
      errors.push("Givebutter library acct must equal EXPECTED_ACCOUNT_ID");
    }
  }

  const legacyHits = scanLegacySources(root, options.deploySources);
  for (const hit of legacyHits) errors.push(`Legacy donation provider in deploy source: ${hit}`);

  return { errors, warnings, previewOverride };
}

if (require.main === module) {
  const result = validate({ allowHostedMockup: process.argv.includes(HOSTED_MOCKUP_FLAG) });
  for (const warning of result.warnings) console.warn(`WARN: ${warning}`);
  if (result.errors.length) {
    for (const error of result.errors) console.error(`ERROR: ${error}`);
    process.exitCode = 1;
  } else {
    console.log(`Donate launch validation passed (${process.env.VERCEL_ENV || "local"})`);
  }
}

module.exports = { validate, scanLegacySources, removeTechnicalWidgetReferences };
