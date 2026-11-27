/** Shared v1 chrome — real charity:water nav/footer DOM structure + FF labels. */
export const CSS = 'ff.css,cw-chrome.css';

const ARROW = `<img class="ml-3" width="20" height="20" alt="" src="data:image/svg+xml,%3csvg fill='none' height='20' viewBox='0 0 20 20' width='20' xmlns='http://www.w3.org/2000/svg'%3e%3ccircle cx='10' cy='10' fill='%232f8f5b' r='9.5' stroke='%23383b36'/%3e%3cpath clip-rule='evenodd' d='m11.2144 7.16746c-.2635-.27559-.2537-.7126.0219-.97609s.7126-.25367.9761.02192l3.0962 3.23849c.2596.27149.2545.70072-.0115.96592l-3.0962 3.0879c-.27.2692-.7071.2686-.9763-.0014-.2693-.2699-.2687-.7071.0013-.9763l2.006-2.0006h-7.04151c-.38129 0-.69038-.3091-.69038-.69035 0-.38129.30909-.69038.69038-.69038h6.91621z' fill='%231a1a1a' fill-rule='evenodd'/%3e%3c/svg%3e">`;

const ARROW_LG = `<img width="20" height="20" alt="" src="data:image/svg+xml,%3csvg fill='none' height='20' viewBox='0 0 20 20' width='20' xmlns='http://www.w3.org/2000/svg'%3e%3ccircle cx='10' cy='10' fill='%232f8f5b' r='9.5' stroke='%23383b36'/%3e%3cpath clip-rule='evenodd' d='m11.2144 7.16746c-.2635-.27559-.2537-.7126.0219-.97609s.7126-.25367.9761.02192l3.0962 3.23849c.2596.27149.2545.70072-.0115.96592l-3.0962 3.0879c-.27.2692-.7071.2686-.9763-.0014-.2693-.2699-.2687-.7071.0013-.9763l2.006-2.0006h-7.04151c-.38129 0-.69038-.3091-.69038-.69035 0-.38129.30909-.69038.69038-.69038h6.91621z' fill='%231a1a1a' fill-rule='evenodd'/%3e%3c/svg%3e">`;

function megaItem(href, title) {
  return `<li class="masthead__item masthead__item--depth-1"><a class="masthead__link masthead__link--depth-1" href="${href}"><span class="masthead__item-text">${title}</span></a></li>`;
}

function hasDropdown(label, childrenHtml) {
  return `<li class="has-dropdown masthead__item masthead__item--dropdown-mega"><span class="nav-hover-extender absolute bg-transparent z-10"></span><span class="flex items-center dropdown-parent-link"><button type="button" class="heading-xs relative z-20 mr-4" aria-expanded="false">${label}</button><span class="h80 icn cw-icon-chevron-down"></span></span><div class="dropdown masthead__dropdown masthead__dropdown--mega"><div class="ff-mega-cols"><ul class="masthead__items ff-mega-grid">${childrenHtml}</ul></div></div></li>`;
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
<body class="ff R-cw-chrome ${bodyClass}">
<a class="ff-skip" href="#main">Skip to content</a>
`;
}

// One list per menu, shared by the desktop bar, the mobile menu and the footer.
const WHO = [
  ['/about/', 'Our Story'],
  ['/our-model/', 'Our Model'],
  ['/impact/', 'Our Impact'],
  ['/about/team/', 'Our Team'],
];
const INVOLVED = [
  ['/join/internships/', 'Internships'],
  ['/get-involved/ambassadors/', 'Ambassadors'],
  ['/get-involved/partners/', 'Partner with us'],
  ['/get-involved/sponsor-a-project/', 'Sponsor a project'],
];
const footLink = (href, label) => `<a href="${href}">${label}</a>`;
const drawerLink = (href, label) => `<li><a href="${href}">${label}</a></li>`;
const svg = (d) => `<svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="${d}"/></svg>`;
const CHEV_R = svg('M9 5l7 7-7 7');
const CHEV_L = svg('M15 5l-7 7 7 7');
const CLOSE = svg('M5 5l14 14M19 5L5 19');
const each = (list, fn) => list.map(([href, label]) => fn(href, label)).join('');

export function nav(active = '') {
  const whoKids = each(WHO, megaItem);
  const involvedKids = each(INVOLVED, megaItem);

  const topLink = (href, label) =>
    `<li class="ff-nav-link"><a class="heading-xs" href="${href}">${label}</a></li>`;

  return `<!--ff:chrome-nav-->
<nav class="nav-bar" id="site-nav" data-off-canvas="" aria-label="Main">
  <div data-component="Nav/NavBar"><span>
    <section class="theme-design-system-v1 nav-bar-section flex justify-between items-center">
      <div class="left-side flex">
        <a class="ff-lockup" href="/" aria-label="Flash Forward Foundation">
          <img class="ff-lockup-mark" src="/images/brand/mark-green.png" alt="" width="44" height="44">
          <span class="ff-lockup-name">
            <span class="ff-lockup-line">Flash Forward</span>
            <span class="ff-lockup-line ff-lockup-line--sub">Foundation</span>
          </span>
        </a>
        <ul class="nav-items">
          ${hasDropdown('Who we are', whoKids)}
          ${hasDropdown('Get involved', involvedKids)}
          ${topLink('/news/', 'News')}
        </ul>
      </div>
      <div class="right-side items-center ml-2">
        <a class="ff-nav-contact heading-xs" href="/contact/">Contact</a>
        <a class="donate-link button cw-button items-center px-4 py-2" href="/donate/">
          <div class="heading-xs">Donate</div>
        </a>
        <button type="button" class="off-canvas-toggle ff-menu-toggle" aria-label="Open menu" aria-controls="ff-offcanvas" aria-expanded="false">${svg('M3 5h18M3 12h18M3 19h18')}</button>
      </div>
    </section>
  </span></div>
</nav>
<nav class="right-off-canvas-menu ff-drawer" id="ff-offcanvas" aria-label="Mobile" aria-hidden="true">
  <div class="ff-drawer-top">
    <button type="button" class="ff-drawer-back" hidden>${CHEV_L}<span>Back</span></button>
    <a class="ff-drawer-donate" href="/donate/">Donate</a>
    <button type="button" class="ff-drawer-close" aria-label="Close menu">${CLOSE}</button>
  </div>
  <ul class="ff-drawer-panel is-active" data-panel="root">
    <li><button type="button" data-open="who"><span>Who we are</span>${CHEV_R}</button></li>
    <li><button type="button" data-open="involved"><span>Get involved</span>${CHEV_R}</button></li>
    <li><a href="/news/">News</a></li>
    <li><a href="/contact/">Contact</a></li>
  </ul>
  <ul class="ff-drawer-panel" data-panel="who" inert>
    ${each(WHO, drawerLink)}
  </ul>
  <ul class="ff-drawer-panel" data-panel="involved" inert>
    ${each(INVOLVED, drawerLink)}
  </ul>
</nav>
<div class="ff-drawer-scrim" hidden></div>
<!--/ff:chrome-nav-->
`;
}

export function footer() {
  const year = new Date().getFullYear();
  return `<!--ff:chrome-footer-->
<footer class="ff-bbg">
  <div class="ff-bbg-inner">
    <div class="ff-bbg-top">
      <a class="ff-lockup" href="/" aria-label="Flash Forward Foundation">
        <img class="ff-lockup-mark" src="/images/brand/mark-green.png" alt="" width="44" height="44">
        <span class="ff-lockup-name">
          <span class="ff-lockup-line">Flash Forward</span>
          <span class="ff-lockup-line ff-lockup-line--sub">Foundation</span>
        </span>
      </a>
      <ul class="ff-bbg-social">
        <li><a href="https://www.instagram.com/flashforwardfoundation/" target="_blank" rel="noopener" aria-label="Instagram"><svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><rect x="3.5" y="3.5" width="17" height="17" rx="4" fill="none" stroke="currentColor" stroke-width="1.6"/><circle cx="12" cy="12" r="4" fill="none" stroke="currentColor" stroke-width="1.6"/><circle cx="17.2" cy="6.8" r="0.9" fill="currentColor"/></svg></a></li>
        <li><a href="https://discord.gg/UnyvyxMYE" target="_blank" rel="noopener" aria-label="Discord"><svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><path fill="currentColor" d="M18.6 5.2A15 15 0 0 0 14.9 4l-.4.8a13.5 13.5 0 0 1 3.4 1.4 12 12 0 0 0-10 0A13 13 0 0 1 11.4 4.8L11 4a15 15 0 0 0-3.7 1.2C4.4 8.8 3.7 12.4 4 16a15 15 0 0 0 4.6 2.3l.7-1.1a10 10 0 0 1-1.6-.8l.4-.3a11 11 0 0 0 9.4 0l.4.3a10 10 0 0 1-1.6.8l.7 1.1A15 15 0 0 0 22 16c.4-4.1-.7-7.7-3.4-10.8zM9.3 14.6c-.9 0-1.6-.8-1.6-1.8s.7-1.8 1.6-1.8 1.6.8 1.6 1.8-.7 1.8-1.6 1.8zm5.4 0c-.9 0-1.6-.8-1.6-1.8s.7-1.8 1.6-1.8 1.6.8 1.6 1.8-.7 1.8-1.6 1.8z"/></svg></a></li>
        <li><a href="mailto:about@flashforwardfoundation.org" aria-label="Email"><svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><rect x="3" y="5.5" width="18" height="13" rx="1.5" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="M4 7l8 6 8-6" fill="none" stroke="currentColor" stroke-width="1.6"/></svg></a></li>
      </ul>
    </div>
    <div class="ff-bbg-mid">
      <div class="ff-bbg-cols">
        <div>
          <h2>Who we are</h2>
          ${each(WHO, footLink)}
        </div>
        <div>
          <h2>Get involved</h2>
          ${each(INVOLVED, footLink)}
        </div>
        <div>
          <h2>News</h2>
          <a href="/news/">News</a>
          <a href="/contact/">Contact</a>
        </div>
      </div>
      <aside class="ff-bbg-sub">
        <h2>Subscribe to our newsletter</h2>
        <form action="/contact/" method="get">
          <label for="ff-bbg-email">Email</label>
          <input id="ff-bbg-email" name="email" type="email" placeholder="Email address" autocomplete="email" required>
          <button type="submit">Sign up</button>
          <p>By submitting your email, you agree to the <a href="/privacy/">Flash Forward privacy policy</a>. You can unsubscribe at any time.</p>
        </form>
      </aside>
    </div>
    <div class="ff-bbg-legal">
      <div class="ff-bbg-legal-row">
        <p>© ${year} Flash Forward Foundation, 1402 153rd Pl SE, Bellevue, WA 98007. A US 501(c)(3) public charity, EIN 39-3605570.</p>
        <p>Gifts are preference-based. Placement is best effort.</p>
      </div>
      <div class="ff-bbg-legal-row ff-bbg-legal-row--sub">
        <a href="/nonprofit-status/">Nonprofit Status</a>
        <a href="/faq/">FAQ</a>
        <a href="/privacy/">Privacy</a>
        <a href="/terms/">Terms of Use</a>
      </div>
    </div>
  </div>
</footer>
<!--/ff:chrome-footer-->
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
