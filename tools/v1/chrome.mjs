/** Shared v1 chrome — real charity:water nav/footer DOM structure + FF labels. */
export const CSS = 'ff.css,cw-chrome.css';

const ARROW = `<img class="ml-3" width="20" height="20" alt="" src="data:image/svg+xml,%3csvg fill='none' height='20' viewBox='0 0 20 20' width='20' xmlns='http://www.w3.org/2000/svg'%3e%3ccircle cx='10' cy='10' fill='%232f8f5b' r='9.5' stroke='%23383b36'/%3e%3cpath clip-rule='evenodd' d='m11.2144 7.16746c-.2635-.27559-.2537-.7126.0219-.97609s.7126-.25367.9761.02192l3.0962 3.23849c.2596.27149.2545.70072-.0115.96592l-3.0962 3.0879c-.27.2692-.7071.2686-.9763-.0014-.2693-.2699-.2687-.7071.0013-.9763l2.006-2.0006h-7.04151c-.38129 0-.69038-.3091-.69038-.69035 0-.38129.30909-.69038.69038-.69038h6.91621z' fill='%231a1a1a' fill-rule='evenodd'/%3e%3c/svg%3e">`;

const ARROW_LG = `<img width="20" height="20" alt="" src="data:image/svg+xml,%3csvg fill='none' height='20' viewBox='0 0 20 20' width='20' xmlns='http://www.w3.org/2000/svg'%3e%3ccircle cx='10' cy='10' fill='%232f8f5b' r='9.5' stroke='%23383b36'/%3e%3cpath clip-rule='evenodd' d='m11.2144 7.16746c-.2635-.27559-.2537-.7126.0219-.97609s.7126-.25367.9761.02192l3.0962 3.23849c.2596.27149.2545.70072-.0115.96592l-3.0962 3.0879c-.27.2692-.7071.2686-.9763-.0014-.2693-.2699-.2687-.7071.0013-.9763l2.006-2.0006h-7.04151c-.38129 0-.69038-.3091-.69038-.69035 0-.38129.30909-.69038.69038-.69038h6.91621z' fill='%231a1a1a' fill-rule='evenodd'/%3e%3c/svg%3e">`;

function dropChild(href, title, desc) {
  return `<div class="dropdown-child"><a class="text-cw-brand-grey-900 no-underline" href="${href}"><div class="px-3 py-5"><div class="header flex items-center"><div class="text-sm font-medium">${title}</div>${ARROW}</div><div class="dropdown-child-description body-s mt-2 font-normal">${desc}</div></div></a></div>`;
}

function subnavItem(href, title, desc) {
  return `<a class="subnav-item bg-cw-brand-yellow-300 flex items-center justify-between p-2 my-5" href="${href}"><div class="mr-2"><div class="heading-m mb-1">${title}</div><div class="body-m">${desc}</div></div>${ARROW_LG}</a>`;
}

function hasDropdown(href, label, childrenHtml) {
  return `<li class="has-dropdown"><span class="nav-hover-extender absolute bg-transparent z-10"></span><span class="flex items-center dropdown-parent-link"><a class="heading-xs relative z-20 mr-4" href="${href}">${label}</a><span class="h80 icn cw-icon-chevron-down"></span></span><span class="dropdown leading-normal left-0 rounded">${childrenHtml}</span></li>`;
}

function offSection(label, childrenHtml) {
  return `<li class="nav-section p-6 border-b border-solid border-grey-50"><div class="nav-section-header flex items-center justify-between cursor-pointer"><div class="heading-xs">${label}</div><span class="icn cw-icon-plus-sm bg-cw-white border border-cw-brand-grey-800 rounded-full flex items-center justify-center"></span></div><div class="subnav mt-8">${childrenHtml}</div></li>`;
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

export function nav(active = '') {
  const modelKids = [
    dropChild('/our-model/', 'Our Model hub', 'How study light becomes study time'),
    dropChild('/our-model/why-light/', 'Why Light &amp; Learning', 'Darkness cuts study short — light unlocks hours'),
    dropChild('/our-model/study-unlock-pathway/', 'Study Unlock Pathway', 'The four verbs behind every light'),
    dropChild('/our-model/the-study-light/', 'The Study Light', '≈ $5.17 in parts — solar charged'),
    dropChild('/our-model/made-and-delivered/', 'Made &amp; Delivered', 'Assembly and distribution partners'),
    dropChild('/our-model/for-students/', 'For Students, By Students', 'Unpaid student leadership of the org'),
  ].join('');

  const impactKids = [
    dropChild('/impact/', 'Impact hub', 'Proof with honesty'),
    dropChild('/impact/outcomes/', 'Outcomes &amp; method', 'How we estimate study hours'),
    dropChild('/impact/reports/', 'Reports &amp; Financials', '990s, letters, and transparency'),
    dropChild('/impact-stories/', 'Impact Stories', 'Prefer a school, community, or region'),
  ].join('');

  const joinKids = [
    dropChild('/join/', 'Join hub', 'Work with us'),
    dropChild('/join/internships/', 'Internships', 'Marketing · Partnerships · Fundraising'),
    dropChild('/join/open-roles/', 'Open roles', 'Unpaid student leadership seats'),
    dropChild('/join/apply/', 'Apply', 'Start an application'),
  ].join('');

  const involvedKids = [
    dropChild('/donate/', 'Donate', 'Give in flashlight units (~$5.17)'),
    dropChild('/donate/#study-circle', 'Study Circle', 'Monthly giving that keeps the pathway funded'),
    dropChild('/impact-stories/', 'Impact Stories', 'Preference-based giving — best effort'),
    dropChild('/get-involved/ambassadors/', 'Ambassadors', 'Soft campus and community voice'),
    dropChild('/get-involved/partners/', 'Partner with us', 'Assemble or place Study Lights'),
    dropChild('/get-involved/legacy-giving/', 'Legacy giving', 'Leave study hours in your estate plan'),
  ].join('');

  const aboutKids = [
    dropChild('/about/', 'Our Story', 'How Flash Forward started'),
    dropChild('/about/team/', 'Leadership', 'Board and open unpaid seats'),
    dropChild('/nonprofit-status/', 'Nonprofit Status', 'Determination letter and trust cues'),
    dropChild('/faq/', 'FAQs', 'Straight answers'),
    dropChild('/news/', 'News', 'Updates from the pathway'),
    dropChild('/contact/', 'Contact', 'Reach the team'),
  ].join('');

  const offModel = [
    `<a class="cw-link--primary" href="/our-model/">Explore our model</a>`,
    subnavItem('/our-model/why-light/', 'Why Light &amp; Learning', 'Darkness cuts study short — light unlocks hours.'),
    subnavItem('/our-model/the-study-light/', 'The Study Light', '≈ $5.17 in parts — solar charged.'),
    subnavItem('/our-model/study-unlock-pathway/', 'Study Unlock Pathway', 'Design → Assemble → Deliver → Unlock.'),
  ].join('');

  const offImpact = [
    `<a class="cw-link--primary" href="/impact/">Explore impact</a>`,
    subnavItem('/impact/outcomes/', 'Outcomes &amp; method', 'How we estimate study hours.'),
    subnavItem('/impact/reports/', 'Reports &amp; Financials', '990s, letters, and transparency.'),
    subnavItem('/impact-stories/', 'Impact Stories', 'Prefer a school, community, or region.'),
  ].join('');

  const offJoin = [
    `<a class="cw-link--primary" href="/join/">Explore joining</a>`,
    subnavItem('/join/internships/', 'Internships', 'Marketing · Partnerships · Fundraising.'),
    subnavItem('/join/open-roles/', 'Open roles', 'Unpaid student leadership seats.'),
    subnavItem('/join/apply/', 'Apply', 'Start an application.'),
  ].join('');

  const offInvolved = [
    `<a class="cw-link--primary" href="/get-involved/">Get involved</a>`,
    subnavItem('/donate/', 'Donate', 'Give in flashlight units (~$5.17).'),
    subnavItem('/donate/#study-circle', 'Study Circle', 'Monthly giving that keeps the pathway funded.'),
    subnavItem('/get-involved/partners/', 'Partner with us', 'Assemble or place Study Lights.'),
  ].join('');

  const offAbout = [
    `<a class="cw-link--primary" href="/about/">About Flash Forward</a>`,
    subnavItem('/about/team/', 'Leadership', 'Board and open unpaid seats.'),
    subnavItem('/nonprofit-status/', 'Nonprofit Status', 'EIN 39-3605570.'),
    subnavItem('/faq/', 'FAQs', 'Straight answers.'),
  ].join('');

  return `<!--ff:chrome-nav-->
<nav class="nav-bar" id="site-nav" data-off-canvas="" aria-label="Main">
  <div data-component="Nav/NavBar"><span>
    <section class="theme-design-system-v1 nav-bar-section flex justify-between items-center">
      <div class="left-side flex">
        <ul class="mobile-nav-items flex items-center lg-hidden">
          <a class="offcanvas-open-link off-canvas-toggle icn mr-6 cw-icon-reorder-thin" href="#" role="button" aria-label="Open menu" aria-controls="ff-offcanvas" aria-expanded="false"></a>
          <a href="/"><img class="md-hidden" src="/images/brand/mark-green-104.png" alt="Flash Forward Foundation" width="26" height="34"></a>
        </ul>
        <ul class="logo-area md-block">
          <a href="/" aria-label="Flash Forward Foundation home">
            <li class="logo"></li>
            <span class="ff-logo-wordmark">Flash Forward<br>Foundation</span>
          </a>
        </ul>
        <ul class="nav-items">
          ${hasDropdown('/our-model/', 'Our Model', modelKids)}
          ${hasDropdown('/impact/', 'Impact', impactKids)}
          ${hasDropdown('/join/', 'Join', joinKids)}
          ${hasDropdown('/get-involved/', 'Get Involved', involvedKids)}
          ${hasDropdown('/about/', 'About', aboutKids)}
        </ul>
      </div>
      <div class="right-side items-center ml-2">
        <div class="mycw-nav theme-design-system-v1">
          <div class="has-form user-access">
            <a class="log-in" href="/contact/">Contact</a>
          </div>
        </div>
        <a class="donate-link button cw-button items-center px-4 py-2 ml-4 md-ml-10" href="/donate/">
          <div class="heading-xs">Donate</div>
        </a>
      </div>
    </section>
  </span></div>
</nav>
<nav class="right-off-canvas-menu theme-design-system-v1 bg-cw-brand-yellow-100" id="ff-offcanvas" aria-label="Mobile">
  <ul class="off-canvas-list">
    ${offSection('Our Model', offModel)}
    ${offSection('Impact', offImpact)}
    ${offSection('Join', offJoin)}
    ${offSection('Get Involved', offInvolved)}
    ${offSection('About', offAbout)}
    <div class="p-6 pt-8">
      <a class="flex items-center mb-5" href="/contact/"><div class="icon cw-icon-mail-outline mr-2"></div><div class="heading-s">Contact us</div></a>
      <a class="flex items-center" href="/donate/"><div class="icon cw-icon-user-outline mr-2"></div><div class="heading-s">Donate</div></a>
    </div>
  </ul>
</nav>
<!--/ff:chrome-nav-->
`;
}

export function footer() {
  return `<!--ff:chrome-footer-->
<footer class="cw-footer no-top-border">
  <div class="mailing-list-and-info w-full bg-grey-5 text-center flex flex-col border-b border-r border-l border-solid border-0 border-grey-30 rounded-b items-center theme-maji">
    <div class="optional-text normal-case pb-2 text-cw-black">
      <h6 class="h70">Add impact to your inbox</h6>
      <p class="p40">Occasional updates on Study Lights, partners, and study hours unlocked — no spam.</p>
    </div>
    <div class="lead-form-wrapper theme-maji" style="line-height:0">
      <div class="m-auto text-center w-full" style="padding-top:12px">
        <a class="button button--expand mailing-list-sign-up-button max-w-xs mx-auto mt-2" href="/contact/">Get updates</a>
      </div>
    </div>
  </div>

  <div class="cw-footer-top-row border-b border-solid border-0 border-grey-30 my-3">
    <ul class="mt-0 mb-4 pr-2 w-1/2 md-w-1/4">
      <li class="cw-footer-header">Our Model</li>
      <li><a href="/our-model/why-light/">Why Light &amp; Learning</a></li>
      <li><a href="/our-model/study-unlock-pathway/">Study Unlock Pathway</a></li>
      <li><a href="/our-model/the-study-light/">The Study Light</a></li>
      <li><a href="/our-model/made-and-delivered/">Made &amp; Delivered</a></li>
    </ul>
    <ul class="mt-0 mb-2 pr-2 w-1/2 md-w-1/4">
      <li class="cw-footer-header">Impact</li>
      <li><a href="/impact/outcomes/">Outcomes</a></li>
      <li><a href="/impact/reports/">Reports</a></li>
      <li><a href="/impact-stories/">Impact Stories</a></li>
      <li><a href="/news/">News</a></li>
    </ul>
    <ul class="mt-0 mb-4 pr-2 w-1/2 md-w-1/4">
      <li class="cw-footer-header">Join</li>
      <li><a href="/join/internships/">Internships</a></li>
      <li><a href="/join/open-roles/">Open roles</a></li>
      <li><a href="/join/apply/">Apply</a></li>
      <li><a href="/get-involved/partners/">Partners</a></li>
    </ul>
    <ul class="mt-0 mb-4 pr-2 w-1/2 md-w-1/4">
      <li class="cw-footer-header">About</li>
      <li><a href="/about/">Our Story</a></li>
      <li><a href="/about/team/">Leadership</a></li>
      <li><a href="/nonprofit-status/">Nonprofit Status</a></li>
      <li><a href="/faq/">FAQs</a></li>
      <li><a href="/contact/">Contact</a></li>
      <li><a href="/donate/">Donate</a></li>
    </ul>
  </div>

  <div class="max-w-xl mx-auto flex flex-col lg-flex-row mt-0">
    <div class="w-full lg-w-3/4">
      <div class="row">
        <ul class="mx-auto justify-center lg-justify-start flex">
          <li class="cw-footer-social-instagram mr-2">
            <a class="text-base" href="https://www.instagram.com/flashforwardfoundation/" target="_blank" rel="noopener" aria-label="Instagram">
              <span class="cw-icon-instagram icn"><span class="for-screen-readers-only">Instagram</span></span>
            </a>
          </li>
          <li class="cw-footer-social-linkedin">
            <a href="https://discord.gg/UnyvyxMYE" target="_blank" rel="noopener" aria-label="Discord">
              <span class="cw-icon-linkedin icn"><span class="for-screen-readers-only">Discord</span></span>
            </a>
          </li>
        </ul>
      </div>
      <div class="row mt-1">
        <ul class="my-0 mt-0 flex justify-center lg-justify-start flex-col md-flex-row text-center cw-footer-secondary-links">
          <li class="pl-0"><a class="cw-footer-emph" href="/privacy/">Privacy policy</a></li>
          <li><a class="cw-footer-emph" href="/terms/">Terms</a></li>
          <li><a class="cw-footer-emph" href="/accessibility/">Accessibility</a></li>
          <li><a class="cw-footer-emph" href="/site-map/">Site map</a></li>
        </ul>
      </div>
    </div>
  </div>

  <div class="max-w-xl mx-auto text-center lg-text-left mt-2 flex flex-col lg-flex-row lg-justify-between items-center">
    <div class="lg-mt-0">
      <p class="h80 text-grey-50 normal-case">Flash Forward Foundation is a student-led 501(c)(3) nonprofit organization.</p>
      <ul class="my-0 mt-1 flex justify-center lg-justify-start flex-col md-flex-row text-center cw-footer-secondary-links">
        <li><a class="cw-footer-emph" href="/nonprofit-status/">EIN 39-3605570 · Bellevue, WA</a></li>
        <li class="footer-email-signup-link"><a class="cw-footer-emph" href="/contact/">Get our emails</a></li>
      </ul>
    </div>
  </div>

  <div class="max-w-xl mx-auto text-center lg-text-left mt-2">
    <p class="h80 mt-1 text-grey-50 normal-case">
      <span>© ${new Date().getFullYear()} Flash Forward Foundation. Student-run. Study lights → study hours.</span>
    </p>
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
