"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { validate, scanLegacySources } = require("./verify-donate-launch.cjs");

const root = path.resolve(__dirname, "..");
const currentDonate = fs.readFileSync(path.join(root, "donate.html"), "utf8");
const cleanConfig = { headers: [] };
const ids = { expectedWidgetId: "widget-test-123", expectedAccountId: "acct-test-456" };

const validWidget = `<!doctype html>
<html><head>
  <script
    src='https://widgets.givebutter.com/latest.umd.cjs?acct=acct-test-456'
    defer async
  ></script>
</head><body>
  <givebutter-widget
    frequency = "Monthly"
    amount = '5.17'
    id = 'widget-test-123'
  ></givebutter-widget>
</body></html>`;

function result(html, env, extra = {}) {
  return validate({
    html,
    config: cleanConfig,
    env,
    root,
    ...extra
  });
}

const strictCurrent = result(currentDonate, { VERCEL_ENV: "production" });
assert.ok(strictCurrent.errors.some(error => /noindex/i.test(error)), "strict current: noindex gate");
assert.ok(strictCurrent.errors.some(error => /pending|staging/i.test(error)), "strict current: pending gate");
assert.ok(strictCurrent.errors.some(error => /widget/i.test(error)), "strict current: widget gate");
assert.ok(strictCurrent.errors.some(error => /library script/i.test(error)), "strict current: library gate");

const preview = result(currentDonate, {
  VERCEL_ENV: "preview",
  ALLOW_INCOMPLETE_DONATE_PREVIEW: "1"
});
assert.equal(preview.errors.length, 0, "preview override must allow only incomplete checkout failures");
assert.ok(preview.warnings.length >= 4, "preview override must warn loudly");

const productionOverride = result(currentDonate, {
  VERCEL_ENV: "production",
  ALLOW_INCOMPLETE_DONATE_PREVIEW: "1"
});
assert.ok(productionOverride.errors.length > 0, "production must ignore preview override");

const valid = result(validWidget, { VERCEL_ENV: "production" }, ids);
assert.deepEqual(valid.errors, [], "multiline/order-independent valid widget must pass");

for (const amount of ["5.170", "05.17", "5.17e0"]) {
  const amountResult = result(validWidget.replace("5.17", amount), { VERCEL_ENV: "production" }, ids);
  assert.ok(amountResult.errors.some(error => /amount/i.test(error)), `amount ${amount} must fail`);
}

for (const frequency of ["month", "permonth", "everymonth"]) {
  const frequencyResult = result(validWidget.replace("Monthly", frequency), { VERCEL_ENV: "production" }, ids);
  assert.ok(frequencyResult.errors.some(error => /frequency/i.test(error)), `frequency ${frequency} must fail`);
}

const fakeTag = validWidget
  .replace("<givebutter-widget", "<givebutter-widgetish")
  .replace("</givebutter-widget>", "</givebutter-widgetish>");
const fakeTagResult = result(fakeTag, { VERCEL_ENV: "production" }, ids);
assert.ok(fakeTagResult.errors.some(error => /exactly one body/i.test(error)), "near-miss widget tag must fail");

const commentedFake = `<!doctype html><head>
<!-- <script async src="https://widgets.givebutter.com/latest.umd.cjs?acct=acct-test-456"></script> -->
</head><body><!-- <givebutter-widget id="widget-test-123" amount="5.17" frequency="monthly"></givebutter-widget> --></body>`;
const commentedResult = result(commentedFake, { VERCEL_ENV: "production" }, ids);
assert.ok(commentedResult.errors.some(error => /exactly one body/i.test(error)), "commented fake must not count");
assert.ok(commentedResult.errors.some(error => /library script/i.test(error)), "commented library must not count");

const wrong = `<!doctype html><head>
<script src="https://widgets.givebutter.com/latest.umd.cjs?acct=acct-wrong"></script>
</head><body>
<givebutter-widget id="widget-wrong" amount="5.18" frequency="yearly"></givebutter-widget>
</body>`;
const wrongResult = result(wrong, { VERCEL_ENV: "production" }, ids);
assert.ok(wrongResult.errors.some(error => /Widget id/i.test(error)), "wrong widget ID must fail");
assert.ok(wrongResult.errors.some(error => /amount/i.test(error)), "wrong amount must fail");
assert.ok(wrongResult.errors.some(error => /frequency/i.test(error)), "wrong frequency must fail");
assert.ok(wrongResult.errors.some(error => /async/i.test(error)), "missing async must fail");
assert.ok(wrongResult.errors.some(error => /acct/i.test(error)), "wrong account ID must fail");

const wrongLibraryRoute = `<!doctype html><head>
<script async src="http://widgets.givebutter.com/wrong.cjs?acct=acct-test-456"></script>
</head><body>
<givebutter-widget id="widget-test-123" amount="5.17" frequency="monthly"></givebutter-widget>
</body>`;
const wrongLibraryResult = result(wrongLibraryRoute, { VERCEL_ENV: "production" }, ids);
assert.ok(wrongLibraryResult.errors.some(error => /library script/i.test(error)), "wrong host/path must fail");

const ignoredBody = `<!doctype html><head><script async src="https://widgets.givebutter.com/latest.umd.cjs?acct=acct-test-456"></script></head><body>
<script><givebutter-widget id="fake"></givebutter-widget></script>
<style><givebutter-widget id="fake"></givebutter-widget></style>
<template><givebutter-widget id="fake"></givebutter-widget></template>
<noscript><givebutter-widget id="fake"></givebutter-widget></noscript>
</body>`;
const ignoredResult = result(ignoredBody, { VERCEL_ENV: "production" }, ids);
assert.ok(ignoredResult.errors.some(error => /exactly one body/i.test(error)), "ignored blocks must not count");

for (const source of [
  'https://widgets.givebutter.com:444/latest.umd.cjs?acct=acct-test-456',
  'https://user:pass@widgets.givebutter.com/latest.umd.cjs?acct=acct-test-456',
  'https://widgets.givebutter.com/latest.umd.cjs:444?acct=acct-test-456'
]) {
  const urlResult = result(validWidget.replace("https://widgets.givebutter.com/latest.umd.cjs?acct=acct-test-456", source), { VERCEL_ENV: "production" }, ids);
  assert.ok(urlResult.errors.some(error => /library script/i.test(error)), `library URL ${source} must fail`);
}

const secondRobot = validWidget.replace("<html><head>", '<html><head><meta name=\"googlebot\" content=\"noindex\"><meta content=noindex name=bingbot>');
const secondRobotResult = result(secondRobot, { VERCEL_ENV: "production" }, ids);
assert.ok(secondRobotResult.errors.filter(error => /noindex in meta name=/i.test(error)).length === 2, "googlebot and bingbot noindex must fail");

const unquotedStaging = validWidget.replace("<body>", "<body><div class=pending></div><div data-stage=placeholder></div>");
const unquotedStagingResult = result(unquotedStaging, { VERCEL_ENV: "production" }, ids);
assert.ok(unquotedStagingResult.errors.some(error => /pending\/staging/i.test(error)), "unquoted staging attributes must fail");

const configNoindex = result(validWidget, { VERCEL_ENV: "preview", ALLOW_INCOMPLETE_DONATE_PREVIEW: "1" }, {
  ...ids,
  config: { headers: [{ source: "/(.*)", headers: [{ key: "X-Robots-Tag", value: "noindex" }] }] }
});
assert.ok(configNoindex.errors.some(error => /X-Robots-Tag noindex/i.test(error)), "config noindex is never overridable");

const unrelatedConfig = result(validWidget, { VERCEL_ENV: "production" }, {
  ...ids,
  config: { headers: [{ source: "/mission", headers: [{ key: "X-Robots-Tag", value: "noindex" }] }] }
});
assert.equal(unrelatedConfig.errors.filter(error => /X-Robots-Tag noindex/i.test(error)).length, 0, "unrelated X-Robots-Tag rules must not fail");

const donateConfig = result(validWidget, { VERCEL_ENV: "production" }, {
  ...ids,
  config: { headers: [{ source: "/donate", headers: [{ key: "X-Robots-Tag", value: "noindex" }] }] }
});
assert.ok(donateConfig.errors.some(error => /X-Robots-Tag noindex/i.test(error)), "donate X-Robots-Tag rule must fail");

const legacy = ["go", "fund", "me"].join("");
const gfm = ["g", "fm"].join("");
const dotted = ["go", "fund", ".", "me"].join("");
const legacyHits = scanLegacySources(root, new Map([
  ["public.html", `<p>${legacy}</p><p>${gfm}</p><p>${dotted}</p>`],
  ["technical.html", '<givebutter-widget></givebutter-widget><script src="https://widgets.givebutter.com/latest.umd.cjs?acct=a"></script>']
]));
assert.equal(legacyHits.length, 3, "legacy provider scanner must catch authored tokens but allow technical widget references");

const fallbackHits = scanLegacySources(root, new Map([
  ["fallback.html", '<givebutter-widget><span>Givebutter</span></givebutter-widget>']
]));
assert.equal(fallbackHits.length, 1, "authored fallback text inside technical widget tags must still be scanned");

const deployedExtensions = [".html", ".css", ".js", ".mjs", ".cjs", ".json", ".xml", ".txt", ".svg", ".md", ".map", ".webmanifest", ".manifest"];
const extensionSources = new Map(deployedExtensions.map(extension => [`public${extension}`, `provider ${legacy}`]));
assert.equal(scanLegacySources(root, extensionSources).length, deployedExtensions.length, "every deployed text extension must be scanned");

console.log("verify-donate-launch self-tests passed");
