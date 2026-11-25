#!/usr/bin/env node
/**
 * Write FF content pages inspired by scraped peer layouts (not raw peer dumps).
 * Sources: GD poverty-relief, GD legacy-giving, NS strategy, NS FAQ, NS blog.
 * No CodePath.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { page } from './chrome.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

function write(rel, html) {
  const p = path.join(ROOT, rel);
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, html);
  console.log('wrote', rel);
}

const btn = (href, label, ghost = false) =>
  `<a class="ff-btn ${ghost ? 'ff-btn--ghost' : 'ff-btn--primary'}" href="${href}">${label}</a>`;

// —— Why Light ← GD poverty-relief structure ——
write(
  'our-model/why-light/index.html',
  page({
    title: 'Why Light & Learning — Flash Forward',
    description:
      'Without reliable electricity after dark, homework often ends at dusk. Solar Study Lights unlock evening study hours.',
    canonical: '/our-model/why-light/',
    active: 'model',
    bodyClass: 'ff-page-why',
    main: `
<section class="ff-pagehead"><div class="ff-wrap">
<p class="ff-kicker">Why light</p>
<h1>When the sun goes down, studying often stops.</h1>
<p class="ff-lede">Hundreds of millions of people still lack reliable electricity. For students, that can mean homework ends at dusk — lost hours that compound into lost opportunity.</p>
<div class="ff-btnrow">${btn('/donate/', 'Donate a light')}${btn('/our-model/', 'See our model', true)}</div>
</div></section>

<section class="ff-section"><div class="ff-wrap">
<p class="ff-kicker">The unlock</p>
<h2 class="ff-h2">We put lasting light in students’ hands.</h2>
<p class="ff-lede" style="max-width:40rem">One Study Light ≈ <strong>$5.17</strong> in core parts. Solar charged. Built for after-dark homework — not a one-night phone flashlight.</p>
<div class="ff-paths" style="margin-top:2rem">
<a class="ff-path" href="/our-model/the-study-light/"><h3 class="ff-path__title">Things that last</h3><p class="ff-path__text">A dedicated study lamp beats burning phone battery or buying disposable cells every week.</p></a>
<a class="ff-path" href="/impact/outcomes/"><h3 class="ff-path__title">Hours that compound</h3><p class="ff-path__text">Peer research on solar lanterns often finds more evening study time. We lead with study hours unlocked — not invented grade lifts.</p></a>
<a class="ff-path" href="/impact-stories/"><h3 class="ff-path__title">Partners who place</h3><p class="ff-path__text">Distribution partners with student access put lights where they are needed and help us learn what works.</p></a>
</div>
</div></section>

<section class="ff-section ff-section--tint"><div class="ff-wrap">
<p class="ff-kicker">How we respond</p>
<h2 class="ff-h2">The Study Unlock Pathway</h2>
<div class="ff-steps fft-steps--flow" style="margin-top:1.5rem">
<div class="ff-step"><span class="ff-step__num">1</span><h3 class="ff-step__title">Design</h3><p>Students own product, ops, and partner pipelines.</p></div>
<div class="ff-step"><span class="ff-step__num">2</span><h3 class="ff-step__title">Assemble</h3><p>Maker partners build units from parts we supply.</p></div>
<div class="ff-step"><span class="ff-step__num">3</span><h3 class="ff-step__title">Deliver</h3><p>Field partners place lights with learners.</p></div>
<div class="ff-step"><span class="ff-step__num">4</span><h3 class="ff-step__title">Unlock</h3><p>Study hours — our primary KPI.</p></div>
</div>
<div class="ff-btnrow">${btn('/our-model/study-unlock-pathway/', 'Read the pathway')}${btn('/donate/', 'Give in flashlight units', true)}</div>
</div></section>
`,
  }),
);

// —— Our Model ← NS strategy structure ——
write(
  'our-model/index.html',
  page({
    title: 'Our Model — Flash Forward',
    description:
      'Two engines, working as one: student-led design & ops, and partners who assemble and deliver Study Lights.',
    canonical: '/our-model/',
    active: 'model',
    bodyClass: 'ff-page-model',
    main: `
<section class="ff-pagehead"><div class="ff-wrap">
<p class="ff-kicker">Our Model</p>
<h1>Two engines, working as one.</h1>
<p class="ff-lede">Students lead the org. Partners assemble and place Study Lights. Together they unlock study hours after dark.</p>
</div></section>

<section class="ff-section"><div class="ff-wrap ff-split">
<div>
<p class="ff-kicker">Engine 1</p>
<h2 class="ff-h2">Student-led design &amp; ops</h2>
<p>Interns run product, partnerships, and fundraising pipelines. The whole org is unpaid — ownership sits with students.</p>
<div class="ff-btnrow">${btn('/join/', 'Join')}</div>
</div>
<div class="ff-split__media">
<img src="/images/students/student-with-flashlight-2.jpg" alt="Student with a Study Light" width="800" height="600" loading="lazy">
</div>
</div></section>

<section class="ff-section ff-section--tint"><div class="ff-wrap ff-split">
<div class="ff-split__media">
<img src="/images/light/assembled-anchor.webp" alt="Assembled Study Light" width="800" height="600" loading="lazy">
</div>
<div>
<p class="ff-kicker">Engine 2</p>
<h2 class="ff-h2">Partner assembly &amp; delivery</h2>
<p>Robotics clubs and makerspaces build. Distribution partners with student access place lights and help us learn.</p>
<div class="ff-btnrow">${btn('/get-involved/partners/', 'Partner with us')}</div>
</div>
</div></section>

<section class="ff-section"><div class="ff-wrap">
<p class="ff-kicker">Not a workshop myth</p>
<h2 class="ff-h2">Not your traditional charity</h2>
<div class="ff-paths" style="margin-top:1.5rem">
<div class="ff-path"><h3 class="ff-path__title">We design</h3><p class="ff-path__text">Students own the Study Light and the pipelines — we don’t pretend interns solder every unit.</p></div>
<div class="ff-path"><h3 class="ff-path__title">Partners build</h3><p class="ff-path__text">Assembly partners print, solder, and report. Flash Forward supplies key parts.</p></div>
<div class="ff-path"><h3 class="ff-path__title">Hours are the KPI</h3><p class="ff-path__text">Lights shipped support study hours unlocked — with a published method note.</p></div>
</div>
<div class="ff-btnrow" style="margin-top:1.5rem">${btn('/our-model/why-light/', 'Why light matters')}${btn('/donate/', 'Donate a light', true)}</div>
</div></section>
`,
  }),
);

// —— FAQ ← NS FAQ structure ——
write(
  'faq/index.html',
  page({
    title: 'FAQs — Flash Forward',
    description: 'Straight answers about Study Lights, unpaid internships, Study Circle, partners, and donations.',
    canonical: '/faq/',
    active: 'about',
    bodyClass: 'ff-page-faq',
    main: `
<section class="ff-pagehead"><div class="ff-wrap">
<p class="ff-kicker">FAQs</p>
<h1>Frequently asked questions</h1>
<p class="ff-lede">Short answers. If you need a human, <a href="/contact/">contact us</a>.</p>
</div></section>

<section class="ff-section"><div class="ff-wrap" style="max-width:44rem" data-accordion>
${[
  ['What does Flash Forward do?', 'We are a student-led 501(c)(3) that designs solar Study Lights, works with assembly and distribution partners, and unlocks study hours for learners without reliable electricity.'],
  ['How much is one Study Light?', 'About <strong>$5.17</strong> covers core parts for one flashlight unit. Shipping is case-by-case.'],
  ['Are internships paid?', 'No. Every seat is unpaid — including leadership. Interns run real pipelines; assembly partners build the lights.'],
  ['What is Study Circle?', 'Monthly giving that keeps the pathway funded. You can give once or join Study Circle on the <a href="/donate/">donate page</a>.'],
  ['Can I prefer a school or region?', 'Yes — Impact Stories support preference-based giving. We match best-effort; it is not a binding cash designation.'],
  ['Do you take general volunteers?', 'We don’t offer open volunteer shifts. Choose Donate, Join (internship/open roles), Ambassadors, or Partner paths instead.'],
  ['What is your EIN?', '<strong>39-3605570</strong>. Bellevue, Washington. See <a href="/nonprofit-status/">Nonprofit Status</a>.'],
]
  .map(
    ([q, a], i) => `<div class="ff-acc${i === 0 ? ' is-open' : ''}" data-accordion-item>
<button type="button" class="ff-acc__btn" data-accordion-trigger aria-expanded="${i === 0 ? 'true' : 'false'}">${q}</button>
<div class="ff-acc__panel"><p>${a}</p></div>
</div>`,
  )
  .join('\n')}
</div></section>

<section class="ff-section ff-section--tint"><div class="ff-wrap">
<p class="ff-kicker">Still stuck?</p>
<h2 class="ff-h2">Contact us</h2>
<p class="ff-lede">Tell us whether you’re donating, applying, or exploring a partnership.</p>
<div class="ff-btnrow">${btn('/contact/', 'Contact')}</div>
</div></section>
`,
  }),
);

// —— News ← NS blog structure ——
write(
  'news/index.html',
  page({
    title: 'News — Flash Forward',
    description: 'Updates from the Study Unlock Pathway — partners, lights placed, and student leadership.',
    canonical: '/news/',
    active: 'about',
    bodyClass: 'ff-page-news',
    main: `
<section class="ff-pagehead"><div class="ff-wrap">
<p class="ff-kicker">News</p>
<h1>Latest stories</h1>
<p class="ff-lede">Field updates and milestones from Flash Forward.</p>
</div></section>

<section class="ff-section"><div class="ff-wrap">
<div class="ff-storyrow">
<a class="ff-storyrow__item" href="/news/malaika-15-lights/"><img class="ff-storyrow__img" src="/images/students/student-with-flashlight-1.jpg" alt="" width="320" height="200" loading="lazy"><div><p class="ff-storyrow__type">Partner · DR Congo</p><h2 class="ff-storyrow__title">Malaika — 15 lights</h2><p class="ff-storyrow__need">Study Lights with a partner school community.</p></div></a>
<a class="ff-storyrow__item" href="/news/brighten-haiti-42-lights/"><img class="ff-storyrow__img" src="/images/students/student-with-flashlight-3.jpg" alt="" width="320" height="200" loading="lazy"><div><p class="ff-storyrow__type">Partner · Haiti</p><h2 class="ff-storyrow__title">Brighten Haiti — 42 lights</h2><p class="ff-storyrow__need">Placement update with Brighten Haiti.</p></div></a>
<a class="ff-storyrow__item" href="/news/loksadhana-15-lights/"><img class="ff-storyrow__img" src="/images/students/student-with-flashlight-2.jpg" alt="" width="320" height="200" loading="lazy"><div><p class="ff-storyrow__type">Partner · India</p><h2 class="ff-storyrow__title">Loksadhana — 15 lights</h2><p class="ff-storyrow__need">Lights placed with Loksadhana partners.</p></div></a>
<a class="ff-storyrow__item" href="/news/irs-recognition/"><div><p class="ff-storyrow__type">Org</p><h2 class="ff-storyrow__title">IRS recognition</h2><p class="ff-storyrow__need">501(c)(3) determination — EIN 39-3605570.</p></div></a>
<a class="ff-storyrow__item" href="/news/founded/"><div><p class="ff-storyrow__type">Org</p><h2 class="ff-storyrow__title">Founded</h2><p class="ff-storyrow__need">How the student-led org started in Bellevue.</p></div></a>
<a class="ff-storyrow__item" href="/news/why-study-lights/"><div><p class="ff-storyrow__type">Explainers</p><h2 class="ff-storyrow__title">Why study lights</h2><p class="ff-storyrow__need">The case for evening light as study unlock.</p></div></a>
</div>
<div class="ff-btnrow" style="margin-top:2rem">${btn('/impact-stories/', 'Impact Stories')}${btn('/contact/', 'Get updates', true)}</div>
</div></section>
`,
  }),
);

// —— Legacy giving ← GD legacy-giving ——
write(
  'get-involved/legacy-giving/index.html',
  page({
    title: 'Legacy giving — Flash Forward',
    description:
      'Leave a lasting gift of study hours. Include Flash Forward in your estate plans — EIN 39-3605570.',
    canonical: '/get-involved/legacy-giving/',
    active: 'involved',
    bodyClass: 'ff-page-legacy',
    main: `
<section class="ff-pagehead"><div class="ff-wrap">
<p class="ff-kicker">Legacy giving</p>
<h1>Create a legacy of study hours.</h1>
<p class="ff-lede">Your future gift can keep Study Lights moving through Design → Assemble → Deliver → Unlock — long after a one-time donation.</p>
<div class="ff-btnrow">${btn('/contact/', 'Talk with us')}${btn('/donate/', 'Give today', true)}</div>
</div></section>

<section class="ff-section"><div class="ff-wrap">
<p class="ff-kicker">Why donors plan ahead</p>
<h2 class="ff-h2">A gift that outlasts one semester</h2>
<div class="ff-paths" style="margin-top:1.5rem">
<div class="ff-path"><h3 class="ff-path__title">Live your values</h3><p class="ff-path__text">Support student-led work and partner-built lights for learners without evening electricity.</p></div>
<div class="ff-path"><h3 class="ff-path__title">Clear &amp; lean</h3><p class="ff-path__text">Unpaid org. Flashlight-unit language (~$5.17). Preference-based Impact Stories — best effort, not binding.</p></div>
<div class="ff-path"><h3 class="ff-path__title">Transparent</h3><p class="ff-path__text">EIN <strong>39-3605570</strong>. See <a href="/nonprofit-status/">Nonprofit Status</a> and <a href="/impact/reports/">Reports</a>.</p></div>
</div>
</div></section>

<section class="ff-section ff-section--tint"><div class="ff-wrap">
<p class="ff-kicker">Ways to leave a gift</p>
<h2 class="ff-h2">Simple paths to start</h2>
<ul class="ff-list" style="max-width:40rem;margin-top:1rem">
<li>Name Flash Forward Foundation in your will or trust (EIN 39-3605570).</li>
<li>Beneficiary designation on a retirement or investment account.</li>
<li>Talk with us first if you want a preference toward a partner region — we match best-effort.</li>
</ul>
<p class="ff-lede">We’re a small student-led org — we’ll connect you with the right paperwork path without a hard sell.</p>
<div class="ff-btnrow">${btn('/contact/', 'Start a conversation')}</div>
</div></section>
`,
  }),
);

console.log('peer-inspired pages written');
