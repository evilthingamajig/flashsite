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

const configNoindex = result(validWidget, { VERCEL_ENV: "preview", ALLOW_INCOMPLETE_DONATE_PREVIEW: "1" }, {
  ...ids,
  config: { headers: [{ source: "/(.*)", headers: [{ key: "X-Robots-Tag", value: "noindex" }] }] }
});
assert.ok(configNoindex.errors.some(error => /X-Robots-Tag noindex/i.test(error)), "config noindex is never overridable");

const legacy = ["go", "fund", "me"].join("");
const gfm = ["g", "fm"].join("");
const legacyHits = scanLegacySources(root, new Map([
  ["public.html", `<p>${legacy}</p><p>${gfm}</p>`],
  ["technical.html", '<givebutter-widget></givebutter-widget><script src="https://widgets.givebutter.com/latest.umd.cjs?acct=a"></script>']
]));
assert.equal(legacyHits.length, 2, "legacy provider scanner must catch authored tokens but allow technical widget references");

console.log("verify-donate-launch self-tests passed");
