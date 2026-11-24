/** Shared v1 chrome (nav + footer) for Flash Forward rewrite. */
export const CSS = 'ff.css';

const IG = `<svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor" aria-hidden="true"><path d="M12 2.2c3.2 0 3.6 0 4.9.1 1.2.1 1.8.2 2.2.4.6.2 1 .5 1.5 1 .4.4.8.8 1 1.4.2.4.4 1 .4 2.2.1 1.3.1 1.7.1 4.9s0 3.6-.1 4.9c-.1 1.2-.2 1.8-.4 2.2-.2.6-.5 1-1 1.5-.4.4-.8.8-1.4 1-.4.2-1 .4-2.2.4-1.3.1-1.7.1-4.9.1s-3.6 0-4.9-.1c-1.2-.1-1.8-.2-2.2-.4-.6-.2-1-.5-1.5-1-.4-.4-.8-.8-1-1.4-.2-.4-.4-1-.4-2.2C2.2 15.6 2.2 15.2 2.2 12s0-3.6.1-4.9c.1-1.2.2-1.8.4-2.2.2-.6.5-1 1-1.5.4-.4.8-.8 1.4-1 .4-.2 1-.4 2.2-.4C8.4 2.2 8.8 2.2 12 2.2Zm0 3.1a6.7 6.7 0 1 0 0 13.4 6.7 6.7 0 0 0 0-13.4Zm0 11a4.3 4.3 0 1 1 0-8.7 4.3 4.3 0 0 1 0 8.7Zm7-8.9a1.6 1.6 0 1 0-3.1 0 1.6 1.6 0 0 0 3.1 0Z"/></svg>`;

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
<li class="ff-nav__item${a('model')}"><a href="/our-model/">Our Model</a>
<ul>
<li><a href="/our-model/why-light/">Why Light &amp; Learning</a></li>
<li><a href="/our-model/study-unlock-pathway/">Study Unlock Pathway</a></li>
<li><a href="/our-model/the-study-light/">The Study Light</a></li>
<li><a href="/our-model/made-and-delivered/">How Lights Are Made &amp; Delivered</a></li>
<li><a href="/our-model/for-students/">For Students, By Students</a></li>
</ul></li>
<li class="ff-nav__item${a('impact')}"><a href="/impact/">Impact</a>
<ul>
<li><a href="/impact/outcomes/">Outcomes &amp; How We Measure</a></li>
<li><a href="/impact/reports/">Reports &amp; Financials</a></li>
</ul></li>
<li class="ff-nav__item${a('stories')}"><a href="/impact-stories/">Impact Stories</a></li>
<li class="ff-nav__item${a('join')}"><a href="/join/">Join</a>
<ul>
<li><a href="/join/internships/">Internships</a></li>
<li><a href="/join/open-roles/">Open roles</a></li>
<li><a href="/join/apply/">Apply</a></li>
</ul></li>
<li class="ff-nav__item${a('involved')}"><a href="/get-involved/">Get Involved</a>
<ul>
<li><a href="/donate/">Donate</a></li>
<li><a href="/donate/#study-circle">Study Circle</a></li>
<li><a href="/impact-stories/">Impact Stories</a></li>
<li><a href="/get-involved/ambassadors/">Ambassadors</a></li>
<li><a href="/get-involved/partners/">Partner With Us</a></li>
</ul></li>
<li class="ff-nav__item${a('about')}"><a href="/about/">About</a>
<ul>
<li><a href="/about/">Our Story</a></li>
<li><a href="/about/team/">Leadership</a></li>
<li><a href="/nonprofit-status/">Nonprofit Status</a></li>
<li><a href="/faq/">FAQs</a></li>
<li><a href="/news/">News</a></li>
<li><a href="/contact/">Contact</a></li>
</ul></li>
</ul>
<a class="ff-nav__donate" href="/donate/">Donate</a>
</div>
</nav>
`;
}

export function footer() {
  return `<footer class="ff-footer">
<div class="ff-wrap ff-footer__inner">
<div class="ff-footer__top">
<div class="ff-footer__brand">
<a class="ff-logo" href="/"><img src="/images/brand/mark-paper-88.png" alt="" width="60" height="88" class="ff-footer__mark"><span class="ff-logo-text">Flash Forward<br>Foundation</span></a>
<p class="ff-footer__mission">Student-led nonprofit. We design solar study lights, work with assembly and distribution partners, and unlock study hours for learners without reliable electricity.</p>
<div class="ff-footer__cta">
<a class="ff-btn ff-btn--inverse" href="/donate/">Donate</a>
<a class="ff-btn ff-btn--ghost-inv" href="/join/">Join</a>
</div>
</div>
<div class="ff-footer__social">
<p>Follow along</p>
<a class="ff-footer__icon" href="https://www.instagram.com/flashforwardfoundation/" target="_blank" rel="noopener" aria-label="Instagram">${IG}</a>
</div>
</div>
<div class="ff-footer__cols">
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
</div>
<div class="ff-footer__col">
<h3>About</h3>
<a href="/about/">Our Story</a>
<a href="/about/team/">Leadership</a>
<a href="/nonprofit-status/">Nonprofit Status</a>
<a href="/faq/">FAQs</a>
<a href="/news/">News</a>
<a href="/contact/">Contact</a>
</div>
</div>
</div>
<div class="ff-footer__bar"><div class="ff-wrap ff-footer__barrow">
<p><a href="/privacy/">Privacy</a> · <a href="/terms/">Terms</a> · <a href="/accessibility/">Accessibility</a> · <a href="/site-map/">Site map</a> · <a href="/guides/">Student Guides</a></p>
<p class="ff-footer__ein">EIN 39-3605570</p>
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
