/** Shared v1 chrome — WCK-style mega-nav + charity: water–inspired footer. */
export const CSS = 'ff.css';

const IG = `<svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor" aria-hidden="true"><path d="M12 2.2c3.2 0 3.6 0 4.9.1 1.2.1 1.8.2 2.2.4.6.2 1 .5 1.5 1 .4.4.8.8 1 1.4.2.4.4 1 .4 2.2.1 1.3.1 1.7.1 4.9s0 3.6-.1 4.9c-.1 1.2-.2 1.8-.4 2.2-.2.6-.5 1-1 1.5-.4.4-.8.8-1.4 1-.4.2-1 .4-2.2.4-1.3.1-1.7.1-4.9.1s-3.6 0-4.9-.1c-1.2-.1-1.8-.2-2.2-.4-.6-.2-1-.5-1.5-1-.4-.4-.8-.8-1-1.4-.2-.4-.4-1-.4-2.2C2.2 15.6 2.2 15.2 2.2 12s0-3.6.1-4.9c.1-1.2.2-1.8.4-2.2.2-.6.5-1 1-1.5.4-.4.8-.8 1.4-1 .4-.2 1-.4 2.2-.4C8.4 2.2 8.8 2.2 12 2.2Zm0 3.1a6.7 6.7 0 1 0 0 13.4 6.7 6.7 0 0 0 0-13.4Zm0 11a4.3 4.3 0 1 1 0-8.7 4.3 4.3 0 0 1 0 8.7Zm7-8.9a1.6 1.6 0 1 0-3.1 0 1.6 1.6 0 0 0 3.1 0Z"/></svg>`;

const DI = `<svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor" aria-hidden="true"><path d="M20.3 4.4A19.8 19.8 0 0 0 15.4 3c-.2.4-.5.9-.6 1.3a18 18 0 0 0-5.5 0C9.1 3.9 8.8 3.4 8.6 3a19.8 19.8 0 0 0-4.9 1.5A20.4 20.4 0 0 0 .1 18.1a19.9 19.9 0 0 0 6 3c.5-.7 1-1.4 1.3-2.1a13 13 0 0 1-2.1-1c.2-.1.4-.3.6-.4a14.2 14.2 0 0 0 12.2 0c.2.2.4.3.6.4-.7.4-1.4.8-2.1 1 .4.7.9 1.4 1.3 2.1a19.9 19.9 0 0 0 6-3A20.4 20.4 0 0 0 20.3 4.4ZM8.7 14.6c-1.1 0-2-1-2-2.3s.9-2.3 2-2.3 2.1 1 2 2.3c0 1.3-.9 2.3-2 2.3Zm6.6 0c-1.1 0-2-1-2-2.3s.9-2.3 2-2.3 2 1 2 2.3-.9 2.3-2 2.3Z"/></svg>`;

function megaLink(href, title, desc) {
  return `<a class="ff-mega__link" href="${href}"><span class="ff-mega__link-title">${title}</span><span class="ff-mega__link-desc">${desc}</span></a>`;
}

export function head({ title, description, canonical, extraHead = '', bodyClass = '' }) {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${title}</title>
<meta name="description" content="${description}">
<link rel="canonical" href="https://flashforwardfoundation.org${canonical}">
<link rel="icon" href="/images/brand/favicon-32.png" sizes="32x32">
<link rel="apple-touch-icon" href="/images/brand/apple-touch-icon-180.png">
<!--ff:css ${CSS}--><style></style><!--/ff:css-->
${extraHead}
</head>
<body class="ff ${bodyClass}">
<a class="ff-skip" href="#main">Skip to content</a>
`;
}

export function nav(active = '') {
  const a = (key) => (active === key ? ' is-active' : '');
  return `<nav class="ff-nav" id="site-nav" aria-label="Main">
<div class="ff-wrap ff-nav__row">
<a href="/" class="ff-logo"><img src="/images/brand/mark-green-104.png" alt="" width="71" height="104"><span class="ff-logo-text">Flash Forward<br>Foundation</span></a>
<button type="button" class="ff-nav__toggle" aria-controls="site-nav" aria-expanded="false" aria-label="Open menu"><i class="fa-solid fa-bars" aria-hidden="true"></i></button>
<ul class="ff-nav__list">
<li class="ff-nav__item${a('model')} has-mega">
<a href="/our-model/" aria-haspopup="true">Our Model</a>
<div class="ff-mega" role="region" aria-label="Our Model">
<p class="ff-mega__intro">Design → Assemble → Deliver → Unlock. Students lead. Partners build and place Study Lights.</p>
<div class="ff-mega__grid">
${megaLink('/our-model/', 'Our Model hub', 'How study light becomes study time')}
${megaLink('/our-model/why-light/', 'Why Light &amp; Learning', 'Darkness cuts study short — light unlocks hours')}
${megaLink('/our-model/study-unlock-pathway/', 'Study Unlock Pathway', 'The four verbs behind every light')}
${megaLink('/our-model/the-study-light/', 'The Study Light', '≈ $5.17 in parts — solar charged')}
${megaLink('/our-model/made-and-delivered/', 'Made &amp; Delivered', 'Assembly and distribution partners')}
${megaLink('/our-model/for-students/', 'For Students, By Students', 'Unpaid student leadership of the org')}
</div>
</div>
</li>
<li class="ff-nav__item${a('impact')} has-mega">
<a href="/impact/" aria-haspopup="true">Impact</a>
<div class="ff-mega" role="region" aria-label="Impact">
<p class="ff-mega__intro">We lead with study hours unlocked — with a method note, not inflated claims.</p>
<div class="ff-mega__grid">
${megaLink('/impact/', 'Impact hub', 'Proof with honesty')}
${megaLink('/impact/outcomes/', 'Outcomes &amp; method', 'How we estimate study hours')}
${megaLink('/impact/reports/', 'Reports &amp; Financials', '990s, letters, and transparency')}
${megaLink('/impact-stories/', 'Impact Stories', 'Prefer a school, community, or region')}
</div>
</div>
</li>
<li class="ff-nav__item${a('stories')}"><a href="/impact-stories/">Impact Stories</a></li>
<li class="ff-nav__item${a('join')} has-mega">
<a href="/join/" aria-haspopup="true">Join</a>
<div class="ff-mega" role="region" aria-label="Join">
<p class="ff-mega__intro">Every seat is unpaid — including leadership. Interns run pipelines; partners build lights.</p>
<div class="ff-mega__grid">
${megaLink('/join/', 'Join hub', 'Work with us')}
${megaLink('/join/internships/', 'Internships', 'Marketing · Partnerships · Fundraising')}
${megaLink('/join/open-roles/', 'Open roles', 'Unpaid student leadership seats')}
${megaLink('/join/apply/', 'Apply', 'Start an application')}
</div>
</div>
</li>
<li class="ff-nav__item${a('involved')} has-mega">
<a href="/get-involved/" aria-haspopup="true">Get Involved</a>
<div class="ff-mega" role="region" aria-label="Get Involved">
<p class="ff-mega__intro">Donate, join Study Circle, prefer a story, or partner on assembly and delivery.</p>
<div class="ff-mega__grid">
${megaLink('/donate/', 'Donate', 'Give in flashlight units (~$5.17)')}
${megaLink('/donate/#study-circle', 'Study Circle', 'Monthly giving that keeps the pathway funded')}
${megaLink('/impact-stories/', 'Impact Stories', 'Preference-based giving — best effort')}
${megaLink('/get-involved/ambassadors/', 'Ambassadors', 'Soft campus and community voice')}
${megaLink('/get-involved/partners/', 'Partner with us', 'Assemble or place Study Lights')}
${megaLink('/get-involved/legacy-giving/', 'Legacy giving', 'Leave study hours in your estate plan')}
</div>
</div>
</li>
<li class="ff-nav__item${a('about')} has-mega">
<a href="/about/" aria-haspopup="true">About</a>
<div class="ff-mega" role="region" aria-label="About">
<p class="ff-mega__intro">A Bellevue, WA 501(c)(3). Student-run. EIN 39-3605570.</p>
<div class="ff-mega__grid">
${megaLink('/about/', 'Our Story', 'How Flash Forward started')}
${megaLink('/about/team/', 'Leadership', 'Board and open unpaid seats')}
${megaLink('/nonprofit-status/', 'Nonprofit Status', 'Determination letter and trust cues')}
${megaLink('/faq/', 'FAQs', 'Straight answers')}
${megaLink('/news/', 'News', 'Updates from the pathway')}
${megaLink('/contact/', 'Contact', 'Reach the team')}
</div>
</div>
</li>
</ul>
<a class="ff-nav__donate" href="/donate/">Donate</a>
<a class="ff-nav__search" href="/search/" aria-label="Search"><i class="fa-solid fa-magnifying-glass" aria-hidden="true"></i></a>
</div>
</nav>
`;
}

export function footer() {
  return `<footer class="ff-footer">
<div class="ff-footer__mail">
<div class="ff-wrap ff-footer__mail-inner">
<div>
<h2 class="ff-footer__mail-title">Add impact to your inbox</h2>
<p class="ff-footer__mail-text">Occasional updates on Study Lights, partners, and study hours unlocked — no spam.</p>
</div>
<a class="ff-btn ff-btn--inverse" href="/contact/">Get updates</a>
</div>
</div>
<div class="ff-wrap ff-footer__inner">
<div class="ff-footer__top">
<div class="ff-footer__brand">
<a class="ff-logo" href="/"><img src="/images/brand/mark-paper-88.png" alt="" width="60" height="88" class="ff-footer__mark"><span class="ff-logo-text">Flash Forward<br>Foundation</span></a>
<p class="ff-footer__mission">Student-led 501(c)(3). We design solar study lights, work with assembly and distribution partners, and unlock study hours for learners without reliable electricity.</p>
<div class="ff-footer__cta">
<a class="ff-btn ff-btn--inverse" href="/donate/">Donate</a>
<a class="ff-btn ff-btn--ghost-inv" href="/join/">Join</a>
</div>
</div>
<div class="ff-footer__social">
<p>Follow along</p>
<a class="ff-footer__icon" href="https://www.instagram.com/flashforwardfoundation/" target="_blank" rel="noopener" aria-label="Instagram">${IG}</a>
<a class="ff-footer__icon" href="https://discord.gg/UnyvyxMYE" target="_blank" rel="noopener" aria-label="Discord">${DI}</a>
</div>
</div>
<nav class="ff-footer__cols" aria-label="Footer">
<div class="ff-footer__col">
<h3>Our Model</h3>
<a href="/our-model/why-light/">Why Light &amp; Learning</a>
<a href="/our-model/study-unlock-pathway/">Study Unlock Pathway</a>
<a href="/our-model/the-study-light/">The Study Light</a>
<a href="/our-model/made-and-delivered/">Made &amp; Delivered</a>
</div>
<div class="ff-footer__col">
<h3>Impact</h3>
<a href="/impact/outcomes/">Outcomes</a>
<a href="/impact/reports/">Reports</a>
<a href="/impact-stories/">Impact Stories</a>
<a href="/news/">News</a>
</div>
<div class="ff-footer__col">
<h3>Join</h3>
<a href="/join/internships/">Internships</a>
<a href="/join/open-roles/">Open roles</a>
<a href="/join/apply/">Apply</a>
</div>
<div class="ff-footer__col">
<h3>Get Involved</h3>
<a href="/donate/">Donate</a>
<a href="/donate/#study-circle">Study Circle</a>
<a href="/get-involved/ambassadors/">Ambassadors</a>
<a href="/get-involved/partners/">Partners</a>
<a href="/get-involved/legacy-giving/">Legacy giving</a>
</div>
<div class="ff-footer__col">
<h3>About</h3>
<a href="/about/">Our Story</a>
<a href="/about/team/">Leadership</a>
<a href="/nonprofit-status/">Nonprofit Status</a>
<a href="/faq/">FAQs</a>
<a href="/contact/">Contact</a>
</div>
</nav>
</div>
<div class="ff-footer__bar"><div class="ff-wrap ff-footer__barrow">
<p><a href="/privacy/">Privacy</a> · <a href="/terms/">Terms</a> · <a href="/accessibility/">Accessibility</a> · <a href="/site-map/">Site map</a> · <a href="/guides/">Student Guides</a></p>
<p class="ff-footer__ein">EIN 39-3605570 · Bellevue, WA</p>
</div></div>
</footer>
<script src="/site.js" defer></script>
</body>
</html>
`;
}

export function page({ title, description, canonical, active, bodyClass, main, extraHead = '' }) {
  return head({ title, description, canonical, extraHead, bodyClass })
    + nav(active)
    + `<main id="main" class="ff-main">\n${main}\n</main>\n`
    + footer();
}

export function pagehead(kicker, h1, lede, ctas = '') {
  return `<section class="ff-pagehead"><div class="ff-wrap">
<p class="ff-kicker">${kicker}</p>
<h1>${h1}</h1>
${lede ? `<p class="ff-lede">${lede}</p>` : ''}
${ctas}
</div></section>`;
}
