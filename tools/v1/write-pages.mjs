#!/usr/bin/env node
/** Write Flash Forward v1 priority pages. Run: node tools/v1/write-pages.mjs */
import { mkdirSync, writeFileSync, readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { page, pagehead } from './chrome.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '../..');
const out = (rel, html) => {
  const file = join(ROOT, rel.replace(/^\//, ''), 'index.html');
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, html);
  console.log('wrote', rel);
};

const APPLY_FORM = `<section class="ff-section" id="apply"><div class="ff-wrap">
<div class="fft-apply__grid">
<div class="fft-apply__intro">
<p class="ff-kicker">Apply</p>
<h2 class="ff-h2">One form. Pick your track.</h2>
<p class="ff-lede">Internships, open leadership seats, and Ambassadors share this funnel. The entire organization is unpaid — including C-suite and interns.</p>
<ul class="fft-apply__facts"><li>Fully remote-friendly</li><li>High school, college, and early career</li><li>Flexible around classes</li><li>Unpaid — for students, by students</li></ul>
</div>
<div class="fft-apply__panel">
<div class="fft-apply__embed" data-apply-mode="embed">
<div class="fft-apply__embedbar"><p>Trouble signing in or uploading below?</p><a class="ff-btn ff-btn--ghost fft-apply__newtab" href="https://docs.google.com/forms/d/1idKUsHwDnd4aVACYKfKElELrKZI7u-Ru9Pwb9O-GfaA/viewform" target="_blank" rel="noopener">Open application in a new tab</a></div>
<iframe data-src="https://docs.google.com/forms/d/1idKUsHwDnd4aVACYKfKElELrKZI7u-Ru9Pwb9O-GfaA/viewform?embedded=true" data-form-pages="5" title="Flash Forward application" loading="lazy"></iframe>
</div>
<form class="fft-apply__form" data-apply-mode="form" hidden data-apply-form action="/api/apply" method="post" enctype="multipart/form-data" novalidate>
<div class="fft-apply__row">
<div class="fft-field" data-field="first_name"><label class="fft-field__label" for="ap-first_name">First name</label><input id="ap-first_name" name="first_name" type="text" autocomplete="given-name" maxlength="80" required><p class="fft-field__err"></p></div>
<div class="fft-field" data-field="last_name"><label class="fft-field__label" for="ap-last_name">Last name</label><input id="ap-last_name" name="last_name" type="text" autocomplete="family-name" maxlength="80" required><p class="fft-field__err"></p></div>
</div>
<div class="fft-field" data-field="email"><label class="fft-field__label" for="ap-email">Email</label><input id="ap-email" name="email" type="email" inputmode="email" autocomplete="email" maxlength="200" required><p class="fft-field__err"></p></div>
<div class="fft-apply__row">
<div class="fft-field" data-field="school"><label class="fft-field__label" for="ap-school">School or org</label><input id="ap-school" name="school" type="text" autocomplete="organization" maxlength="200" required><p class="fft-field__err"></p></div>
<div class="fft-field" data-field="grade"><label class="fft-field__label" for="ap-grade">Grade or year</label><select id="ap-grade" name="grade" required><option value="">Choose one</option><option>9th grade</option><option>10th grade</option><option>11th grade</option><option>12th grade</option><option>College freshman</option><option>College sophomore</option><option>College junior</option><option>College senior</option><option>Early career / other</option></select><p class="fft-field__err"></p></div>
</div>
<fieldset class="fft-field fft-field--tracks" data-field="track"><legend class="fft-field__label">Track</legend>
<div class="fft-tracks">
<label class="fft-track"><input type="radio" name="track" value="Marketing &amp; Communications" data-track="marketing" required><span class="fft-track__name">Internship · Marketing</span><span class="fft-track__text">Campaigns, writing, design, video</span></label>
<label class="fft-track"><input type="radio" name="track" value="Partnerships &amp; Operations" data-track="partnerships-operations" required><span class="fft-track__name">Internship · Partnerships &amp; Ops</span><span class="fft-track__text">Partner pipelines and delivery</span></label>
<label class="fft-track"><input type="radio" name="track" value="Fundraising &amp; Growth" data-track="fundraising" required><span class="fft-track__name">Internship · Fundraising &amp; Growth</span><span class="fft-track__text">Grants, sponsors, Study Circle</span></label>
<label class="fft-track"><input type="radio" name="track" value="Ambassador" data-track="ambassador" required><span class="fft-track__name">Ambassador</span><span class="fft-track__text">Awareness, connections, content, peer fundraise</span></label>
<label class="fft-track"><input type="radio" name="track" value="Open role" data-track="opening" required><span class="fft-track__name">Open leadership role</span><span class="fft-track__text">COO, CPO, CFO, or Director seat</span></label>
<label class="fft-track"><input type="radio" name="track" value="Not sure yet" data-track="" required><span class="fft-track__name">Not sure yet</span><span class="fft-track__text">We will help you choose</span></label>
</div>
<p class="fft-field__err"></p></fieldset>
<div class="fft-field" data-field="why"><label class="fft-field__label" for="ap-why">Why Flash Forward — and what would you ship in 90 days?</label><p class="fft-field__hint">A few sentences is enough. If you apply to both internship and ambassador, you will choose one if both are offered.</p><textarea id="ap-why" name="why" rows="4" maxlength="1500" required></textarea><p class="fft-field__err"></p></div>
<div class="fft-field" data-field="resume"><span class="fft-field__label">Resume</span>
<label class="fft-drop"><input name="resume" type="file" accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document" required><span class="fft-drop__text" data-drop-text>Drop your resume here or <u>choose a file</u></span><span class="fft-drop__hint">PDF or Word, up to 4 MB</span></label>
<p class="fft-field__err"></p></div>
<div class="fft-hp" aria-hidden="true"><label>Website <input name="website" type="text" tabindex="-1" autocomplete="off"></label></div>
<input type="hidden" name="_t" value="">
<div class="fft-apply__check" data-turnstile></div>
<p class="fft-apply__msg" role="alert"></p>
<button type="submit" class="ff-btn ff-btn--primary fft-apply__submit">Submit application</button>
</form>
<div class="fft-apply__done" role="status" tabindex="-1" hidden>
<h3>Application received</h3>
<p>Thank you. We review every application and reply by email.</p>
</div>
</div>
</div>
</div></section>`;

// ——— HOME ———
out('/', page({
  title: 'Flash Forward Foundation | Solar study light, student-led',
  description: 'Flash Forward is a student-led nonprofit. Through the Study Unlock Pathway, assembly and distribution partners place solar study lights that unlock ~5,000 modeled study hours a year.',
  canonical: '/',
  active: '',
  bodyClass: 'ff-page-home',
  main: `
<section class="ff-hero" aria-label="Hero">
<div class="ff-hero__media" aria-hidden="true">
<img src="/images/students/student-with-flashlight-3.jpg" alt="" width="1200" height="800">
</div>
<div class="ff-hero__scrim" aria-hidden="true"></div>
<div class="ff-wrap"><div class="ff-hero__content ff-hero__rise">
<p class="ff-hero__brand">Flash Forward</p>
<h1 class="ff-hero__promise">Student-led light. Study hours unlocked.</h1>
<p class="ff-hero__lede">We design solar study lights, partner for assembly and delivery, and put reliable evening light in the hands of learners without electricity.</p>
<div class="ff-btnrow">
<a class="ff-btn ff-btn--primary" href="/donate/">Donate</a>
<a class="ff-btn ff-btn--ghost-inv" href="/join/">Join</a>
<a class="ff-btn ff-btn--ghost-inv" href="/get-involved/">Get Involved</a>
</div>
</div></div>
</section>

<section class="ff-section"><div class="ff-wrap ff-prose" style="max-width:40rem">
<p class="ff-kicker">The problem</p>
<h2 class="ff-h2">When the sun goes down, studying often stops.</h2>
<p class="ff-lede">Hundreds of millions of people still lack reliable electricity. For students, that can mean homework ends at dusk — lost hours that compound into lost opportunity.</p>
</div>
<div class="ff-wrap" style="margin-top:32px">
<img class="ff-fullbleed" src="/images/students/student-with-flashlight-1.jpg" alt="A student studying with a solar flashlight" width="1151" height="768">
</div></section>

<section class="ff-section ff-section--tint"><div class="ff-wrap">
<p class="ff-kicker">Our model</p>
<h2 class="ff-h2">The Study Unlock Pathway</h2>
<p class="ff-lede">Design → Assemble → Deliver → Unlock. Students lead design and operations. Assembly partners build. Distribution partners place lights with learners.</p>
<div class="ff-pathway" data-pathway>
<div class="ff-pathway__step" data-pathway-step><p class="ff-pathway__verb">Design</p><p class="ff-pathway__who">Student-led design &amp; ops</p><p class="ff-pathway__text">Interns run product, partnerships, and fundraising pipelines — not soldering lines.</p></div>
<div class="ff-pathway__step" data-pathway-step><p class="ff-pathway__verb">Assemble</p><p class="ff-pathway__who">Assembly partners</p><p class="ff-pathway__text">Robotics clubs and makerspaces print, solder, and report dimensions. Flash Forward supplies key parts.</p></div>
<div class="ff-pathway__step" data-pathway-step><p class="ff-pathway__verb">Deliver</p><p class="ff-pathway__who">Distribution partners</p><p class="ff-pathway__text">Local orgs with student access place lights and help us learn what works.</p></div>
<div class="ff-pathway__step" data-pathway-step><p class="ff-pathway__verb">Unlock</p><p class="ff-pathway__who">Study impact</p><p class="ff-pathway__text">Modeled study hours unlocked — with a transparent method, not inflated claims.</p></div>
</div>
<p style="margin-top:28px"><a class="ff-link-more" href="/our-model/study-unlock-pathway/">Explore the pathway →</a></p>
</div></section>

<section class="ff-section"><div class="ff-wrap">
<p class="ff-kicker">Proof</p>
<div class="ff-kpi">
<div>
<p class="ff-kpi__num" data-countup="5000">~5,000</p>
<p class="ff-kpi__label">study hours unlocked / year (modeled)</p>
<p class="ff-kpi__support">From 72 study lights shipped × published research on extra evening study time. <a href="/impact/outcomes/">How we estimate this →</a></p>
</div>
<div>
<a class="ff-storyrow__item" href="/impact-stories/malaika/" style="border:1px solid var(--ff-line);padding:16px;border-radius:4px;display:grid;grid-template-columns:120px 1fr;gap:16px;text-decoration:none;color:inherit">
<div class="ff-storyrow__media"><img src="/images/partners/malaika/students-3.webp" alt="" width="400" height="300"></div>
<div>
<p class="ff-storyrow__type">School · DR Congo</p>
<p class="ff-storyrow__title">Malaika, Kalebuka</p>
<p class="ff-storyrow__need">15 lights with a partner school community — give in flashlight units ($5.17).</p>
</div>
</a>
</div>
</div>
</div></section>

<section class="ff-section ff-section--tint"><div class="ff-wrap">
<div class="ff-split">
<div>
<p class="ff-kicker">For students, by students</p>
<h2 class="ff-h2">Join is half the brand.</h2>
<p class="ff-lede">Interns run partnership and fundraising pipelines. They do not build the lights — assembly partners do. The whole org is unpaid.</p>
<div class="ff-btnrow"><a class="ff-btn ff-btn--primary" href="/join/apply/">Apply</a><a class="ff-btn ff-btn--ghost" href="/join/">See Join</a></div>
</div>
<div class="ff-split__media">
<img src="/images/build/packagedlights.webp" alt="Packaged solar study lights ready for partners" width="800" height="600">
</div>
</div>
</div></section>

<section class="ff-section"><div class="ff-wrap">
<p class="ff-kicker">Get Involved</p>
<h2 class="ff-h2">Pick a path that is live today.</h2>
<div class="ff-paths">
<a class="ff-path" href="/donate/"><p class="ff-path__title">Donate</p><p class="ff-path__text">One-time gifts in flashlight units at $5.17 parts.</p></a>
<a class="ff-path" href="/donate/#study-circle"><p class="ff-path__title">Study Circle</p><p class="ff-path__text">Monthly giving that keeps the pathway funded.</p></a>
<a class="ff-path" href="/impact-stories/"><p class="ff-path__title">Sponsor a story</p><p class="ff-path__text">Preference-based giving tied to a school, community, or region.</p></a>
<a class="ff-path" href="/join/"><p class="ff-path__title">Join</p><p class="ff-path__text">Internships and open leadership seats.</p></a>
<a class="ff-path" href="/get-involved/partners/assembly/"><p class="ff-path__title">Assemble</p><p class="ff-path__text">Makerspaces and robotics teams that build lights.</p></a>
<a class="ff-path" href="/get-involved/partners/distribution/"><p class="ff-path__title">Distribute</p><p class="ff-path__text">Orgs with student access that place lights.</p></a>
</div>
</div></section>

<section class="ff-section ff-section--inverse"><div class="ff-wrap">
<p class="ff-kicker">Trust</p>
<h2 class="ff-h2">A lean, unpaid team. A clear model.</h2>
<p class="ff-lede">Flash Forward Foundation is a 501(c)(3) public charity. EIN 39-3605570. We publish study-hours with a method note — not fake grade percentages.</p>
<div class="ff-trust">
<div class="ff-trust__item"><strong>501(c)(3)</strong> Public charity</div>
<div class="ff-trust__item"><strong>EIN 39-3605570</strong> Legal bar</div>
<div class="ff-trust__item"><strong>$5.17</strong> Parts per study light</div>
</div>
<p style="margin-top:28px"><a class="ff-link-more" href="/faq/" style="color:#fff">FAQ →</a> · <a class="ff-link-more" href="/nonprofit-status/" style="color:#fff">Nonprofit status →</a></p>
</div></section>
`,
}));

// ——— OUR MODEL HUB ———
out('/our-model/', page({
  title: 'Our Model | Flash Forward Foundation',
  description: 'How Flash Forward creates education outcomes: the Study Unlock Pathway from student design to partner assembly, delivery, and study hours unlocked.',
  canonical: '/our-model/',
  active: 'model',
  main: pagehead('Our Model', 'How study light becomes study time.', 'Students lead design and ops. Assembly partners build. Distribution partners place lights. We measure study hours unlocked — honestly.')
    + `<section class="ff-section"><div class="ff-wrap">
<div class="ff-hublist">
<a href="/our-model/why-light/"><div><p class="ff-hublist__title">Why Light &amp; Learning</p><p class="ff-hublist__desc">Energy inequality and lost evening study time.</p></div><span class="ff-hublist__arrow">→</span></a>
<a href="/our-model/study-unlock-pathway/"><div><p class="ff-hublist__title">Study Unlock Pathway</p><p class="ff-hublist__desc">Design → Assemble → Deliver → Unlock.</p></div><span class="ff-hublist__arrow">→</span></a>
<a href="/our-model/the-study-light/"><div><p class="ff-hublist__title">The Study Light</p><p class="ff-hublist__desc">Product, $5.17 parts, what a gift buys.</p></div><span class="ff-hublist__arrow">→</span></a>
<a href="/our-model/made-and-delivered/"><div><p class="ff-hublist__title">How Lights Are Made &amp; Delivered</p><p class="ff-hublist__desc">Assembly and distribution partners only.</p></div><span class="ff-hublist__arrow">→</span></a>
<a href="/our-model/for-students/"><div><p class="ff-hublist__title">For Students, By Students</p><p class="ff-hublist__desc">Internship and ops as brand pillar — not soldering theater.</p></div><span class="ff-hublist__arrow">→</span></a>
</div>
<div class="ff-btnrow"><a class="ff-btn ff-btn--primary" href="/our-model/study-unlock-pathway/">Explore Study Unlock Pathway</a></div>
</div></section>`,
}));

out('/our-model/study-unlock-pathway/', page({
  title: 'Study Unlock Pathway | Flash Forward Foundation',
  description: 'Flash Forward’s named model: Design (students) → Assemble (partners) → Deliver (partners) → Unlock study impact.',
  canonical: '/our-model/study-unlock-pathway/',
  active: 'model',
  main: pagehead('Our Model', 'Study Unlock Pathway', 'Four steps from student-led design to study hours unlocked. Interns run pipelines; assembly partners build every light.')
    + `<section class="ff-section"><div class="ff-wrap">
<div class="ff-pathway" data-pathway>
<div class="ff-pathway__step" data-pathway-step><p class="ff-pathway__verb">1 · Design</p><p class="ff-pathway__who">Student-led design &amp; ops</p><p class="ff-pathway__text">Product choices, partner outreach, fundraising, and shipping labels — run by unpaid student interns and leadership.</p></div>
<div class="ff-pathway__step" data-pathway-step><p class="ff-pathway__verb">2 · Assemble</p><p class="ff-pathway__who">Assembly partners</p><p class="ff-pathway__text">Robotics clubs and makerspaces with printers and soldering kits. They print housings, assemble, and report dims/weight.</p></div>
<div class="ff-pathway__step" data-pathway-step><p class="ff-pathway__verb">3 · Deliver</p><p class="ff-pathway__who">Distribution partners</p><p class="ff-pathway__text">Orgs with access to students receive lights and place them where evening study is constrained.</p></div>
<div class="ff-pathway__step" data-pathway-step><p class="ff-pathway__verb">4 · Unlock</p><p class="ff-pathway__who">Study impact</p><p class="ff-pathway__text">We lead with modeled study hours and a public method note. Lights shipped are supporting output.</p></div>
</div>
</div></section>
<section class="ff-section ff-section--tint"><div class="ff-wrap">
<p class="ff-kicker">Who does what</p>
<h2 class="ff-h2">Clear roles. No workshop myth.</h2>
<table class="ff-table">
<thead><tr><th>Role</th><th>Does</th><th>Does not</th></tr></thead>
<tbody>
<tr><td>Student interns &amp; board</td><td>Design, ops, partnerships, fundraising</td><td>Build lights on a Bellevue workshop line</td></tr>
<tr><td>Assembly partners</td><td>Print, solder, assemble, report specs</td><td>Own destination preference for donors</td></tr>
<tr><td>Distribution partners</td><td>Place lights with learners; deepen surveys over time</td><td>Guarantee person-level cash transfers</td></tr>
</tbody>
</table>
<div class="ff-btnrow"><a class="ff-btn ff-btn--primary" href="/get-involved/">Get Involved</a><a class="ff-btn ff-btn--ghost" href="/donate/">Donate</a></div>
</div></section>`,
}));

out('/our-model/why-light/', page({
  title: 'Why Light & Learning | Flash Forward Foundation',
  description: 'Why Flash Forward focuses on solar study light: energy inequality cuts evening study time for students without reliable electricity.',
  canonical: '/our-model/why-light/',
  active: 'model',
  main: pagehead('Our Model', 'Why light &amp; learning', 'Without reliable electricity, homework often ends at sunset. A task light does not fix every barrier — but it buys back evening hours.')
    + `<section class="ff-section"><div class="ff-wrap ff-prose">
<p>Tracking SDG 7 still counts hundreds of millions of people without electricity access. In off-grid and weak-grid homes, kerosene and phone flashlights are common — expensive, dim, or unsafe for long study.</p>
<p>Peer research on solar lanterns often finds <strong>more evening study time</strong>, with mixed results on exam scores. Flash Forward therefore leads with <em>study hours unlocked</em>, not invented grade lifts. See our <a href="/impact/outcomes/">outcomes method</a>.</p>
<p>Our response is the <a href="/our-model/study-unlock-pathway/">Study Unlock Pathway</a>: a lean student-led org, assembly partners who build, and distribution partners who place lights.</p>
<div class="ff-btnrow"><a class="ff-btn ff-btn--primary" href="/our-model/study-unlock-pathway/">See the pathway</a><a class="ff-btn ff-btn--ghost" href="/donate/">Donate</a></div>
</div></section>`,
}));

out('/our-model/the-study-light/', page({
  title: 'The Study Light | Flash Forward Foundation',
  description: 'About $5.17 covers the core parts for one Flash Forward solar study light. Speak in flashlight units; shipping is case-by-case.',
  canonical: '/our-model/the-study-light/',
  active: 'model',
  main: pagehead('Our Model', 'The study light', 'A compact solar task light designed for evening homework. About $5.17 covers core parts — one flashlight unit.')
    + `<section class="ff-section"><div class="ff-wrap">
<div class="ff-split">
<div class="ff-prose">
<p>Each unit pairs a small solar panel, recharge module, battery, and LEDs in a printed housing. About seven hours of sun can yield up to roughly twelve hours of light on a full charge — enough for nights of reading and homework.</p>
<p><strong>$5.17</strong> is the parts cost for one light. Shipping is case-by-case or partner-sponsored; we say so plainly on Donate. Assembly partners print housings and assemble; Flash Forward supplies key electrical parts and shipping labels.</p>
<table class="ff-table">
<thead><tr><th>Flashlight units</th><th>Parts gift</th></tr></thead>
<tbody>
<tr><td>1</td><td>$5.17</td></tr>
<tr><td>5</td><td>$25.85</td></tr>
<tr><td>10</td><td>$51.70</td></tr>
<tr><td>20</td><td>$103.40</td></tr>
</tbody>
</table>
<div class="ff-btnrow"><a class="ff-btn ff-btn--primary" href="/donate/">Sponsor a light</a></div>
</div>
<div class="ff-split__media">
<img src="/images/light/assembled-anchor.webp" alt="Assembled Flash Forward solar study light" width="800" height="600">
</div>
</div>
</div></section>`,
}));

out('/our-model/made-and-delivered/', page({
  title: 'How Lights Are Made & Delivered | Flash Forward',
  description: 'Assembly partners build Flash Forward study lights. Distribution partners place them with students. Interns run the pipelines — they do not solder every light.',
  canonical: '/our-model/made-and-delivered/',
  active: 'model',
  main: pagehead('Our Model', 'Made by partners. Delivered by partners.', 'Flash Forward does not run Bellevue build workshops as the product. Assembly partners craft; distribution partners place; students lead the org.')
    + `<section class="ff-section"><div class="ff-wrap">
<div class="ff-split">
<div class="ff-prose">
<h2 class="ff-h3">Assembly partners</h2>
<p>Robotics clubs, makerspaces, and builder teams with a 3D printer, soldering kit, and engineering experience. Soft public bar; we screen after apply. Partners print housings (self-funded). Flash Forward orders solar panel, battery recharge module, and battery to them. They assemble, report dimensions and weight; we buy the shipping label; they drop at the carrier.</p>
<h2 class="ff-h3" style="margin-top:28px">Distribution partners</h2>
<p>Local organizations with access to students. Light public requirements; surveys and media deepen after the relationship starts. Shipping may be domestic handoff or international when sponsored.</p>
<div class="ff-btnrow">
<a class="ff-btn ff-btn--primary" href="/get-involved/partners/assembly/">Become an assembly partner</a>
<a class="ff-btn ff-btn--ghost" href="/get-involved/partners/distribution/">Become a distribution partner</a>
</div>
</div>
<div class="ff-split__media">
<img src="/images/build/flashlightinshippingcontainer.webp" alt="Study lights packed for shipment to partners" width="800" height="600">
</div>
</div>
</div></section>`,
}));

out('/our-model/for-students/', page({
  title: 'For Students, By Students | Flash Forward Foundation',
  description: 'Join is half of Flash Forward’s brand: unpaid student interns run pipelines and partnerships. Assembly partners build the lights.',
  canonical: '/our-model/for-students/',
  active: 'model',
  main: pagehead('Our Model', 'For students, by students', 'Half the brand is the unpaid student team that runs the organization. The other half is light for off-grid learners.')
    + `<section class="ff-section"><div class="ff-wrap ff-prose">
<p>Flash Forward was founded by students. Internships in Marketing, Partnerships &amp; Operations, and Fundraising are real operating roles — partner CRM, campaigns, grant drafts — not a hardware class where interns solder every unit.</p>
<p>Lights are built by <a href="/get-involved/partners/assembly/">assembly partners</a>. That keeps the model scalable and honest.</p>
<div class="ff-btnrow"><a class="ff-btn ff-btn--primary" href="/join/apply/">Apply on Join</a><a class="ff-btn ff-btn--ghost" href="/join/">Explore Join</a></div>
</div></section>`,
}));

// ——— IMPACT ———
out('/impact/', page({
  title: 'Impact | Flash Forward Foundation',
  description: 'Flash Forward impact: ~5,000 modeled study hours per year from 72 lights, Impact Stories, and nonprofit reports — without fake spend charts.',
  canonical: '/impact/',
  active: 'impact',
  main: pagehead('Impact', 'Proof with honesty.', 'We lead with study hours unlocked and a public method. Lights shipped support the story. Impact Stories show where gifts can go.')
    + `<section class="ff-section"><div class="ff-wrap">
<div class="ff-hublist">
<a href="/impact/outcomes/"><div><p class="ff-hublist__title">Outcomes &amp; How We Measure</p><p class="ff-hublist__desc">~5,000 study hours / year modeled; 72 lights supporting.</p></div><span class="ff-hublist__arrow">→</span></a>
<a href="/impact/reports/"><div><p class="ff-hublist__title">Reports &amp; Financials</p><p class="ff-hublist__desc">Nonprofit cues and model strength — no % spend pies.</p></div><span class="ff-hublist__arrow">→</span></a>
<a href="/impact-stories/"><div><p class="ff-hublist__title">Impact Stories</p><p class="ff-hublist__desc">People, schools, communities, regions.</p></div><span class="ff-hublist__arrow">→</span></a>
</div>
</div></section>`,
}));

out('/impact/outcomes/', page({
  title: 'Outcomes & How We Measure | Flash Forward',
  description: 'About 5,000 study hours per year unlocked, modeled from 72 lights shipped and published research on extra evening study time.',
  canonical: '/impact/outcomes/',
  active: 'impact',
  main: pagehead('Impact', 'Outcomes &amp; how we measure', 'Primary KPI: modeled study hours unlocked per year. Supporting output: 72 study lights shipped. We do not invent grade percentages.')
    + `<section class="ff-section"><div class="ff-wrap">
<div class="ff-kpi">
<div>
<p class="ff-kpi__num">~5,000</p>
<p class="ff-kpi__label">study hours unlocked / year (modeled)</p>
<p class="ff-kpi__support">72 lights × 1 primary student × 0.35 extra hours/evening × 200 school-year evenings ≈ 5,040 → ~5,000.</p>
</div>
<div class="ff-prose">
<p>The 0.35 hour coefficient is a midpoint of published RCT increments on extra study after solar task lighting (roughly 12–30 minutes/day in Bangladesh and Uganda studies). Peer work often finds more study time without clear exam gains — so we claim hours unlocked, not test scores.</p>
<p><a href="/impact-stories/">See Impact Stories →</a></p>
</div>
</div>
</div></section>
<section class="ff-section ff-section--tint"><div class="ff-wrap">
<p class="ff-kicker">Sensitivity</p>
<h2 class="ff-h2">Same formula, different assumptions</h2>
<table class="ff-table">
<thead><tr><th>Scenario</th><th>Extra h / evening</th><th>Result (72 lights)</th></tr></thead>
<tbody>
<tr><td>Conservative</td><td>0.20</td><td>~2,900 h / year</td></tr>
<tr><td><strong>v1 headline</strong></td><td><strong>0.35</strong></td><td><strong>~5,000 h / year</strong></td></tr>
<tr><td>Upper RCT-ish</td><td>0.50</td><td>~7,200 h / year</td></tr>
</tbody>
</table>
<p class="ff-kpi__support">Sources include Kudo et al. (Bangladesh RCT) and Furukawa (Uganda pilot). Full citations live with our method note for board sign-off.</p>
<div class="ff-btnrow"><a class="ff-btn ff-btn--primary" href="/donate/">Donate</a></div>
</div></section>`,
}));

out('/impact/reports/', page({
  title: 'Reports & Financials | Flash Forward Foundation',
  description: 'Flash Forward Foundation nonprofit status, determination letter, and lean model narrative. No percentage spend charts.',
  canonical: '/impact/reports/',
  active: 'impact',
  main: pagehead('Impact', 'Reports &amp; financials', 'Modern, lean, unpaid. We publish nonprofit cues and model strength — not vanity pie charts.')
    + `<section class="ff-section"><div class="ff-wrap ff-prose">
<p>Flash Forward Foundation is a 501(c)(3) public charity (EIN <strong>39-3605570</strong>). The entire organization is unpaid: board, open C-suite seats, interns, and ambassadors.</p>
<p>Donation-to-impact translation comes from the model: $5.17 parts units, partner assembly, partner delivery, and study-hours reporting with a method note.</p>
<ul>
<li><a href="/nonprofit-status/">Nonprofit status &amp; determination letter</a></li>
<li><a href="/impact/outcomes/">Outcomes method</a></li>
<li><a href="/donate/">Donate</a></li>
</ul>
</div></section>`,
}));

// ——— IMPACT STORIES ———
function storyPage({ slug, title, type, region, dest, img, imgAlt, who, why, voice, unitsNote }) {
  out(`/impact-stories/${slug}/`, page({
    title: `${title} | Impact Stories | Flash Forward`,
    description: `${who} Preference-based giving in flashlight units ($5.17). Flash Forward honors destination preferences when it can.`,
    canonical: `/impact-stories/${slug}/`,
    active: 'stories',
    main: pagehead('Impact Stories', title, `${type} · ${region}`)
      + `<section class="ff-section"><div class="ff-wrap">
<img class="ff-fullbleed" src="${img}" alt="${imgAlt}" width="1200" height="675">
<div class="ff-prose" style="margin-top:32px">
<p class="ff-kicker">${type}</p>
<p>${who}</p>
<p>${why}</p>
${voice ? `<blockquote class="ff-quote">${voice}</blockquote>` : ''}
<p><strong>What $ buys:</strong> Speak in flashlight units at <strong>$5.17</strong> parts. ${unitsNote} Gifts are a <em>preference / best-effort match</em> — not a binding person-level cash designation. Shipping is case-by-case.</p>
<p>We share program updates through partners and our <a href="/news/">News</a> notes when media and consent allow.</p>
<div class="ff-btnrow">
<a class="ff-btn ff-btn--primary" href="/donate/?destination=${dest}">Give to this story (preference)</a>
<a class="ff-btn ff-btn--ghost" href="/donate/">Give to greatest need</a>
</div>
</div>
</div></section>`,
  }));
}

out('/impact-stories/', page({
  title: 'Impact Stories | Flash Forward Foundation',
  description: 'Browse Flash Forward Impact Stories by school, community, and region. Preference-based giving in $5.17 flashlight units.',
  canonical: '/impact-stories/',
  active: 'stories',
  main: pagehead('Impact Stories', 'Give with a face and a place.', 'Choose a school, community, or region as a preference. We match best-effort through partners — never binding person-level cash claims.')
    + `<section class="ff-section"><div class="ff-wrap">
<div class="ff-filters" role="group" aria-label="Filter stories" data-story-filters>
<button type="button" class="ff-filter is-active" data-filter="all">All</button>
<button type="button" class="ff-filter" data-filter="school">School</button>
<button type="button" class="ff-filter" data-filter="community">Community</button>
<button type="button" class="ff-filter" data-filter="region">Region</button>
</div>
<div class="ff-storyrow" id="ff-storygrid">
<a class="ff-storyrow__item" href="/impact-stories/malaika/" data-type="school" data-region="drc">
<div class="ff-storyrow__media"><img src="/images/partners/malaika/students-3.webp" alt="" width="400" height="300"></div>
<div><p class="ff-storyrow__type">School · DR Congo</p><p class="ff-storyrow__title">Malaika, Kalebuka</p><p class="ff-storyrow__need">15 lights placed with a partner school community.</p></div>
<span class="ff-storyrow__ask">From $5.17</span>
</a>
<a class="ff-storyrow__item" href="/impact-stories/brighten-haiti/" data-type="community" data-region="haiti">
<div class="ff-storyrow__media"><img src="/images/partners/brighten-haiti/photo-1.webp" alt="" width="400" height="300"></div>
<div><p class="ff-storyrow__type">Community · Haiti</p><p class="ff-storyrow__title">Brighten Haiti</p><p class="ff-storyrow__need">42 lights with a distribution partner in Haiti.</p></div>
<span class="ff-storyrow__ask">From $5.17</span>
</a>
<a class="ff-storyrow__item" href="/impact-stories/loksadhana/" data-type="community" data-region="india">
<div class="ff-storyrow__media"><img src="/images/partners/loksadhana/class-1.webp" alt="" width="400" height="300"></div>
<div><p class="ff-storyrow__type">Community · India</p><p class="ff-storyrow__title">Loksadhana, Maharashtra</p><p class="ff-storyrow__need">15 lights across villages served by Loksadhana.</p></div>
<span class="ff-storyrow__ask">From $5.17</span>
</a>
</div>
<p style="margin-top:28px"><a class="ff-btn ff-btn--ghost" href="/donate/">Donate to greatest need</a></p>
</div></section>`,
}));

storyPage({
  slug: 'malaika', title: 'Malaika, Kalebuka', type: 'School', region: 'DR Congo', dest: 'drc',
  img: '/images/partners/malaika/school-1.webp', imgAlt: 'Malaika school campus in Kalebuka',
  who: 'Malaika is a distribution partner serving students in and around Kalebuka, Democratic Republic of the Congo. Flash Forward delivered <strong>15 study lights</strong> free of charge; Malaika chooses which students receive each light.',
  why: 'Why now: evening study without grid power remains a daily constraint. More flashlight units expand what partners can place — preference matched best-effort through this story’s DR Congo fund.',
  voice: 'Partners know the households. Lights go where they can be used for homework after dark.',
  unitsNote: 'Fifteen lights are already with Malaika; additional gifts grow the next shipment cycle.',
});
storyPage({
  slug: 'brighten-haiti', title: 'Brighten Haiti', type: 'Community', region: 'Haiti', dest: 'haiti',
  img: '/images/partners/brighten-haiti/photo-2.webp', imgAlt: 'Brighten Haiti program context',
  who: 'Brighten Haiti is a distribution partner. Flash Forward has delivered <strong>42 study lights</strong> through this partnership — our largest single-country placement to date.',
  why: 'Why now: Haiti remains a priority region for Study Unlock Pathway deliveries. Preference-based gifts help fund the next units for this community pathway.',
  voice: null,
  unitsNote: 'Forty-two lights shipped is the baseline; new gifts support continued partner deliveries.',
});
storyPage({
  slug: 'loksadhana', title: 'Loksadhana, Maharashtra', type: 'Community', region: 'India', dest: 'india',
  img: '/images/partners/loksadhana/class-6.webp', imgAlt: 'Students in a Loksadhana program setting',
  who: 'Loksadhana serves villages across rural Maharashtra. Flash Forward delivered <strong>15 study lights</strong>; the partner decides which students receive them.',
  why: 'Why now: rural Maharashtra placements continue through this distribution partnership. Preference gifts speak in flashlight units toward India-directed funds.',
  voice: null,
  unitsNote: 'Fifteen lights are in the field; additional units follow the same partner pathway.',
});

// ——— JOIN ———
out('/join/', page({
  title: 'Join | Flash Forward Foundation',
  description: 'Work with Flash Forward: unpaid internships in Marketing, P&O, and Fundraising, plus open COO, CPO, CFO and Director seats. Apply in one funnel.',
  canonical: '/join/',
  active: 'join',
  main: pagehead('Join', 'Work with us.', 'Unpaid internships and open leadership seats. Students run the org. Apply is hero-class — one form, track picker included.',
    `<div class="ff-btnrow"><a class="ff-btn ff-btn--inverse" href="/join/apply/">Apply</a><a class="ff-btn ff-btn--ghost-inv" href="/join/internships/">Internships</a></div>`)
    + `<section class="ff-section"><div class="ff-wrap">
<p class="ff-kicker">Internships</p>
<h2 class="ff-h2">Three tracks. Real pipelines.</h2>
<div class="ff-paths">
<a class="ff-path" href="/internships/marketing/"><p class="ff-path__title">Marketing</p><p class="ff-path__text">Campaigns, writing, design, video. Course available.</p></a>
<a class="ff-path" href="/internships/partnerships-operations/"><p class="ff-path__title">Partnerships &amp; Ops</p><p class="ff-path__text">Assembly and distribution partner pipelines.</p></a>
<a class="ff-path" href="/internships/fundraising/"><p class="ff-path__title">Fundraising &amp; Growth</p><p class="ff-path__text">Grants, sponsors, Study Circle stewardship.</p></a>
</div>
<p style="margin-top:16px;color:var(--ff-muted);font-size:var(--ff-text-small)">Engineering internship is not listed on the public site for v1.</p>
</div></section>
<section class="ff-section ff-section--tint"><div class="ff-wrap">
<p class="ff-kicker">Open roles</p>
<h2 class="ff-h2">Open leadership seats</h2>
<p class="ff-lede">Board today: Sree, Romir, Andy. Entire org unpaid. Apply via the shared funnel.</p>
<div class="ff-rolerow"><div class="ff-rolerow__photo ff-rolerow__photo--ph" aria-hidden="true">COO</div><div><p class="ff-rolerow__name">Chief Operating Officer</p><p class="ff-rolerow__role">Open · unpaid</p></div><div class="ff-rolerow__cta"><a class="ff-btn ff-btn--ghost" href="/join/apply/?track=opening">Apply</a></div></div>
<div class="ff-rolerow"><div class="ff-rolerow__photo ff-rolerow__photo--ph" aria-hidden="true">CPO</div><div><p class="ff-rolerow__name">Chief Partnerships Officer</p><p class="ff-rolerow__role">Open · unpaid</p></div><div class="ff-rolerow__cta"><a class="ff-btn ff-btn--ghost" href="/join/apply/?track=opening">Apply</a></div></div>
<div class="ff-rolerow"><div class="ff-rolerow__photo ff-rolerow__photo--ph" aria-hidden="true">CFO</div><div><p class="ff-rolerow__name">Chief Financial Officer</p><p class="ff-rolerow__role">Open · unpaid</p></div><div class="ff-rolerow__cta"><a class="ff-btn ff-btn--ghost" href="/join/apply/?track=opening">Apply</a></div></div>
<div class="ff-rolerow"><div class="ff-rolerow__photo ff-rolerow__photo--ph" aria-hidden="true">Dir</div><div><p class="ff-rolerow__name">Director of Partnerships</p><p class="ff-rolerow__role">Open · unpaid</p></div><div class="ff-rolerow__cta"><a class="ff-btn ff-btn--ghost" href="/join/apply/?track=opening">Apply</a></div></div>
<div class="ff-rolerow"><div class="ff-rolerow__photo ff-rolerow__photo--ph" aria-hidden="true">Dir</div><div><p class="ff-rolerow__name">Director of Marketing</p><p class="ff-rolerow__role">Open · unpaid</p></div><div class="ff-rolerow__cta"><a class="ff-btn ff-btn--ghost" href="/join/apply/?track=opening">Apply</a></div></div>
<div class="ff-rolerow"><div class="ff-rolerow__photo ff-rolerow__photo--ph" aria-hidden="true">Dir</div><div><p class="ff-rolerow__name">Director of Fundraising</p><p class="ff-rolerow__role">Open · unpaid</p></div><div class="ff-rolerow__cta"><a class="ff-btn ff-btn--ghost" href="/join/apply/?track=opening">Apply</a></div></div>
<p style="margin-top:24px"><a class="ff-link-more" href="/join/open-roles/">All open roles →</a></p>
</div></section>`,
}));

out('/join/internships/', page({
  title: 'Internships | Flash Forward Foundation',
  description: 'Unpaid remote internships: Marketing, Partnerships & Operations, Fundraising. Application, screen, interview, projects.',
  canonical: '/join/internships/',
  active: 'join',
  main: pagehead('Join', 'Internships', 'Application → screen → interview → accept → course (where it exists) → projects. Marketing course is live; Fundraising and Partnerships courses are still in progress.')
    + `<section class="ff-section"><div class="ff-wrap">
<div class="ff-paths">
<a class="ff-path" href="/internships/marketing/"><p class="ff-path__title">Marketing &amp; Communications</p><p class="ff-path__text">Social, writing, design, video.</p></a>
<a class="ff-path" href="/internships/partnerships-operations/"><p class="ff-path__title">Partnerships &amp; Operations</p><p class="ff-path__text">Partner orgs and delivery ops.</p></a>
<a class="ff-path" href="/internships/fundraising/"><p class="ff-path__title">Fundraising &amp; Growth</p><p class="ff-path__text">Grants, sponsors, monthly giving.</p></a>
</div>
<div class="ff-btnrow"><a class="ff-btn ff-btn--primary" href="/join/apply/">Apply to intern</a></div>
</div></section>`,
}));

out('/join/open-roles/', page({
  title: 'Open Roles | Flash Forward Foundation',
  description: 'Open unpaid leadership seats: COO, CPO, CFO, and Directors of Partnerships, Marketing, and Fundraising.',
  canonical: '/join/open-roles/',
  active: 'join',
  main: pagehead('Join', 'Open roles', 'Photo placeholders are intentional. Board: Sree, Romir, Andy. Apply through the shared Join funnel.')
    + `<section class="ff-section"><div class="ff-wrap">
<div class="ff-rolerow"><div class="ff-rolerow__photo ff-rolerow__photo--ph">COO</div><div><p class="ff-rolerow__name">Chief Operating Officer</p><p class="ff-rolerow__role">Open · unpaid · operations leadership</p></div><div class="ff-rolerow__cta"><a class="ff-btn ff-btn--primary" href="/join/apply/?track=opening">Apply</a></div></div>
<div class="ff-rolerow"><div class="ff-rolerow__photo ff-rolerow__photo--ph">CPO</div><div><p class="ff-rolerow__name">Chief Partnerships Officer</p><p class="ff-rolerow__role">Open · unpaid · assembly &amp; distribution</p></div><div class="ff-rolerow__cta"><a class="ff-btn ff-btn--primary" href="/join/apply/?track=opening">Apply</a></div></div>
<div class="ff-rolerow"><div class="ff-rolerow__photo ff-rolerow__photo--ph">CFO</div><div><p class="ff-rolerow__name">Chief Financial Officer</p><p class="ff-rolerow__role">Open · unpaid · finance &amp; compliance</p></div><div class="ff-rolerow__cta"><a class="ff-btn ff-btn--primary" href="/join/apply/?track=opening">Apply</a></div></div>
<div class="ff-rolerow"><div class="ff-rolerow__photo ff-rolerow__photo--ph">Dir</div><div><p class="ff-rolerow__name">Director of Partnerships</p><p class="ff-rolerow__role">Open · unpaid</p></div><div class="ff-rolerow__cta"><a class="ff-btn ff-btn--ghost" href="/join/apply/?track=opening">Apply</a></div></div>
<div class="ff-rolerow"><div class="ff-rolerow__photo ff-rolerow__photo--ph">Dir</div><div><p class="ff-rolerow__name">Director of Marketing</p><p class="ff-rolerow__role">Open · unpaid</p></div><div class="ff-rolerow__cta"><a class="ff-btn ff-btn--ghost" href="/join/apply/?track=opening">Apply</a></div></div>
<div class="ff-rolerow"><div class="ff-rolerow__photo ff-rolerow__photo--ph">Dir</div><div><p class="ff-rolerow__name">Director of Fundraising</p><p class="ff-rolerow__role">Open · unpaid</p></div><div class="ff-rolerow__cta"><a class="ff-btn ff-btn--ghost" href="/join/apply/?track=opening">Apply</a></div></div>
</div></section>`,
}));

out('/join/apply/', page({
  title: 'Apply | Flash Forward Foundation',
  description: 'Apply to Flash Forward: internship, ambassador, or open leadership role. One form with track picker. Entire org unpaid.',
  canonical: '/join/apply/',
  active: 'join',
  bodyClass: 'ff-page-apply',
  main: pagehead('Join', 'Apply', 'Pick Internship, Ambassador, or an open role. If offered both internship and ambassador, you choose one.')
    + APPLY_FORM,
}));

// ——— GET INVOLVED ———
out('/get-involved/', page({
  title: 'Get Involved | Flash Forward Foundation',
  description: 'Donate, join Study Circle, sponsor an Impact Story, join the team, or partner to assemble or distribute study lights. No general volunteer program.',
  canonical: '/get-involved/',
  active: 'involved',
  main: pagehead('Get Involved', 'What kind of help are you?', 'Money · campus voice · partnership. There is no general volunteer program — we route you to a named path.')
    + `<section class="ff-section"><div class="ff-wrap">
<div class="ff-paths">
<a class="ff-path" href="/donate/"><p class="ff-path__title">Donate once</p><p class="ff-path__text">Flashlight units at $5.17 parts.</p></a>
<a class="ff-path" href="/donate/#study-circle"><p class="ff-path__title">Study Circle</p><p class="ff-path__text">Monthly giving community.</p></a>
<a class="ff-path" href="/impact-stories/"><p class="ff-path__title">Impact Stories</p><p class="ff-path__text">Preference-based story giving.</p></a>
<a class="ff-path" href="/join/"><p class="ff-path__title">Join the team</p><p class="ff-path__text">Internships and open roles.</p></a>
<a class="ff-path" href="/get-involved/partners/assembly/"><p class="ff-path__title">Assemble lights</p><p class="ff-path__text">Makerspaces and robotics teams.</p></a>
<a class="ff-path" href="/get-involved/partners/distribution/"><p class="ff-path__title">Distribute lights</p><p class="ff-path__text">Orgs with student access.</p></a>
<a class="ff-path" href="/get-involved/ambassadors/"><p class="ff-path__title">Ambassadors</p><p class="ff-path__text">Soft apply — awareness and connections.</p></a>
</div>
</div></section>`,
}));

out('/get-involved/ambassadors/', page({
  title: 'Ambassadors | Flash Forward Foundation',
  description: 'Flash Forward Ambassadors grow awareness, connections, content, and peer fundraising — unpaid, exclusive of internship if both are offered.',
  canonical: '/get-involved/ambassadors/',
  active: 'involved',
  main: pagehead('Get Involved', 'Ambassadors', 'An unpaid umbrella for people who want to grow Flash Forward without joining as interns or assembling lights. Soft launch: apply via Join with the Ambassador track.')
    + `<section class="ff-section"><div class="ff-wrap ff-prose">
<p>Tracks under one umbrella: Awareness · Connections · Content/UGC · Peer Fundraising. Anyone worldwide is eligible; soft preference for US-overlapping timezones for live meetings only.</p>
<p>Ambassadors may apply to both internship and ambassador tracks but must choose one role if accepted to both. Chapters are not Ambassadors (later backlog).</p>
<div class="ff-btnrow"><a class="ff-btn ff-btn--primary" href="/join/apply/?track=ambassador">Apply as Ambassador</a></div>
</div></section>`,
}));

out('/get-involved/partners/', page({
  title: 'Partner With Us | Flash Forward Foundation',
  description: 'Become a Flash Forward assembly partner or distribution partner for solar study lights.',
  canonical: '/get-involved/partners/',
  active: 'involved',
  main: pagehead('Get Involved', 'Partner with us', 'Org-to-org paths only: assemble lights, or distribute them to students.')
    + `<section class="ff-section"><div class="ff-wrap">
<div class="ff-paths" style="grid-template-columns:1fr 1fr">
<a class="ff-path" href="/get-involved/partners/assembly/"><p class="ff-path__title">Assembly partners</p><p class="ff-path__text">Build lights with printer + soldering capability.</p></a>
<a class="ff-path" href="/get-involved/partners/distribution/"><p class="ff-path__title">Distribution partners</p><p class="ff-path__text">Place lights with learners you already reach.</p></a>
</div>
</div></section>`,
}));

out('/get-involved/partners/assembly/', page({
  title: 'Assembly Partners | Flash Forward Foundation',
  description: 'Apply to assemble Flash Forward study lights. Soft bar: 3D printer, soldering kit, engineering experience. We screen after apply.',
  canonical: '/get-involved/partners/assembly/',
  active: 'involved',
  main: pagehead('Partners', 'Assembly partners', 'You print housings and assemble. We ship key electrical parts and buy the carrier label.')
    + `<section class="ff-section"><div class="ff-wrap ff-prose">
<p>Soft public bar: access to a 3D printer, soldering kit, and teammates with engineering experience (robotics club, makerspace, builder team). We screen after you apply.</p>
<p>Flow: apply → screen → parts shipment → assemble → report dims/weight → shipping label → drop at carrier.</p>
<div class="ff-btnrow"><a class="ff-btn ff-btn--primary" href="/contact/?topic=assembly">Apply to assemble</a></div>
</div></section>`,
}));

out('/get-involved/partners/distribution/', page({
  title: 'Distribution Partners | Flash Forward Foundation',
  description: 'Request Flash Forward study lights for students you serve. Light public bar; requirements deepen after the relationship starts.',
  canonical: '/get-involved/partners/distribution/',
  active: 'involved',
  main: pagehead('Partners', 'Distribution partners', 'Local orgs with student access. Light public requirements; surveys and media deepen after we start working together.')
    + `<section class="ff-section"><div class="ff-wrap ff-prose">
<p>Current seed partners include Brighten Haiti, Loksadhana (India), and Malaika (DR Congo) — now also framed as <a href="/impact-stories/">Impact Stories</a>.</p>
<p>Tell us who you serve, how you would place lights, and whether shipping would be domestic handoff or needs sponsorship.</p>
<div class="ff-btnrow"><a class="ff-btn ff-btn--primary" href="/contact/?topic=distribution">Request lights / apply</a></div>
</div></section>`,
}));

// ——— DONATE ———
out('/donate/', page({
  title: 'Donate | Study Circle | Flash Forward Foundation',
  description: 'Give one-time or join Study Circle monthly. $5.17 covers parts for one study light. Preference for Haiti, India, DR Congo, or greatest need. EIN 39-3605570.',
  canonical: '/donate/',
  active: 'involved',
  bodyClass: 'ff-page-donate-index',
  extraHead: `<script async src="https://widgets.givebutter.com/latest.umd.cjs?acct=IbzUMhov4mt0oUn2&p=other"></script>`,
  main: pagehead('Donate', 'Unlock study hours.', 'About $5.17 covers the core parts for one study light (one flashlight unit). Choose One-time or Study Circle monthly, then a destination preference. Shipping is case-by-case.')
    + `<section class="ff-section" id="study-circle"><div class="ff-wrap ff-donate-shell">
<div>
<p class="ff-kicker">How you give</p>
<h2 class="ff-h2">One-time or Study Circle</h2>
<p class="ff-lede">Study Circle is our monthly giving community — monthly gifts counted in flashlight units at $5.17 parts.</p>
<div class="ff-freq" data-donate-freq role="group" aria-label="Gift frequency">
<button type="button" class="is-active" data-freq="once">One-time</button>
<button type="button" data-freq="monthly">Study Circle</button>
</div>
<div class="ff-amounts" data-donate-amounts aria-label="Amount in flashlight units">
<button type="button" class="is-active" data-qty="1">1 · $5.17</button>
<button type="button" data-qty="3">3 · $15.51</button>
<button type="button" data-qty="5">5 · $25.85</button>
<button type="button" data-qty="10">10 · $51.70</button>
<button type="button" data-qty="20">20 · $103.40</button>
</div>
<p class="ff-kicker">Destination preference</p>
<div class="ff-destcards">
<button type="button" class="ff-destcard is-selected" data-destination-card="greatest-need"><strong>Greatest need</strong><small>Flash Forward chooses</small></button>
<button type="button" class="ff-destcard" data-destination-card="haiti"><strong>Haiti</strong><small>Brighten Haiti · 42 lights</small></button>
<button type="button" class="ff-destcard" data-destination-card="india"><strong>India</strong><small>Loksadhana · 15 lights</small></button>
<button type="button" class="ff-destcard" data-destination-card="drc"><strong>DR Congo</strong><small>Malaika · 15 lights</small></button>
</div>
<p style="color:var(--ff-muted);font-size:var(--ff-text-small)">Preferences are best-effort matches through partner funds — not binding designations. Prefer a named story? Browse <a href="/impact-stories/">Impact Stories</a>.</p>
<div class="ff-faq" style="margin-top:32px">
<h3>What does $5.17 cover?</h3>
<p>Core parts for one study light. Shipping is separate and case-by-case (sometimes partner-sponsored).</p>
</div>
<div class="ff-faq">
<h3>Is Study Circle monthly?</h3>
<p>Yes. Select Study Circle above; the embed follows with recurring frequency.</p>
</div>
<div class="ff-faq">
<h3>Tax-deductible?</h3>
<p>To the extent allowed by law. Flash Forward Foundation is a 501(c)(3), EIN 39-3605570.</p>
</div>
</div>
<aside class="ff-embed-panel" id="give" aria-label="Complete your gift">
<p class="ff-embed-panel__label"><span data-freq-label>One-time</span> · <strong id="dest-pref-note">Greatest need</strong> · <span id="gift-total">$5.17</span></p>
<div id="givebutter-embed">
<givebutter-widget id="L0ywAo" align="center" frequency="once" amount="5.17" fund="73949"></givebutter-widget>
<noscript><p><a href="https://givebutter.com/fund-solar-light-for-off-grid-students-bkscsc">Give securely on Givebutter</a></p></noscript>
</div>
</aside>
</div></section>`,
}));

// ——— ABOUT ———
out('/about/', page({
  title: 'Our Story | Flash Forward Foundation',
  description: 'Flash Forward Foundation is a student-led 501(c)(3) designing solar study lights with assembly and distribution partners. For students, by students.',
  canonical: '/about/',
  active: 'about',
  main: pagehead('About', 'Our story', 'Founded by students in Bellevue, Washington. We design light for learning — and build an unpaid student organization that runs the work.')
    + `<section class="ff-section"><div class="ff-wrap ff-prose">
<p>Flash Forward started with a simple observation: when night falls without electricity, studying often stops. We design a low-cost solar study light and work the <a href="/our-model/study-unlock-pathway/">Study Unlock Pathway</a> so partners can place it.</p>
<p>We do <strong>not</strong> claim that Bellevue interns solder every light. Assembly partners build. Distribution partners deliver. Interns run ops. The entire org is unpaid.</p>
<div class="ff-btnrow"><a class="ff-btn ff-btn--primary" href="/join/">Join</a><a class="ff-btn ff-btn--ghost" href="/donate/">Donate</a></div>
</div></section>`,
}));

out('/about/team/', page({
  title: 'Leadership | Flash Forward Foundation',
  description: 'Flash Forward board: Sree, Romir, and Andy. Open seats for COO, CPO, CFO and Directors. Entire organization unpaid.',
  canonical: '/about/team/',
  active: 'about',
  main: pagehead('About', 'Leadership', 'Board of three. Open C-suite and director seats listed on Join. Photo placeholders mark seats we are filling.')
    + `<section class="ff-section"><div class="ff-wrap">
<p class="ff-kicker">Board</p>
<div class="ff-rolerow" id="sree"><div class="ff-rolerow__photo"><img src="/images/team/sree-v2.webp" alt="Sree Kokkonda" width="176" height="176"></div><div><p class="ff-rolerow__name">Sree Kokkonda</p><p class="ff-rolerow__role">Board · founder leadership</p></div></div>
<div class="ff-rolerow" id="romir"><div class="ff-rolerow__photo"><img src="/images/team/romirchekuri.webp" alt="Romir" width="176" height="176"></div><div><p class="ff-rolerow__name">Romir</p><p class="ff-rolerow__role">Board</p></div></div>
<div class="ff-rolerow" id="andy"><div class="ff-rolerow__photo"><img src="/images/team/andy-v2.webp" alt="Andy" width="176" height="176"></div><div><p class="ff-rolerow__name">Andy</p><p class="ff-rolerow__role">Board · Treasurer</p></div></div>
<p class="ff-kicker" style="margin-top:48px">Open seats</p>
<p class="ff-lede">COO · CPO · CFO · Directors of Partnerships, Marketing, and Fundraising — all unpaid. <a href="/join/open-roles/">See open roles</a> or <a href="/join/apply/">apply</a>.</p>
</div></section>`,
}));

out('/nonprofit-status/', page({
  title: 'Nonprofit Status & EIN 39-3605570 | Flash Forward',
  description: 'Flash Forward Foundation is a 501(c)(3) public charity, EIN 39-3605570. Download the IRS determination letter.',
  canonical: '/nonprofit-status/',
  active: 'about',
  main: pagehead('About', 'Nonprofit status', '501(c)(3) public charity. EIN 39-3605570. Gifts are tax-deductible to the extent allowed by law.')
    + `<section class="ff-section"><div class="ff-wrap ff-prose">
<p>Flash Forward Foundation received IRS recognition as a public charity. For donor files and partner diligence, see the determination letter linked from this page on the live site archives, or email <a href="mailto:about@flashforwardfoundation.org">about@flashforwardfoundation.org</a>.</p>
<div class="ff-btnrow"><a class="ff-btn ff-btn--primary" href="/donate/">Donate</a><a class="ff-btn ff-btn--ghost" href="/impact/reports/">Reports</a></div>
</div></section>`,
}));

out('/faq/', page({
  title: 'FAQs | Flash Forward Foundation',
  description: 'Answers about study lights, Study Circle monthly giving, internships, partners, and Impact Stories. No general volunteer program.',
  canonical: '/faq/',
  active: 'about',
  main: pagehead('About', 'Frequently asked questions', '')
    + `<section class="ff-section"><div class="ff-wrap">
<div class="ff-faqgrid">
<div class="ff-faq"><h3>Who builds the lights?</h3><p>Assembly partners — robotics clubs and makerspaces. Interns run pipelines; they do not solder every light.</p></div>
<div class="ff-faq"><h3>What is Study Circle?</h3><p>Our monthly giving program. Choose Study Circle on the <a href="/donate/">Donate</a> page before amount and destination.</p></div>
<div class="ff-faq"><h3>What does $5.17 buy?</h3><p>Core parts for one study light (a flashlight unit). Shipping is case-by-case.</p></div>
<div class="ff-faq"><h3>Can I pick a country or story?</h3><p>Yes as a preference. We best-effort match through funds and partners — not binding person-level cash.</p></div>
<div class="ff-faq"><h3>Do you have general volunteering?</h3><p>No. Choose Donate, Join, Ambassadors, Assemble, or Distribute.</p></div>
<div class="ff-faq"><h3>Is the internship paid?</h3><p>No. The entire organization is unpaid, including open C-suite seats.</p></div>
<div class="ff-faq"><h3>Is there an engineering internship?</h3><p>Not listed on the public site for v1.</p></div>
<div class="ff-faq"><h3>How do you measure impact?</h3><p>We publish ~5,000 modeled study hours / year from 72 lights, with a method note on <a href="/impact/outcomes/">Outcomes</a>.</p></div>
</div>
</div></section>`,
}));

out('/contact/', page({
  title: 'Contact | Flash Forward Foundation',
  description: 'Contact Flash Forward Foundation about donations, partnerships, internships, or press. about@flashforwardfoundation.org',
  canonical: '/contact/',
  active: 'about',
  main: pagehead('About', 'Contact', 'Topic-routed inbound. Include assembly or distribution in your note if that is why you are writing.')
    + `<section class="ff-section"><div class="ff-wrap">
<div id="ff-sent" class="ff-section--tint" style="padding:16px 20px;border-radius:4px;margin-bottom:24px" hidden><p style="margin:0"><strong>Message sent.</strong> We will reply by email.</p></div>
<form class="ff-form" action="https://formsubmit.co/about@flashforwardfoundation.org" method="POST">
<input type="hidden" name="_next" value="https://flashforwardfoundation.org/contact/?sent=1">
<input type="hidden" name="_subject" value="Flash Forward contact">
<input type="text" name="_honey" style="display:none">
<div class="ff-field"><label class="ff-field__label" for="c-name">Name</label><input id="c-name" name="name" required></div>
<div class="ff-field"><label class="ff-field__label" for="c-email">Email</label><input id="c-email" name="email" type="email" required></div>
<div class="ff-field"><label class="ff-field__label" for="c-topic">Topic</label>
<select id="c-topic" name="topic"><option>General</option><option value="assembly">Assembly partner</option><option value="distribution">Distribution partner</option><option>Donate / Study Circle</option><option>Join / Apply</option><option>Press</option></select>
</div>
<div class="ff-field"><label class="ff-field__label" for="c-msg">Message</label><textarea id="c-msg" name="message" rows="5" required></textarea></div>
<button class="ff-btn ff-btn--primary" type="submit">Send message</button>
</form>
<p style="margin-top:24px;color:var(--ff-muted)">Or email <a href="mailto:about@flashforwardfoundation.org">about@flashforwardfoundation.org</a></p>
</div></section>`,
}));

// Soft redirects / rewrites for old internships hub
out('/get-involved/internship/', page({
  title: 'Internships | Flash Forward Foundation',
  description: 'Flash Forward internships have moved under Join.',
  canonical: '/join/internships/',
  active: 'join',
  main: pagehead('Join', 'Internships moved', 'Internship pages now live under Join.')
    + `<section class="ff-section"><div class="ff-wrap"><div class="ff-btnrow"><a class="ff-btn ff-btn--primary" href="/join/internships/">Go to Join · Internships</a><a class="ff-btn ff-btn--ghost" href="/join/apply/">Apply</a></div></div></section>`,
}));

console.log('v1 pages written');
