"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { validate, scanLegacySources } = require("./verify-donate-launch.cjs");

const ids = { expectedWidgetId: "widget-test-123", expectedAccountId: "acct-test-456" };
const cleanConfig = { headers: [] };

const validWidget = `<!doctype html>
<html><head>
  <script
    src='https://widgets.givebutter.com/latest.umd.cjs?acct=acct-test-456'
    defer async
  ></script>
</head><body>
  <givebutter-widget
    frequency = "monthly"
    amount = '5.17'
    id = 'widget-test-123'
  ></givebutter-widget>
</body></html>`;

const stagingWidget = `<!doctype html><html><head>
<meta content="noindex,follow" name="robots"/>
</head><body>
<div class="donation-provider-mount" data-donation-provider="pending" role="region" aria-labelledby="sponsor-light-heading">
  <p role="status">Online sponsorship checkout is not active yet.</p>
</div>
</body></html>`;

const tempRoots = [];
function fixtureRoot({ html = validWidget, config = cleanConfig, files = {} } = {}) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "verify-donate-launch-"));
  tempRoots.push(root);
  fs.writeFileSync(path.join(root, "donate.html"), html, "utf8");
  fs.writeFileSync(path.join(root, "vercel.json"), JSON.stringify(config), "utf8");
  for (const [relative, contents] of Object.entries(files)) {
    const target = path.join(root, relative);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, contents, "utf8");
  }
  return root;
}

function fixtureResult(options = {}) {
  const root = fixtureRoot(options);
  return validate({ root, env: options.env || { VERCEL_ENV: "production" }, allowHostedMockup: options.allowHostedMockup === true, ...ids, ...(options.ids || {}) });
}

try {
  const strictStaging = fixtureResult({ html: stagingWidget, env: { VERCEL_ENV: "production" } });
  assert.ok(strictStaging.errors.some(error => /noindex/i.test(error)), "strict staging: noindex gate");
  assert.ok(strictStaging.errors.some(error => /pending|staging/i.test(error)), "strict staging: pending gate");
  assert.ok(strictStaging.errors.some(error => /widget/i.test(error)), "strict staging: widget gate");
  assert.ok(strictStaging.errors.some(error => /library script/i.test(error)), "strict staging: library gate");

  const hostedMockup = fixtureResult({ html: stagingWidget, env: { VERCEL_ENV: "production" }, allowHostedMockup: true, ids: { expectedWidgetId: "", expectedAccountId: "" } });
  assert.equal(hostedMockup.errors.length, 0, "authorized hosted mockup must allow incomplete checkout");
  assert.ok(hostedMockup.warnings.length >= 4, "authorized hosted mockup must warn loudly");
  for (const source of [
    '<script src = "https://widgets.givebutter.com/latest.umd.cjs"></script>',
    '<script src="https://widgets.givebutter.com/alternate.js?acct=unexpected"></script>',
    '<script src="https://user:pass@widgets.givebutter.com/alternate.js"></script>'
  ]) {
    const hostedTechnicalScript = fixtureResult({
      html: stagingWidget.replace("</head>", `${source}</head>`),
      allowHostedMockup: true,
      ids: { expectedWidgetId: "", expectedAccountId: "" }
    });
    assert.ok(hostedTechnicalScript.errors.some(error => /library script|widget/i.test(error)), `hosted technical script ${source} must disable mockup override`);
  }
  const hostedBodyScript = fixtureResult({
    html: stagingWidget.replace("</body>", '<script src="https://widgets.givebutter.com/body-loader.js"></script></body>'),
    allowHostedMockup: true,
    ids: { expectedWidgetId: "", expectedAccountId: "" }
  });
  assert.ok(hostedBodyScript.errors.some(error => /library script|widget/i.test(error)), "body Givebutter script must disable mockup override");
  const hostedLegacy = fixtureResult({
    html: stagingWidget,
    env: { VERCEL_ENV: "production" },
    allowHostedMockup: true,
    ids: { expectedWidgetId: "", expectedAccountId: "" },
    files: { "legacy.html": ["go", "fund", "me"].join("") }
  });
  assert.ok(hostedLegacy.errors.some(error => /Legacy donation provider/i.test(error)), "hosted mockup must not override legacy-provider errors");
  const changedStatus = fixtureResult({ html: stagingWidget.replace("Online sponsorship checkout is not active yet.", "Checkout is unavailable in this preview."), allowHostedMockup: true, ids: { expectedWidgetId: "", expectedAccountId: "" } });
  assert.ok(changedStatus.errors.length > 0, "changed hosted status must fail strict validation");
  const removedNoindex = fixtureResult({ html: stagingWidget.replace('<meta content="noindex,follow" name="robots"/>', ""), allowHostedMockup: true, ids: { expectedWidgetId: "", expectedAccountId: "" } });
  assert.ok(removedNoindex.errors.length > 0, "removed noindex must disable hosted override");
  const widgetHybrid = fixtureResult({ html: stagingWidget.replace('</body>', '<givebutter-widget amount="5.17" frequency="monthly"></givebutter-widget></body>'), allowHostedMockup: true, ids: { expectedWidgetId: "", expectedAccountId: "" } });
  assert.ok(widgetHybrid.errors.some(error => /exactly one body|widget/i.test(error)), "widget-bearing hybrid must fail");
  const missingLibrary = fixtureResult({ html: validWidget.replace('<givebutter-widget', '<div class="donation-provider-mount" data-donation-provider="pending" role="region" aria-labelledby="sponsor-light-heading"><p role="status">Online sponsorship checkout is not active yet.</p></div><!--').replace('</givebutter-widget>', '--></givebutter-widget>'), allowHostedMockup: true, ids: { expectedWidgetId: "", expectedAccountId: "" } });
  assert.ok(missingLibrary.errors.length > 0, "widget/library hybrid must fail");

  const previewStaging = fixtureResult({
    html: stagingWidget,
    env: { VERCEL_ENV: "preview", ALLOW_INCOMPLETE_DONATE_PREVIEW: "1" }
  });
  assert.equal(previewStaging.errors.length, 0, "preview override must allow synthetic incomplete checkout");
  assert.ok(previewStaging.warnings.length >= 4, "preview override must warn loudly");

  const productionOverride = fixtureResult({
    html: stagingWidget,
    env: { VERCEL_ENV: "production", ALLOW_INCOMPLETE_DONATE_PREVIEW: "1" }
  });
  assert.ok(productionOverride.errors.length > 0, "production must ignore preview override");

  const valid = fixtureResult({ env: { VERCEL_ENV: "production" } });
  assert.deepEqual(valid.errors, [], "multiline/order-independent valid widget must pass");

  for (const amount of ["5.170", "05.17", "5.17e0"]) {
    const amountResult = fixtureResult({ html: validWidget.replace("5.17", amount) });
    assert.ok(amountResult.errors.some(error => /amount/i.test(error)), `amount ${amount} must fail`);
    const hostedAmountResult = fixtureResult({ html: stagingWidget.replace("</body>", `<givebutter-widget amount="${amount}" frequency="monthly"></givebutter-widget></body>`), allowHostedMockup: true, ids: { expectedWidgetId: "", expectedAccountId: "" } });
    assert.ok(hostedAmountResult.errors.some(error => /amount|exactly one body|widget/i.test(error)), `hosted amount ${amount} must fail`);
  }

  for (const frequency of ["Monthly", "month", "permonth", "everymonth"]) {
    const frequencyResult = fixtureResult({ html: validWidget.replace("monthly", frequency) });
    assert.ok(frequencyResult.errors.some(error => /frequency/i.test(error)), `frequency ${frequency} must fail`);
    const hostedFrequencyResult = fixtureResult({ html: stagingWidget.replace("</body>", `<givebutter-widget amount="5.17" frequency="${frequency}"></givebutter-widget></body>`), allowHostedMockup: true, ids: { expectedWidgetId: "", expectedAccountId: "" } });
    assert.ok(hostedFrequencyResult.errors.some(error => /frequency|exactly one body|widget/i.test(error)), `hosted frequency ${frequency} must fail`);
  }

  const duplicateWidget = validWidget.replace("id = 'widget-test-123'", "id = 'widget-test-123' id = 'widget-other'");
  const duplicateWidgetResult = fixtureResult({ html: duplicateWidget });
  assert.ok(duplicateWidgetResult.errors.some(error => /givebutter-widget has duplicate attributes: id/i.test(error)), "duplicate widget id must fail");

  const duplicateScript = validWidget.replace(
    "src='https://widgets.givebutter.com/latest.umd.cjs?acct=acct-test-456'",
    "src='https://widgets.givebutter.com/latest.umd.cjs?acct=acct-test-456' src='https://widgets.givebutter.com/latest.umd.cjs?acct=other'"
  );
  const duplicateScriptResult = fixtureResult({ html: duplicateScript });
  assert.ok(duplicateScriptResult.errors.some(error => /script tag has duplicate attributes: src/i.test(error)), "duplicate script src must fail");

  const duplicateMeta = validWidget.replace("<html><head>", '<html><head><meta name=robots name=googlebot content=none>');
  const duplicateMetaResult = fixtureResult({ html: duplicateMeta });
  assert.ok(duplicateMetaResult.errors.some(error => /meta tag has duplicate attributes: name/i.test(error)), "duplicate meta name must fail");

  const fakeTag = validWidget.replace("<givebutter-widget", "<givebutter-widgetish").replace("</givebutter-widget>", "</givebutter-widgetish>");
  const fakeTagResult = fixtureResult({ html: fakeTag });
  assert.ok(fakeTagResult.errors.some(error => /exactly one body/i.test(error)), "near-miss widget tag must fail");

  const commentedFake = `<!doctype html><head>
<!-- <script async src="https://widgets.givebutter.com/latest.umd.cjs?acct=acct-test-456"></script> -->
</head><body><!-- <givebutter-widget id="widget-test-123" amount="5.17" frequency="monthly"></givebutter-widget> --></body>`;
  const commentedResult = fixtureResult({ html: commentedFake });
  assert.ok(commentedResult.errors.some(error => /exactly one body/i.test(error)), "commented fake must not count");
  assert.ok(commentedResult.errors.some(error => /library script/i.test(error)), "commented library must not count");

  const ignoredBody = `<!doctype html><head><script async src="https://widgets.givebutter.com/latest.umd.cjs?acct=acct-test-456"></script></head><body>
<script><givebutter-widget id="fake"></givebutter-widget></script>
<style><givebutter-widget id="fake"></givebutter-widget></style>
<template><givebutter-widget id="fake"></givebutter-widget></template>
<noscript><givebutter-widget id="fake"></givebutter-widget></noscript>
</body>`;
  const ignoredResult = fixtureResult({ html: ignoredBody });
  assert.ok(ignoredResult.errors.some(error => /exactly one body/i.test(error)), "ignored blocks must not count");

  for (const source of [
    "https://widgets.givebutter.com:444/latest.umd.cjs?acct=acct-test-456",
    "https://user:pass@widgets.givebutter.com/latest.umd.cjs?acct=acct-test-456",
    "https://widgets.givebutter.com/latest.umd.cjs:444?acct=acct-test-456"
  ]) {
    const urlResult = fixtureResult({ html: validWidget.replace("https://widgets.givebutter.com/latest.umd.cjs?acct=acct-test-456", source) });
    assert.ok(urlResult.errors.some(error => /library script/i.test(error)), `library URL ${source} must fail`);
  }

  const secondRobot = validWidget.replace("<html><head>", '<html><head><meta name="googlebot" content="noindex"><meta content=noindex name=bingbot>');
  const secondRobotResult = fixtureResult({ html: secondRobot });
  assert.equal(secondRobotResult.errors.filter(error => /noindex in meta name=/i.test(error)).length, 2, "googlebot and bingbot noindex must fail");

  for (const name of ["robots", "googlebot", "bingbot"]) {
    const noneResult = fixtureResult({ html: validWidget.replace("<html><head>", `<html><head><meta name=${name} content=none>`) });
    assert.ok(noneResult.errors.some(error => /noindex in meta name=/i.test(error)), `${name}=none must fail`);
  }

  const unquotedStaging = validWidget.replace("<body>", "<body><div class=pending></div><div data-stage=placeholder></div>");
  const unquotedStagingResult = fixtureResult({ html: unquotedStaging });
  assert.ok(unquotedStagingResult.errors.some(error => /pending\/staging/i.test(error)), "unquoted staging attributes must fail");

  const configNoindex = fixtureResult({
    env: { VERCEL_ENV: "preview", ALLOW_INCOMPLETE_DONATE_PREVIEW: "1" },
    config: { headers: [{ source: "/(.*)", headers: [{ key: "X-Robots-Tag", value: "noindex" }] }] }
  });
  assert.ok(configNoindex.errors.some(error => /X-Robots-Tag noindex/i.test(error)), "global X-Robots-Tag is never overridable");

  const unrelatedConfig = fixtureResult({
    config: { headers: [{ source: "/mission", headers: [{ key: "X-Robots-Tag", value: "noindex" }] }] }
  });
  assert.equal(unrelatedConfig.errors.filter(error => /X-Robots-Tag noindex/i.test(error)).length, 0, "unrelated X-Robots-Tag rules must not fail");

  for (const source of ["/donate", "/donate.html", "/donate(.*)", "/donate/:path*", "/donate/..."]) {
    const routeConfig = fixtureResult({
      config: { headers: [{ source, headers: [{ key: "X-Robots-Tag", value: "noindex" }] }] }
    });
    assert.ok(routeConfig.errors.some(error => /X-Robots-Tag noindex/i.test(error)), `${source} X-Robots-Tag rule must fail`);
  }

  const equipmentConfig = fixtureResult({
    config: { headers: [{ source: "/donate-equipment", headers: [{ key: "X-Robots-Tag", value: "noindex" }] }] }
  });
  assert.equal(equipmentConfig.errors.filter(error => /X-Robots-Tag noindex/i.test(error)).length, 0, "donate-equipment X-Robots-Tag rule must not fail");

  const legacy = ["go", "fund", "me"].join("");
  const gfm = ["g", "fm"].join("");
  const dotted = ["go", "fund", ".", "me"].join("");
  const deployedExtensions = [".html", ".css", ".js", ".mjs", ".cjs", ".json", ".xml", ".txt", ".svg", ".md", ".map", ".webmanifest", ".manifest"];
  const scannedDirectories = ["work", "docs", "outputs", ".openai"];
  const extensionFiles = {};
  for (const directory of scannedDirectories) {
    for (const extension of deployedExtensions) extensionFiles[`${directory}/public${extension}`] = `provider ${legacy}`;
  }
  extensionFiles["technical.html"] = '<givebutter-widget></givebutter-widget><script src="https://widgets.givebutter.com/latest.umd.cjs?acct=a"></script>';
  extensionFiles["fallback.html"] = '<givebutter-widget><span>Givebutter</span></givebutter-widget>';
  extensionFiles["legacy.html"] = `<p>${gfm}</p><p>${dotted}</p>`;
  const legacyRoot = fixtureRoot({ files: extensionFiles });
  const legacyHits = scanLegacySources(legacyRoot);
  assert.equal(legacyHits.length, deployedExtensions.length * scannedDirectories.length + 3, "all deployable extensions/directories and fallback text must be scanned");

  console.log("verify-donate-launch self-tests passed");
} finally {
  for (const root of tempRoots) fs.rmSync(root, { recursive: true, force: true });
}
