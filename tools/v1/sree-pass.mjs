#!/usr/bin/env node
/** Sree feedback pass: deepen Join/partners/about/legal; internship form-only Apply. */
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { mkdirSync, writeFileSync } from 'node:fs';
import { page, pagehead } from './chrome.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '../..');
const INTERN_FORM = 'https://forms.gle/96igrZwQ1vSDtjiF8';
const CONTACT_FORM = 'https://formsubmit.co/about@flashforwardfoundation.org';

const out = (rel, html) => {
  const file = join(ROOT, rel.replace(/^\//, ''), 'index.html');
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, html);
  console.log('sree', rel);
};

const faq = (q, a) => `<div class="ff-faq"><h3>${q}</h3><p>${a}</p></div>`;

// ——— Internship Apply (form only) ———
out('/join/apply/', page({
  title: 'Apply for an Internship | Flash Forward Foundation',
  description: 'Apply to a Flash Forward unpaid internship: Marketing & Communications, Partnerships & Operations, or Fundraising & Growth. One Google Form for all tracks.',
  canonical: '/join/apply/',
  active: 'join',
  bodyClass: 'ff-page-apply',
  main: pagehead('Join', 'Apply for an internship', 'One Google Form covers all three tracks. Choose your preferred track inside the form. Ambassadors and open leadership roles use separate paths — not this form.')
    + `<section class="ff-section"><div class="ff-wrap ff-lgrid">
<div>
<p class="ff-kicker">Internship application</p>
<h2 class="ff-h2">Tell us which track fits.</h2>
<p class="ff-lede">Unpaid. Remote-friendly. High school, college, and early career. The whole organization is unpaid — including leadership.</p>
<ul class="ff-prose">
<li><a href="/internships/marketing/">Marketing &amp; Communications</a> — campaigns, writing, design, video. Course available.</li>
<li><a href="/internships/partnerships-operations/">Partnerships &amp; Operations</a> — assembly and distribution partner pipelines.</li>
<li><a href="/internships/fundraising/">Fundraising &amp; Growth</a> — grants, sponsors, Study Circle. Course in progress.</li>
</ul>
<p style="color:var(--ff-muted);font-size:var(--ff-text-small)">Looking for a leadership seat? Start at <a href="/join/open-roles/">Open roles</a>. Ambassadors: <a href="/get-involved/ambassadors/">Ambassadors</a>.</p>
</div>
<div>
<div class="ff-placeholder" style="border-style:solid;border-color:var(--ff-green-700);background:var(--ff-green-50)">
<h3>Ready to apply</h3>
<p>Opens the Flash Forward internship Google Form in a new tab.</p>
<div class="ff-btnrow" style="margin-top:8px">
<a class="ff-btn ff-btn--primary" href="${INTERN_FORM}" target="_blank" rel="noopener">Open internship form</a>
</div>
</div>
</div>
</div></section>`,
}));

out('/join/', page({
  title: 'Join | Flash Forward Foundation',
  description: 'Unpaid internships in Marketing, Partnerships & Operations, and Fundraising & Growth, plus open leadership seats. Apply for internships via one Google Form.',
  canonical: '/join/',
  active: 'join',
  main: pagehead('Join', 'Work with us.', 'Unpaid internships and open leadership seats. Students run the org. Internship Apply goes to one Google Form — not ambassadors or open roles.',
    `<div class="ff-btnrow"><a class="ff-btn ff-btn--inverse" href="/join/apply/">Apply to intern</a><a class="ff-btn ff-btn--ghost-inv" href="/join/internships/">Internships</a></div>`)
    + `<section class="ff-section"><div class="ff-wrap">
<p class="ff-kicker">Internships</p>
<h2 class="ff-h2">Three tracks. Real pipelines.</h2>
<div class="ff-paths">
<a class="ff-path" href="/internships/marketing/"><p class="ff-path__title">Marketing &amp; Communications</p><p class="ff-path__text">Campaigns, writing, design, video. Course available.</p></a>
<a class="ff-path" href="/internships/partnerships-operations/"><p class="ff-path__title">Partnerships &amp; Operations</p><p class="ff-path__text">Assembly and distribution partner pipelines.</p></a>
<a class="ff-path" href="/internships/fundraising/"><p class="ff-path__title">Fundraising &amp; Growth</p><p class="ff-path__text">Grants, sponsors, Study Circle stewardship.</p></a>
</div>
<div class="ff-btnrow"><a class="ff-btn ff-btn--primary" href="/join/apply/">Apply to intern</a></div>
</div></section>
<section class="ff-section ff-section--tint"><div class="ff-wrap">
<p class="ff-kicker">Open roles</p>
<h2 class="ff-h2">Open leadership seats</h2>
<p class="ff-lede">Board today: Sree, Romir, Andy. Entire org unpaid. Read each role first — then Apply when the leadership form is live.</p>
<div class="ff-rolerow"><div class="ff-rolerow__photo ff-rolerow__photo--ph" aria-hidden="true">COO</div><div><p class="ff-rolerow__name">Chief Operating Officer</p><p class="ff-rolerow__role">Open · unpaid</p></div><div class="ff-rolerow__cta"><a class="ff-btn ff-btn--ghost" href="/join/open-roles/coo/">See more</a></div></div>
<div class="ff-rolerow"><div class="ff-rolerow__photo ff-rolerow__photo--ph" aria-hidden="true">CPO</div><div><p class="ff-rolerow__name">Chief Partnerships Officer</p><p class="ff-rolerow__role">Open · unpaid</p></div><div class="ff-rolerow__cta"><a class="ff-btn ff-btn--ghost" href="/join/open-roles/cpo/">See more</a></div></div>
<div class="ff-rolerow"><div class="ff-rolerow__photo ff-rolerow__photo--ph" aria-hidden="true">CFO</div><div><p class="ff-rolerow__name">Chief Financial Officer</p><p class="ff-rolerow__role">Open · unpaid</p></div><div class="ff-rolerow__cta"><a class="ff-btn ff-btn--ghost" href="/join/open-roles/cfo/">See more</a></div></div>
<div class="ff-rolerow"><div class="ff-rolerow__photo ff-rolerow__photo--ph" aria-hidden="true">Dir</div><div><p class="ff-rolerow__name">Director of Partnerships</p><p class="ff-rolerow__role">Open · unpaid</p></div><div class="ff-rolerow__cta"><a class="ff-btn ff-btn--ghost" href="/join/open-roles/director-partnerships/">See more</a></div></div>
<div class="ff-rolerow"><div class="ff-rolerow__photo ff-rolerow__photo--ph" aria-hidden="true">Dir</div><div><p class="ff-rolerow__name">Director of Marketing</p><p class="ff-rolerow__role">Open · unpaid</p></div><div class="ff-rolerow__cta"><a class="ff-btn ff-btn--ghost" href="/join/open-roles/director-marketing/">See more</a></div></div>
<div class="ff-rolerow"><div class="ff-rolerow__photo ff-rolerow__photo--ph" aria-hidden="true">Dir</div><div><p class="ff-rolerow__name">Director of Fundraising</p><p class="ff-rolerow__role">Open · unpaid</p></div><div class="ff-rolerow__cta"><a class="ff-btn ff-btn--ghost" href="/join/open-roles/director-fundraising/">See more</a></div></div>
<p style="margin-top:24px"><a class="ff-link-more" href="/join/open-roles/">All open roles →</a></p>
</div></section>`,
}));

out('/join/internships/', page({
  title: 'Internships | Flash Forward Foundation',
  description: 'Unpaid remote internships: Marketing & Communications, Partnerships & Operations, Fundraising & Growth.',
  canonical: '/join/internships/',
  active: 'join',
  main: pagehead('Join', 'Internships', 'Application → screen → interview → accept → course (where it exists) → projects. Marketing course is live; Fundraising & Growth and Partnerships courses are still in progress.')
    + `<section class="ff-section"><div class="ff-wrap">
<div class="ff-paths">
<a class="ff-path" href="/internships/marketing/"><p class="ff-path__title">Marketing &amp; Communications</p><p class="ff-path__text">Social, writing, design, video. Course available.</p></a>
<a class="ff-path" href="/internships/partnerships-operations/"><p class="ff-path__title">Partnerships &amp; Operations</p><p class="ff-path__text">Partner orgs and delivery ops.</p></a>
<a class="ff-path" href="/internships/fundraising/"><p class="ff-path__title">Fundraising &amp; Growth</p><p class="ff-path__text">Grants, sponsors, monthly giving.</p></a>
</div>
<div class="ff-btnrow"><a class="ff-btn ff-btn--primary" href="/join/apply/">Apply to intern</a></div>
</div></section>`,
}));

// ——— Internship track pages ———
const tracks = [
  {
    slug: 'marketing',
    name: 'Marketing & Communications',
    lede: 'Shape how Flash Forward sounds in public — campaigns, writing, design, and short video that earn trust without hype.',
    do: [
      'Draft and schedule social posts, newsletter blurbs, and site copy that match our facts-only voice.',
      'Design simple graphics and slide decks for partner outreach and Study Circle updates.',
      'Cut short clips or photo stories from partner media (with consent) for Instagram and Impact Stories.',
      'Support campaign launches around Donate, Study Circle, and internship recruiting.',
    ],
    projects: [
      'A 4-week content calendar for one channel with draft captions and asset list.',
      'A one-pager or carousel explaining the Study Unlock Pathway in plain language.',
      'A before/after rewrite of a thin page into readable, honest copy.',
    ],
    course: 'Marketing course is <strong>available</strong> — interns go through it after accept before owning live channels.',
    who: 'Students who write or design clearly, care about nonprofit storytelling, and can take feedback. High school juniors through early career. No paid-ad budget required; we prioritize craft and honesty.',
  },
  {
    slug: 'partnerships-operations',
    name: 'Partnerships & Operations',
    lede: 'Keep assembly and distribution partnerships moving — outreach, screening notes, shipment logistics, and delivery follow-up.',
    do: [
      'Research and reach out to robotics clubs, makerspaces, and student orgs that could assemble lights.',
      'Track distribution partner conversations: who they serve, shipping constraints, media consent.',
      'Help prepare parts lists, shipping labels, and handoff checklists with leadership.',
      'Log partner status so the board sees a clean pipeline — not a Slack scramble.',
    ],
    projects: [
      'A scored shortlist of 10 potential assembly partners with contact notes.',
      'A distribution intake summary for one new org (students served, placement plan, shipping).',
      'An ops checklist for one lights shipment from assemble → carrier drop.',
    ],
    course: 'Partnerships &amp; Operations course is <strong>in progress</strong>. Until it ships, interns onboard with live docs and weekly check-ins.',
    who: 'Organizers who like email, spreadsheets, and follow-through. Comfortable talking to adults at clubs and NGOs. You do <em>not</em> need to solder — assembly partners build the lights.',
  },
  {
    slug: 'fundraising',
    name: 'Fundraising & Growth',
    lede: 'Grow honest revenue: Study Circle monthly giving, one-time gifts, sponsors, and early grant research — never invented impact claims.',
    do: [
      'Steward Study Circle messaging and thank-you notes that stay factual.',
      'Draft sponsor one-pagers and gift asks tied to flashlight units ($5.17 parts).',
      'Research small grants and student-led funder fits; summarize eligibility for the board.',
      'Help keep GiveButter fund preferences and Impact Story links clear for donors.',
    ],
    projects: [
      'A Study Circle welcome sequence outline (3 emails) with plain-language impact framing.',
      'A grant prospect sheet with 5 fits and why / why not.',
      'A sponsor brief for a local business (ask, recognition, what we will not claim).',
    ],
    course: 'Fundraising &amp; Growth course is <strong>in progress</strong>. Onboarding uses live fundraising docs until the course is ready.',
    who: 'Students who can write a clear ask, respect donor trust, and are fine with unpaid nonprofit fundraising work. Comfort with numbers helps; polish is optional.',
  },
];

for (const t of tracks) {
  out(`/internships/${t.slug}/`, page({
    title: `${t.name} Internship | Flash Forward`,
    description: `Unpaid ${t.name} internship at Flash Forward Foundation. Remote-friendly. Apply via the shared internship Google Form.`,
    canonical: `/internships/${t.slug}/`,
    active: 'join',
    main: pagehead('Join · Internships', t.name, t.lede,
      `<div class="ff-btnrow"><a class="ff-btn ff-btn--inverse" href="${INTERN_FORM}" target="_blank" rel="noopener">Apply</a><a class="ff-btn ff-btn--ghost-inv" href="/join/internships/">All tracks</a></div>`)
      + `<section class="ff-section"><div class="ff-wrap ff-lgrid">
<div class="ff-prose">
<h2 class="ff-h2">What you’ll do</h2>
<ul>${t.do.map((x) => `<li>${x}</li>`).join('')}</ul>
<h2 class="ff-h2">Sample projects</h2>
<ul>${t.projects.map((x) => `<li>${x}</li>`).join('')}</ul>
</div>
<div>
<div class="ff-faq" style="border:1px solid var(--ff-line);padding:20px 22px;border-radius:4px;margin-bottom:16px">
<h3>Course status</h3>
<p>${t.course}</p>
</div>
<div class="ff-faq" style="border:1px solid var(--ff-line);padding:20px 22px;border-radius:4px;margin-bottom:16px">
<h3>Who it’s for</h3>
<p>${t.who}</p>
</div>
<div class="ff-faq" style="border:1px solid var(--ff-line);padding:20px 22px;border-radius:4px">
<h3>Logistics</h3>
<p>Unpaid. Remote-friendly. Flexible around classes. Process: apply → screen → interview → accept → course (when ready) → projects.</p>
</div>
<div class="ff-btnrow"><a class="ff-btn ff-btn--primary" href="${INTERN_FORM}" target="_blank" rel="noopener">Apply on Google Form</a></div>
</div>
</div></section>`,
  }));
}

out('/internships/remote/', page({
  title: 'Remote Internships | Flash Forward',
  description: 'All Flash Forward internship tracks are remote-friendly. Apply via one Google Form.',
  canonical: '/internships/remote/',
  active: 'join',
  main: pagehead('Join · Internships', 'Remote internships', 'Every track is remote-friendly. Engineering is not listed on the public site for v1.')
    + `<section class="ff-section"><div class="ff-wrap ff-prose">
<p>Pick <a href="/internships/marketing/">Marketing &amp; Communications</a>, <a href="/internships/partnerships-operations/">Partnerships &amp; Operations</a>, or <a href="/internships/fundraising/">Fundraising &amp; Growth</a>.</p>
<div class="ff-btnrow"><a class="ff-btn ff-btn--primary" href="${INTERN_FORM}" target="_blank" rel="noopener">Apply</a><a class="ff-btn ff-btn--ghost" href="/join/internships/">All tracks</a></div>
</div></section>`,
}));

// ——— Open roles ———
const roles = [
  {
    slug: 'coo', short: 'COO', title: 'Chief Operating Officer',
    summary: 'Own weekly ops rhythm, internship pipeline health, and delivery between board priorities and day-to-day work.',
    do: ['Run standup/async ops cadence with track leads.', 'Unblock partner shipments and Apply throughput.', 'Keep a single source of truth for open tasks and deadlines.', 'Escalate risks to the board early — not after they explode.'],
    fit: 'Operators who have led a club, team, or project end-to-end. Strong writing and calm under ambiguity.',
  },
  {
    slug: 'cpo', short: 'CPO', title: 'Chief Partnerships Officer',
    summary: 'Own assembly and distribution partner strategy — from first email to lights placed.',
    do: ['Set partner criteria and screening bar with the board.', 'Coach Partnerships & Ops interns on outreach quality.', 'Negotiate handoffs, shipping expectations, and media consent.', 'Protect honesty: no over-promising light counts or outcomes.'],
    fit: 'Relationship builders who can also run a CRM-ish spreadsheet. Interest in education or hardware programs helps.',
  },
  {
    slug: 'cfo', short: 'CFO', title: 'Chief Financial Officer',
    summary: 'Own books hygiene, GiveButter reconciliation notes, and basic nonprofit finance hygiene with the Treasurer.',
    do: ['Track gifts vs flashlight-unit framing with Andy (Treasurer).', 'Flag restricted-preference questions for board review.', 'Help prepare simple monthly cash / gift summaries.', 'Support 990 readiness when filings approach.'],
    fit: 'Detail-oriented students comfortable with spreadsheets and careful language. Prior bookkeeping optional; integrity required.',
  },
  {
    slug: 'director-partnerships', short: 'Dir', title: 'Director of Partnerships',
    summary: 'Lead day-to-day partner pipeline under CPO/board — assembly clubs and distribution orgs.',
    do: ['Own outreach lists and follow-ups.', 'Document partner status for weekly review.', 'Coordinate parts shipments with ops.', 'Prepare partner FAQ answers for Contact inbound.'],
    fit: 'Reliable communicators who like building systems. Great step before or beside CPO.',
  },
  {
    slug: 'director-marketing', short: 'Dir', title: 'Director of Marketing',
    summary: 'Lead brand voice, channel plan, and Marketing intern quality bar.',
    do: ['Set content themes that match facts-only rules.', 'Review intern drafts before publish.', 'Coordinate Impact Story and Donate messaging.', 'Grow awareness without yellow-sticker hype.'],
    fit: 'Editors and designers who can mentor peers and say no to inaccurate claims.',
  },
  {
    slug: 'director-fundraising', short: 'Dir', title: 'Director of Fundraising',
    summary: 'Lead Study Circle growth, sponsor asks, and grant research under board oversight.',
    do: ['Plan monthly giving prompts tied to real program needs.', 'Coach Fundraising & Growth interns on ask quality.', 'Keep donor preference language accurate.', 'Brief the board on pipeline, not vanity metrics.'],
    fit: 'Writers who can ask clearly and steward trust. Comfort talking about money without pressure tactics.',
  },
];

const applyPlaceholder = `<div class="ff-placeholder">
<h3>Application form coming soon</h3>
<p>Leadership applications will use a dedicated Google Form (separate from the internship form). Until Sree pastes that link here, email the board:</p>
<p><a href="mailto:about@flashforwardfoundation.org?subject=Open%20role%20interest">about@flashforwardfoundation.org</a></p>
<p style="margin:0;font-size:var(--ff-text-small);color:var(--ff-muted)">Do not use the internship Apply form for COO / CPO / CFO / Director seats.</p>
</div>`;

out('/join/open-roles/', page({
  title: 'Open Roles | Flash Forward Foundation',
  description: 'Open unpaid leadership seats: COO, CPO, CFO, and Directors of Partnerships, Marketing, and Fundraising. See more, then apply when the leadership form is live.',
  canonical: '/join/open-roles/',
  active: 'join',
  main: pagehead('Join', 'Open roles', 'Photo placeholders are intentional. Board: Sree, Romir, Andy. Read a role, then Apply — leadership form coming soon.')
    + `<section class="ff-section"><div class="ff-wrap">
${roles.map((r) => `<div class="ff-rolerow"><div class="ff-rolerow__photo ff-rolerow__photo--ph">${r.short}</div><div><p class="ff-rolerow__name">${r.title}</p><p class="ff-rolerow__role">Open · unpaid</p><p style="margin:6px 0 0;color:var(--ff-muted);font-size:var(--ff-text-small)">${r.summary}</p></div><div class="ff-rolerow__cta"><a class="ff-btn ff-btn--ghost" href="/join/open-roles/${r.slug}/">See more</a></div></div>`).join('\n')}
</div></section>`,
}));

for (const r of roles) {
  out(`/join/open-roles/${r.slug}/`, page({
    title: `${r.title} | Open Role | Flash Forward`,
    description: `${r.title} — unpaid open leadership seat at Flash Forward Foundation. ${r.summary}`,
    canonical: `/join/open-roles/${r.slug}/`,
    active: 'join',
    main: pagehead('Join · Open roles', r.title, r.summary)
      + `<section class="ff-section"><div class="ff-wrap ff-lgrid">
<div class="ff-prose">
<h2 class="ff-h2">What you’ll own</h2>
<ul>${r.do.map((x) => `<li>${x}</li>`).join('')}</ul>
<h2 class="ff-h2">Who thrives here</h2>
<p>${r.fit}</p>
<p>Entire organization is unpaid, including this seat. Expect async work, weekly check-ins, and direct board access.</p>
</div>
<div>
${applyPlaceholder}
<div class="ff-btnrow"><a class="ff-btn ff-btn--ghost" href="/join/open-roles/">All open roles</a></div>
</div>
</div></section>`,
  }));
}

// ——— Ambassadors ———
out('/get-involved/ambassadors/', page({
  title: 'Ambassadors | Flash Forward Foundation',
  description: 'Flash Forward Ambassadors grow awareness, connections, content, and peer fundraising — unpaid and separate from internships.',
  canonical: '/get-involved/ambassadors/',
  active: 'involved',
  main: pagehead('Get Involved', 'Ambassadors', 'An unpaid path for people who want to grow Flash Forward without joining as interns or assembling lights.')
    + `<section class="ff-section"><div class="ff-wrap ff-lgrid">
<div class="ff-prose">
<p>Tracks under one umbrella: Awareness · Connections · Content/UGC · Peer Fundraising. Anyone worldwide is eligible; soft preference for US-overlapping timezones for live meetings only.</p>
<p>Ambassadors are <strong>not</strong> interns. If you are offered both, you choose one. Chapters are not Ambassadors (later backlog).</p>
<ul>
<li>Share the mission with campuses and communities</li>
<li>Introduce potential assembly or distribution partners</li>
<li>Create honest content with brand review</li>
<li>Run peer fundraisers only through Flash Forward GiveButter / Treasurer approval</li>
</ul>
</div>
<div>
<div class="ff-placeholder">
<h3>Ambassador form coming soon</h3>
<p>We will publish a dedicated Google Form when it is ready. Until then, introduce yourself:</p>
<p><a href="mailto:about@flashforwardfoundation.org?subject=Ambassador%20interest">about@flashforwardfoundation.org</a></p>
</div>
</div>
</div></section>`,
}));

// ——— Partners ———
out('/get-involved/partners/assembly/', page({
  title: 'Assembly Partners | Flash Forward Foundation',
  description: 'Become a Flash Forward assembly partner. Soft bar: 3D printer, soldering kit, engineering-minded team. We supply key parts and shipping labels.',
  canonical: '/get-involved/partners/assembly/',
  active: 'involved',
  main: pagehead('Partners', 'Assembly partners', 'You print housings and assemble. We ship key electrical parts and buy the carrier label. Soft requirements — we screen after you write.')
    + `<section class="ff-section"><div class="ff-wrap ff-lgrid">
<div class="ff-prose">
<h2 class="ff-h2">Who this is for</h2>
<p>Robotics clubs, makerspaces, school builder teams, and community workshops with access to a <strong>3D printer</strong>, a <strong>soldering kit</strong>, and people who have built something before. You do not need a factory — you need reliable hands and honest reporting.</p>
<h2 class="ff-h2">Soft requirements</h2>
<ul>
<li>Ability to print the housing design we share (or propose a compatible revision)</li>
<li>Safe soldering setup and adult/advisor oversight where needed</li>
<li>A named lead who answers email within a few days</li>
<li>Willingness to report finished dims, weight, and count before shipping</li>
<li>Space to store a small parts kit until assembly is done</li>
</ul>
<p>These are soft public bars. We learn fit during screening — write even if you are close but not perfect.</p>
<h2 class="ff-h2">What Flash Forward provides</h2>
<ul>
<li>Key electrical parts (LEDs, drivers, solar/battery components as specified)</li>
<li>Assembly guidance and quality checkpoints</li>
<li>Carrier label for outbound shipment toward distribution</li>
<li>Credit as an assembly partner in program notes when you want it</li>
</ul>
</div>
<div>
<h2 class="ff-h2" style="margin-top:0">Process</h2>
<ol class="ff-steps">
<li>Write via Contact with “Assembly partner” topic — team size, printer, location, advisor.</li>
<li>We screen and send a short build brief.</li>
<li>Parts ship to you.</li>
<li>You assemble, QC, and report dims/weight/count.</li>
<li>We send a shipping label; you drop at the carrier.</li>
</ol>
<div class="ff-btnrow"><a class="ff-btn ff-btn--primary" href="/contact/?topic=assembly">Apply to assemble</a></div>
</div>
</div></section>
<section class="ff-section ff-section--tint"><div class="ff-wrap">
<p class="ff-kicker">FAQ</p>
<div class="ff-faqgrid">
${faq('Do we buy our own electronics?', 'Usually no for the core kit — Flash Forward supplies key electrical parts. You provide printer filament/time and basic tools unless we agree otherwise.')}
${faq('How many lights in a first batch?', 'Small on purpose — often a pilot of a handful of units so we can learn together before scaling.')}
${faq('Can a high school club apply?', 'Yes. Many ideal partners are student robotics or maker clubs with an advisor.')}
${faq('Is this paid?', 'Assembly partnerships are mission collaborations, not paid manufacturing contracts. Talk with us if cost is a blocker — sometimes we can help with materials.')}
</div>
</div></section>
<section class="ff-cta-band"><div class="ff-wrap">
<h2 class="ff-h2">Ready to build with us?</h2>
<p>Tell us about your shop, team, and timeline. We reply by email.</p>
<div class="ff-btnrow"><a class="ff-btn ff-btn--inverse" href="/contact/?topic=assembly">Contact to assemble</a></div>
</div></section>`,
}));

out('/get-involved/partners/distribution/', page({
  title: 'Distribution Partners | Flash Forward Foundation',
  description: 'Request Flash Forward study lights for students you serve. Soft public bar; surveys and media deepen after the relationship starts.',
  canonical: '/get-involved/partners/distribution/',
  active: 'involved',
  main: pagehead('Partners', 'Distribution partners', 'Local organizations with student access. Light public requirements; surveys and media deepen after we start working together.')
    + `<section class="ff-section"><div class="ff-wrap ff-lgrid">
<div class="ff-prose">
<h2 class="ff-h2">Who this is for</h2>
<p>Schools, community NGOs, education programs, and youth organizations that already reach learners studying without reliable evening light. You know your students; we do not parachute in to pick recipients.</p>
<h2 class="ff-h2">Soft requirements</h2>
<ul>
<li>Direct access to students who would benefit from a solar study light</li>
<li>A contact who can receive and responsibly place lights</li>
<li>Basic willingness to share high-level placement notes (counts, community context)</li>
<li>Openness to optional surveys or media later — not a day-one demand</li>
<li>Honest conversation about shipping: domestic handoff vs. international needs</li>
</ul>
<p>Current seed partners include Brighten Haiti, Loksadhana (India), and Malaika (DR Congo) — also framed as <a href="/impact-stories/">Impact Stories</a>.</p>
<h2 class="ff-h2">What we ask over time</h2>
<p>Early: who you serve and how you would place lights. Later: optional feedback, photos with consent, and clearer outcome notes. We never invent person-level cash-transfer claims.</p>
</div>
<div>
<h2 class="ff-h2" style="margin-top:0">Process</h2>
<ol class="ff-steps">
<li>Write via Contact with “Distribution partner” — who you serve, geography, estimate of students.</li>
<li>We reply with clarifying questions and shipping options.</li>
<li>Align on a pilot quantity and handoff plan.</li>
<li>Lights arrive; you place them with learners you already know.</li>
<li>Optional: deepen surveys, media, and Impact Story framing together.</li>
</ol>
<div class="ff-btnrow"><a class="ff-btn ff-btn--primary" href="/contact/?topic=distribution">Request lights</a></div>
</div>
</div></section>
<section class="ff-section ff-section--tint"><div class="ff-wrap">
<p class="ff-kicker">FAQ</p>
<div class="ff-faqgrid">
${faq('Do students pay for lights?', 'No. Lights are placed through partners for learners who need evening study light — not sold as a consumer product on this path.')}
${faq('Can I choose which country gets lights?', 'Donors may set a destination preference. Partners receive lights through program planning — talk with us about fit rather than assuming a named fund.')}
${faq('What if we cannot afford international shipping?', 'Say so early. Sometimes shipping is partner-sponsored or staged via regional handoffs. Honesty beats a stuck shipment.')}
${faq('Will you require photos of children?', 'Never without consent and partner guidance. Media is optional and careful.')}
</div>
</div></section>
<section class="ff-cta-band"><div class="ff-wrap">
<h2 class="ff-h2">Serve students who study after dark?</h2>
<p>Tell us who you reach and how you would place lights. We will follow up by email.</p>
<div class="ff-btnrow"><a class="ff-btn ff-btn--inverse" href="/contact/?topic=distribution">Contact to distribute</a></div>
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

// ——— Our Story ———
out('/about/', page({
  title: 'Our Story | Flash Forward Foundation',
  description: 'Flash Forward Foundation is a student-led 501(c)(3) in Bellevue, WA. We design solar study lights with assembly and distribution partners so studying does not stop at sunset.',
  canonical: '/about/',
  active: 'about',
  main: pagehead('About', 'Our story', 'Studying shouldn’t stop when the sun goes down.')
    + `<section class="ff-section"><div class="ff-wrap ff-prose">
<p>Flash Forward Foundation is a student-run 501(c)(3) founded in 2024 by students in Bellevue, Washington. We design a low-cost solar study light for learners who have no reliable electricity — because without light, the school day often ends at sunset.</p>
<p>As of October 2026, partners in Haiti, India, and the DR Congo have received <strong>72 lights</strong>: 42 through Brighten Haiti, 15 through Loksadhana, and 15 through Malaika.</p>
</div></section>
<section class="ff-section ff-section--tint"><div class="ff-wrap ff-lgrid">
<div class="ff-prose">
<p class="ff-kicker">A school day</p>
<h2 class="ff-h2">Hours lost after dusk</h2>
<p>In much of India and Sub-Saharan Africa the sun sets around 6 PM and school ends around 3 PM — leaving only a short window of daylight to study. About 655 million people lived without electricity in 2024 (Tracking SDG7, 2026).</p>
<p>A charged study light can stretch evening revision for hours. That is the compounding bet we make: light → homework done → a fairer shot.</p>
</div>
<div class="ff-prose">
<p class="ff-kicker">Why light</p>
<h2 class="ff-h2">Education compounds</h2>
<p>Flash Forward focuses on education because it has the most compounding long-term effect on a student’s opportunities. We are not a general energy charity — we are a study-hours organization that happens to ship hardware.</p>
</div>
</div></section>
<section class="ff-section"><div class="ff-wrap">
<p class="ff-kicker">For students, by students</p>
<h2 class="ff-h2">Same age. Different light.</h2>
<p class="ff-lede">High-school and college students lead the organization. Assembly partners build the lights. Distribution partners place them. The people solving the problem are close in age to the people living it — and honest about who does which job.</p>
<div class="ff-paths">
<div class="ff-path" style="cursor:default"><p class="ff-path__title">Simple</p><p class="ff-path__text">A $5.17 parts light anyone in a workshop can assemble — no exotic over-engineering.</p></div>
<div class="ff-path" style="cursor:default"><p class="ff-path__title">Through partners</p><p class="ff-path__text">Local orgs choose recipients. They know their students.</p></div>
<div class="ff-path" style="cursor:default"><p class="ff-path__title">Transparent</p><p class="ff-path__text">Donors can prefer a country or story. We match best-effort — never fake precision.</p></div>
</div>
</div></section>
<section class="ff-section ff-section--muted"><div class="ff-wrap ff-prose">
<p class="ff-kicker">So far</p>
<ul>
<li><strong>2024</strong> — Founded by students in Bellevue; first prototype.</li>
<li><strong>August 2025</strong> — IRS recognizes Flash Forward as a 501(c)(3) public charity (EIN 39-3605570).</li>
<li><strong>2026</strong> — 72 lights with partners in Haiti, India, and DR Congo.</li>
<li><strong>August 2026</strong> — Leadership expands departments and the internship program.</li>
</ul>
<p>We do <strong>not</strong> claim Bellevue interns solder every light. Interns run pipelines. Partners build and deliver. The entire org is unpaid.</p>
<div class="ff-btnrow"><a class="ff-btn ff-btn--primary" href="/join/">Join</a><a class="ff-btn ff-btn--ghost" href="/donate/">Donate</a><a class="ff-btn ff-btn--ghost" href="/our-model/">Our Model</a></div>
</div></section>`,
}));

// ——— Nonprofit ———
out('/nonprofit-status/', page({
  title: 'Nonprofit Status & EIN 39-3605570 | Flash Forward',
  description: 'Flash Forward Foundation is an IRS-recognized 501(c)(3) public charity (509(a)(2)), EIN 39-3605570, effective August 5, 2025.',
  canonical: '/nonprofit-status/',
  active: 'about',
  main: pagehead('About', 'Nonprofit status', 'Accountability & transparency. IRS-recognized 501(c)(3). EIN 39-3605570.')
    + `<section class="ff-section"><div class="ff-wrap ff-lgrid">
<div class="ff-prose">
<p>Flash Forward Foundation is an IRS-recognized 501(c)(3) public charity (509(a)(2)), effective August 5, 2025, with EIN <strong>39-3605570</strong>. It is listed in IRS Publication 78, and donations are tax-deductible to the extent allowed by law. The first Form 990, for fiscal year 2025, will be posted here once it is filed.</p>
<h2 class="ff-h2">Tax-exempt details</h2>
<ul>
<li>Legal name: Flash Forward Foundation</li>
<li>EIN: 39-3605570</li>
<li>Location: Bellevue, Washington, United States</li>
<li>Tax-exempt status: 501(c)(3), effective August 5, 2025</li>
<li>Public charity classification: 509(a)(2)</li>
<li>IRS Publication 78: listed as eligible to receive tax-deductible contributions</li>
</ul>
<h2 class="ff-h2">IRS Federal Form 990</h2>
<p>Fiscal year 2025: not filed yet. The first Form 990 will be posted here once it is filed.</p>
</div>
<div>
<div class="ff-faq" style="border:1px solid var(--ff-line);padding:20px;border-radius:4px">
<h3>Documents</h3>
<p><a href="/legal/irs-determination-letter.pdf">IRS 501(c)(3) Determination Letter (PDF)</a></p>
<p><a href="/legal/irs-publication-78-listing.pdf">IRS Publication 78 Listing (PDF)</a></p>
</div>
<div class="ff-btnrow"><a class="ff-btn ff-btn--primary" href="/donate/">Donate</a><a class="ff-btn ff-btn--ghost" href="/impact/reports/">Reports</a></div>
</div>
</div></section>`,
}));

// ——— Contact (FormSubmit — same endpoint as previous live contact page) ———
out('/contact/', page({
  title: 'Contact | Flash Forward Foundation',
  description: 'Contact Flash Forward Foundation about donations, partnerships, internships, or press. about@flashforwardfoundation.org',
  canonical: '/contact/',
  active: 'about',
  main: pagehead('About', 'Contact', 'Have a question about the lights, the internship, or partnering with us? Write to Flash Forward today.')
    + `<section class="ff-section"><div class="ff-wrap ff-lgrid">
<div>
<p>1402 153rd Pl SE, Bellevue, WA 98007</p>
<p><a href="mailto:about@flashforwardfoundation.org">about@flashforwardfoundation.org</a></p>
<div id="ff-sent" class="ff-section--tint" style="padding:16px 20px;border-radius:4px;margin:24px 0" hidden><p style="margin:0"><strong>Thank you.</strong> Your message was sent. We reply by email.</p></div>
<form class="ff-form" method="POST" action="${CONTACT_FORM}" id="gform_1">
<input type="hidden" name="_subject" value="Website message">
<input type="hidden" name="_next" value="https://flashforwardfoundation.org/contact/?sent=1">
<input type="hidden" name="_captcha" value="false">
<input type="text" name="_honey" style="display:none" tabindex="-1" autocomplete="off">
<div class="ff-field"><label class="ff-field__label" for="input_1_1">First Name <span aria-hidden="true">*</span></label><input id="input_1_1" name="first_name" type="text" autocomplete="given-name" required></div>
<div class="ff-field"><label class="ff-field__label" for="input_1_2">Last Name <span aria-hidden="true">*</span></label><input id="input_1_2" name="last_name" type="text" autocomplete="family-name" required></div>
<div class="ff-field"><label class="ff-field__label" for="input_1_4">Email <span aria-hidden="true">*</span></label><input id="input_1_4" name="email" type="email" autocomplete="email" required></div>
<div class="ff-field"><label class="ff-field__label" for="input_1_7">Topic <span aria-hidden="true">*</span></label>
<select id="input_1_7" name="topic" required>
<option value="General question">General question</option>
<option value="Internship">Internship</option>
<option value="Partner with us">Partner with us</option>
<option value="assembly">Assembly partner</option>
<option value="distribution">Distribution partner</option>
<option value="Request lights for my community">Request lights for my community</option>
<option value="Dedicate a light">Dedicate a light</option>
<option value="Media">Media</option>
</select></div>
<div class="ff-field"><label class="ff-field__label" for="input_1_5">Message <span aria-hidden="true">*</span></label><textarea id="input_1_5" name="message" rows="8" required></textarea></div>
<button class="ff-btn ff-btn--primary" type="submit" id="gform_submit_button_1">Submit</button>
</form>
</div>
<div class="ff-prose">
<p class="ff-kicker">Tips</p>
<p>For internship applications, use the <a href="/join/apply/">Join Apply</a> Google Form — not this contact box.</p>
<p>For assembly or distribution, pick the matching topic so we route faster.</p>
</div>
</div></section>
<script>if(new URLSearchParams(location.search).get('sent')==='1'){var el=document.getElementById('ff-sent');if(el)el.hidden=false;}</script>`,
}));

// ——— Privacy ———
out('/privacy/', page({
  title: 'Privacy Policy | Flash Forward Foundation',
  description: 'How Flash Forward Foundation collects, uses, and protects information from visitors to flashforwardfoundation.org.',
  canonical: '/privacy/',
  active: 'about',
  main: pagehead('Legal', 'Privacy Policy', 'How we collect, use, and protect information.')
    + `<section class="ff-section"><div class="ff-wrap">
<nav class="ff-toc" aria-label="On this page"><p class="ff-kicker" style="margin:0">On this page</p>
<ol>
<li><a href="#information-we-collect">Information We Collect</a></li>
<li><a href="#how-we-use">How We Use Your Information</a></li>
<li><a href="#how-we-share">How We Share Your Information</a></li>
<li><a href="#data-retention">Data Retention</a></li>
<li><a href="#forms-processors">Forms &amp; Third-Party Processors</a></li>
<li><a href="#analytics">Analytics &amp; Cookies</a></li>
<li><a href="#international">International Users</a></li>
<li><a href="#dnt">Do Not Track</a></li>
<li><a href="#children">Children's Privacy</a></li>
<li><a href="#security">Data Security</a></li>
<li><a href="#choices">Your Choices</a></li>
<li><a href="#liability">Limitation of Liability</a></li>
<li><a href="#changes">Changes to This Policy</a></li>
<li><a href="#contact-us">Contact Us</a></li>
</ol></nav>
<div class="ff-prose">
<p>This page explains how Flash Forward Foundation collects, uses, and protects information from visitors to our website, flashforwardfoundation.org.</p>
<p>At Flash Forward Foundation, we take your privacy seriously. By using or accessing our website in any manner, you acknowledge that you accept the practices described below. Your use of the website is also subject to our <a href="/terms/">Terms of Service</a>, which incorporates this Privacy Policy by reference.</p>
<h2 id="information-we-collect">Information We Collect</h2>
<p>We collect information you choose to provide, such as your name, email address, topic, and message when you submit a form. When you donate, our donation processor, Givebutter, collects and processes the payment and billing information needed to complete the transaction and may provide us with donation records. Flash Forward Foundation does not directly collect or store full payment-card details.</p>
<h2 id="how-we-use">How We Use Your Information</h2>
<p>We use the information you provide to respond to your message, process internship applications, keep you updated about our programs, and operate, protect, and improve our website and mission. We do not sell your personal information.</p>
<h2 id="how-we-share">How We Share Your Information</h2>
<p>We may share your information with service providers who help us operate our website and programs (such as our form-processing and donation partners), when required by law, to protect rights and safety, or in connection with a merger or transfer of assets. We may also share aggregated or de-identified information.</p>
<h2 id="data-retention">Data Retention</h2>
<p>We retain personal information for as long as reasonably necessary to fulfill the purposes described in this Policy, comply with legal and tax obligations as a nonprofit, resolve disputes, and enforce our agreements.</p>
<h2 id="forms-processors">Forms &amp; Third-Party Processors</h2>
<p>Contact forms are delivered through FormSubmit, a third-party form service. Internship applications may use Google Forms. Donations are processed by Givebutter. These providers handle information under their own privacy notices and security practices.</p>
<h2 id="analytics">Analytics &amp; Cookies</h2>
<p>We use Google Analytics to understand how visitors use our website. You can control cookies through your browser settings and opt out of Google Analytics using Google's browser add-on. See Google's Privacy Policy at policies.google.com/privacy.</p>
<h2 id="international">International Users</h2>
<p>Flash Forward Foundation is based in the United States. Information you provide will be processed and stored in the United States. If you access our website from outside the United States, you consent to that transfer.</p>
<h2 id="dnt">Do Not Track</h2>
<p>Some browsers offer a “Do Not Track” signal. Because there is no common industry standard for how to respond, our website does not currently respond differently based on a Do Not Track signal.</p>
<h2 id="children">Children's Privacy</h2>
<p>Flash Forward Foundation was founded by students, and our interns are students themselves. We do not knowingly collect personal information from children under 13 without parental involvement. If you believe a child has provided us with personal information, contact us so we can remove it.</p>
<h2 id="security">Data Security</h2>
<p>We seek to protect your personal information using reasonable administrative, technical, and physical security measures. No method of transmitting or storing data over the internet is completely secure.</p>
<h2 id="choices">Your Choices</h2>
<p>You may contact us to ask what information we have about you, request a correction, or ask us to delete it, to the extent required by applicable law.</p>
<h2 id="liability">Limitation of Liability</h2>
<p>To the fullest extent permitted by law, Flash Forward Foundation is not liable for unauthorized access to or use of your information, or for the privacy or security practices of third-party services we use or link to, except as required by applicable law.</p>
<h2 id="changes">Changes to This Policy</h2>
<p>We may update this Privacy Policy from time to time. Changes are effective when posted on this page. Continued use after a change means you accept the updated Policy.</p>
<h2 id="contact-us">Contact Us</h2>
<p>Questions: <a href="mailto:about@flashforwardfoundation.org">about@flashforwardfoundation.org</a>.</p>
<p style="color:var(--ff-muted);font-size:var(--ff-text-small)">Last Updated: October 6, 2026</p>
</div>
</div></section>`,
}));

// ——— Terms ———
out('/terms/', page({
  title: 'Terms and Conditions | Flash Forward Foundation',
  description: 'Terms of Service for flashforwardfoundation.org — rules for using the Flash Forward Foundation website.',
  canonical: '/terms/',
  active: 'about',
  main: pagehead('Legal', 'Terms and Conditions', 'Rules for accessing and using flashforwardfoundation.org.')
    + `<section class="ff-section"><div class="ff-wrap">
<nav class="ff-toc" aria-label="On this page"><p class="ff-kicker" style="margin:0">On this page</p>
<ol>
<li><a href="#who-we-are">Who We Are</a></li>
<li><a href="#eligibility">Eligibility</a></li>
<li><a href="#using">Using Our Website</a></li>
<li><a href="#donations">Donations</a></li>
<li><a href="#forms">Internship Applications &amp; Contact Forms</a></li>
<li><a href="#internships">Internships &amp; In-Person Activities</a></li>
<li><a href="#risk">Assumption of Risk</a></li>
<li><a href="#indemnification">Indemnification</a></li>
<li><a href="#advice">No Professional Advice</a></li>
<li><a href="#ip">Intellectual Property</a></li>
<li><a href="#third-party">Third-Party Links and Services</a></li>
<li><a href="#disclaimer">Disclaimer of Warranties</a></li>
<li><a href="#liability">Limitation of Liability</a></li>
<li><a href="#termination">Termination</a></li>
<li><a href="#force-majeure">Force Majeure</a></li>
<li><a href="#disputes">Dispute Resolution</a></li>
<li><a href="#changes">Changes to These Terms</a></li>
<li><a href="#governing-law">Governing Law</a></li>
<li><a href="#severability">Severability, Entire Agreement &amp; No Waiver</a></li>
<li><a href="#contact-us">Contact Us</a></li>
</ol></nav>
<div class="ff-prose">
<p>These Terms of Service (“Terms”) are entered into between Flash Forward Foundation (“Flash Forward,” “we,” “us,” or “our”) and any person who accesses or uses our website. By accessing or using our website in any way, you agree to these Terms, including our <a href="/privacy/">Privacy Policy</a>.</p>
<p>Questions: <a href="mailto:about@flashforwardfoundation.org">about@flashforwardfoundation.org</a>. Address: Flash Forward Foundation, Bellevue, Washington, United States.</p>
<h2 id="who-we-are">Who We Are</h2>
<p>Flash Forward Foundation is a 501(c)(3) public charity (EIN 39-3605570) founded by students. We develop solar-powered study lights for students living without reliable electricity and coordinate intern-led design, assembly partnerships, fundraising, outreach, and delivery.</p>
<h2 id="eligibility">Eligibility</h2>
<p>You must be at least 13 years old to use our website or submit a form. If you are under 18, you may only use our website and submit forms with the involvement or consent of a parent or guardian.</p>
<h2 id="using">Using Our Website</h2>
<p>You may use our website to learn about our mission, donate, apply for an internship, or contact our team. You agree to use the site only for lawful purposes and in a way that does not infringe others' use of the site.</p>
<h2 id="donations">Donations</h2>
<p>Donations are processed by Givebutter and subject to its terms. Recurring donations continue until you cancel. Flash Forward Foundation is a 501(c)(3); donations are tax-deductible to the extent allowed by law.</p>
<h2 id="forms">Internship Applications &amp; Contact Forms</h2>
<p>Submitting a form does not guarantee an internship, a response time, or any particular outcome. Information you provide is sent to our team so we can respond.</p>
<h2 id="internships">Internships &amp; In-Person Activities</h2>
<p>Interns are not employees, agents, or legal representatives of Flash Forward Foundation. We may accept, decline, pause, or end participation at our sole discretion.</p>
<h2 id="risk">Assumption of Risk</h2>
<p>Interning, attending events, and building, testing, shipping, or using solar-powered flashlights involve inherent risks. By participating, you voluntarily assume those risks to the fullest extent permitted by law.</p>
<h2 id="indemnification">Indemnification</h2>
<p>You agree to indemnify and hold harmless Flash Forward Foundation and its officers, interns, and affiliates from claims arising out of your use of the website, violation of these Terms, or participation in Flash Forward activities.</p>
<h2 id="advice">No Professional Advice</h2>
<p>Nothing on our website constitutes legal, financial, tax, safety, or other professional advice.</p>
<h2 id="ip">Intellectual Property</h2>
<p>The Flash Forward Foundation name, logo, and website content belong to Flash Forward Foundation unless otherwise noted. Content you submit may be used for our mission and promotional purposes under a non-exclusive license as described on the live Terms historically published.</p>
<h2 id="third-party">Third-Party Links and Services</h2>
<p>We may link to Discord, Instagram, Givebutter, Google Forms, FormSubmit, and other services. We are not responsible for their content or practices.</p>
<h2 id="disclaimer">Disclaimer of Warranties</h2>
<p>Our website and associated products, services, or activities are provided “as is” and “as available,” without warranties of any kind.</p>
<h2 id="liability">Limitation of Liability</h2>
<p>To the fullest extent permitted by law, Flash Forward Foundation will not be liable for indirect or consequential damages. Total liability for any claim relating to these Terms or our website will not exceed one hundred dollars ($100).</p>
<h2 id="termination">Termination</h2>
<p>We may suspend or terminate access or internship participation at any time. Surviving sections include Indemnification, Disclaimer, Limitation of Liability, and Governing Law.</p>
<h2 id="force-majeure">Force Majeure</h2>
<p>We are not liable for delays caused by events outside our reasonable control.</p>
<h2 id="disputes">Dispute Resolution</h2>
<p>Contact us first to resolve disputes informally. Unresolved disputes are subject to the exclusive jurisdiction of state and federal courts in Washington State.</p>
<h2 id="changes">Changes to These Terms</h2>
<p>Continued use after changes means you accept the updated Terms.</p>
<h2 id="governing-law">Governing Law</h2>
<p>These Terms are governed by the laws of the State of Washington, without regard to conflict-of-law principles.</p>
<h2 id="severability">Severability, Entire Agreement &amp; No Waiver</h2>
<p>If any provision is unenforceable, the rest remain in effect. These Terms plus the Privacy Policy are the entire agreement. Failure to enforce a provision is not a waiver.</p>
<h2 id="contact-us">Contact Us</h2>
<p><a href="mailto:about@flashforwardfoundation.org">about@flashforwardfoundation.org</a></p>
<p style="color:var(--ff-muted);font-size:var(--ff-text-small)">Last Updated: October 6, 2026</p>
</div>
</div></section>`,
}));

// ——— Site map ———
out('/site-map/', page({
  title: 'Site map | Flash Forward Foundation',
  description: 'Site map for Flash Forward Foundation — Our Model, Impact, Join, Get Involved, About, Guides, and legal pages.',
  canonical: '/site-map/',
  active: 'about',
  main: pagehead('Legal', 'Site map', 'A plain list of major pages.')
    + `<section class="ff-section"><div class="ff-wrap" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:32px">
<div>
<h2 class="ff-h3">Home &amp; model</h2>
<a href="/">Home</a><br>
<a href="/our-model/">Our Model</a><br>
<a href="/our-model/why-light/">Why Light &amp; Learning</a><br>
<a href="/our-model/study-unlock-pathway/">Study Unlock Pathway</a><br>
<a href="/our-model/the-study-light/">The Study Light</a><br>
<a href="/our-model/made-and-delivered/">Made &amp; Delivered</a><br>
<a href="/our-model/for-students/">For Students, By Students</a>
</div>
<div>
<h2 class="ff-h3">Impact</h2>
<a href="/impact/">Impact</a><br>
<a href="/impact/outcomes/">Outcomes</a><br>
<a href="/impact/reports/">Reports</a><br>
<a href="/impact-stories/">Impact Stories</a><br>
<a href="/impact-stories/brighten-haiti/">Brighten Haiti</a><br>
<a href="/impact-stories/loksadhana/">Loksadhana</a><br>
<a href="/impact-stories/malaika/">Malaika</a><br>
<a href="/news/">News</a>
</div>
<div>
<h2 class="ff-h3">Join</h2>
<a href="/join/">Join</a><br>
<a href="/join/internships/">Internships</a><br>
<a href="/internships/marketing/">Marketing &amp; Communications</a><br>
<a href="/internships/partnerships-operations/">Partnerships &amp; Operations</a><br>
<a href="/internships/fundraising/">Fundraising &amp; Growth</a><br>
<a href="/join/open-roles/">Open roles</a><br>
<a href="/join/apply/">Apply (internship)</a>
</div>
<div>
<h2 class="ff-h3">Get involved</h2>
<a href="/get-involved/">Get Involved</a><br>
<a href="/donate/">Donate / Study Circle</a><br>
<a href="/get-involved/ambassadors/">Ambassadors</a><br>
<a href="/get-involved/partners/">Partners</a><br>
<a href="/get-involved/partners/assembly/">Assembly partners</a><br>
<a href="/get-involved/partners/distribution/">Distribution partners</a><br>
<a href="/guides/">Student Guides</a>
</div>
<div>
<h2 class="ff-h3">About &amp; legal</h2>
<a href="/about/">Our Story</a><br>
<a href="/about/team/">Leadership</a><br>
<a href="/nonprofit-status/">Nonprofit Status</a><br>
<a href="/faq/">FAQs</a><br>
<a href="/contact/">Contact</a><br>
<a href="/privacy/">Privacy</a><br>
<a href="/terms/">Terms</a><br>
<a href="/accessibility/">Accessibility</a><br>
<a href="/site-map/">Site map</a>
</div>
</div></section>`,
}));

// Fix team open-seats CTA (no longer shared apply funnel for leadership)
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
<p class="ff-lede">COO · CPO · CFO · Directors of Partnerships, Marketing, and Fundraising — all unpaid. <a href="/join/open-roles/">See open roles</a> (leadership form coming soon).</p>
</div></section>`,
}));

// Guides hub CTA + band fix
out('/guides/', page({
  title: 'Student Guides | Flash Forward Foundation',
  description: 'Practical guides for high school and college students on internships, resumes, service hours, college applications and projects.',
  canonical: '/guides/',
  active: 'involved',
  main: pagehead('Student guides', 'Student guides', 'Practical guides for high school and college students on internships, resumes, service hours, college applications and projects — written by the Flash Forward team.')
    + `<section class="ff-section"><div class="ff-wrap">
<div class="ff-paths" style="grid-template-columns:repeat(auto-fill,minmax(260px,1fr))">
<a class="ff-path" href="/guides/how-to-get-an-internship-in-high-school/"><p class="ff-path__title">Internship in high school</p><p class="ff-path__text">Where to look, outreach email, follow-up.</p></a>
<a class="ff-path" href="/guides/internship-with-no-experience/"><p class="ff-path__title">Internship with no experience</p><p class="ff-path__text">Transferable skills and beginner-friendly orgs.</p></a>
<a class="ff-path" href="/guides/high-school-resume-with-no-experience/"><p class="ff-path__title">Resume with no experience</p><p class="ff-path__text">One-page resume from school and activities.</p></a>
<a class="ff-path" href="/guides/how-to-put-volunteer-work-on-a-resume/"><p class="ff-path__title">Volunteer work on a resume</p><p class="ff-path__text">Format unpaid roles like real experience.</p></a>
<a class="ff-path" href="/guides/community-service-ideas-for-high-school-students/"><p class="ff-path__title">Community service ideas</p><p class="ff-path__text">28 ideas that actually help.</p></a>
<a class="ff-path" href="/guides/online-volunteer-opportunities-for-students/"><p class="ff-path__title">Online volunteer opportunities</p><p class="ff-path__text">Remote projects that count.</p></a>
<a class="ff-path" href="/guides/extracurriculars-for-college-applications/"><p class="ff-path__title">Extracurriculars</p><p class="ff-path__text">Depth, initiative, impact.</p></a>
<a class="ff-path" href="/guides/leadership-experience-in-high-school/"><p class="ff-path__title">Leadership experience</p><p class="ff-path__text">Responsibility over titles.</p></a>
<a class="ff-path" href="/guides/passion-project-ideas-for-high-school-students/"><p class="ff-path__title">Passion projects</p><p class="ff-path__text">Ideas you can finish and show.</p></a>
<a class="ff-path" href="/guides/free-summer-programs-for-high-school-students/"><p class="ff-path__title">Free summer programs</p><p class="ff-path__text">Where to look and what to skip.</p></a>
<a class="ff-path" href="/guides/how-to-start-a-nonprofit-as-a-student/"><p class="ff-path__title">Start a nonprofit</p><p class="ff-path__text">Project first, paperwork later.</p></a>
<a class="ff-path" href="/guides/grant-writing-for-students/"><p class="ff-path__title">Grant writing</p><p class="ff-path__text">Need, plan, honest budget.</p></a>
<a class="ff-path" href="/guides/nonprofit-careers-for-students/"><p class="ff-path__title">Nonprofit careers</p><p class="ff-path__text">Marketing, ops, fundraising.</p></a>
<a class="ff-path" href="/guides/solar-study-light-stem-project/"><p class="ff-path__title">Solar light STEM project</p><p class="ff-path__text">How a study light works — safely.</p></a>
</div>
</div></section>
<section class="ff-cta-band"><div class="ff-wrap">
<h2 class="ff-h2">Want real experience? Join the internship.</h2>
<p>Three unpaid tracks. One Google Form.</p>
<div class="ff-btnrow"><a class="ff-btn ff-btn--inverse" href="/join/apply/">Apply to intern</a></div>
</div></section>`,
}));

console.log('sree-pass done');
