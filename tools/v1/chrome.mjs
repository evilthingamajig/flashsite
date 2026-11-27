/** Shared v1 chrome — real charity:water nav/footer DOM structure + FF labels. */
export const CSS = 'ff.css,cw-chrome.css';

const ARROW = `<img class="ml-3" width="20" height="20" alt="" src="data:image/svg+xml,%3csvg fill='none' height='20' viewBox='0 0 20 20' width='20' xmlns='http://www.w3.org/2000/svg'%3e%3ccircle cx='10' cy='10' fill='%232f8f5b' r='9.5' stroke='%23383b36'/%3e%3cpath clip-rule='evenodd' d='m11.2144 7.16746c-.2635-.27559-.2537-.7126.0219-.97609s.7126-.25367.9761.02192l3.0962 3.23849c.2596.27149.2545.70072-.0115.96592l-3.0962 3.0879c-.27.2692-.7071.2686-.9763-.0014-.2693-.2699-.2687-.7071.0013-.9763l2.006-2.0006h-7.04151c-.38129 0-.69038-.3091-.69038-.69035 0-.38129.30909-.69038.69038-.69038h6.91621z' fill='%231a1a1a' fill-rule='evenodd'/%3e%3c/svg%3e">`;

const ARROW_LG = `<img width="20" height="20" alt="" src="data:image/svg+xml,%3csvg fill='none' height='20' viewBox='0 0 20 20' width='20' xmlns='http://www.w3.org/2000/svg'%3e%3ccircle cx='10' cy='10' fill='%232f8f5b' r='9.5' stroke='%23383b36'/%3e%3cpath clip-rule='evenodd' d='m11.2144 7.16746c-.2635-.27559-.2537-.7126.0219-.97609s.7126-.25367.9761.02192l3.0962 3.23849c.2596.27149.2545.70072-.0115.96592l-3.0962 3.0879c-.27.2692-.7071.2686-.9763-.0014-.2693-.2699-.2687-.7071.0013-.9763l2.006-2.0006h-7.04151c-.38129 0-.69038-.3091-.69038-.69035 0-.38129.30909-.69038.69038-.69038h6.91621z' fill='%231a1a1a' fill-rule='evenodd'/%3e%3c/svg%3e">`;

function megaItem(href, title, desc) {
  return `<li class="masthead__item masthead__item--depth-1"><a class="masthead__link masthead__link--depth-1" href="${href}"><span class="masthead__item-text">${title}</span><span class="masthead__item-description">${desc}</span></a></li>`;
}

function subnavItem(href, title, desc) {
  return `<a class="subnav-item bg-cw-brand-yellow-300 flex items-center justify-between p-2 my-5" href="${href}"><div class="mr-2"><div class="heading-m mb-1">${title}</div><div class="body-m">${desc}</div></div>${ARROW_LG}</a>`;
}

function hasDropdown(label, blurb, childrenHtml) {
  return `<li class="has-dropdown masthead__item masthead__item--dropdown-mega"><span class="nav-hover-extender absolute bg-transparent z-10"></span><span class="flex items-center dropdown-parent-link"><button type="button" class="heading-xs relative z-20 mr-4" aria-expanded="false">${label}</button><span class="h80 icn cw-icon-chevron-down"></span></span><div class="dropdown masthead__dropdown masthead__dropdown--mega"><div class="ff-mega-cols"><p class="ff-mega-blurb">${blurb}</p><ul class="masthead__items ff-mega-grid">${childrenHtml}</ul></div></div></li>`;
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
    megaItem('/our-model/', 'Our Model hub', 'How study light becomes study time'),
    megaItem('/our-model/why-light/', 'Why Light &amp; Learning', 'Darkness cuts study short — light unlocks hours'),
    megaItem('/our-model/study-unlock-pathway/', 'Study Unlock Pathway', 'The four verbs behind every light'),
    megaItem('/our-model/the-study-light/', 'The Study Light', '≈ $5.17 in parts — solar charged'),
    megaItem('/our-model/made-and-delivered/', 'Made &amp; Delivered', 'Assembly and distribution partners'),
    megaItem('/our-model/for-students/', 'For Students, By Students', 'Unpaid student leadership of the org'),
  ].join('');

  const impactKids = [
    megaItem('/impact/', 'Impact hub', 'Proof with honesty'),
    megaItem('/impact/outcomes/', 'Outcomes &amp; method', 'How we estimate study hours'),
    megaItem('/impact/reports/', 'Reports &amp; Financials', '990s, letters, and transparency'),
    megaItem('/impact-stories/', 'Impact Stories', 'Prefer a school, community, or region'),
  ].join('');

  const involvedKids = [
    megaItem('/join/internships/', 'Internships', 'Marketing · Partnerships · Fundraising'),
    megaItem('/join/open-roles/', 'Open roles', 'Unpaid student leadership seats'),
    megaItem('/join/apply/', 'Apply', 'Start an application'),
    megaItem('/donate/', 'Donate', 'Give in flashlight units (~$5.17)'),
    megaItem('/donate/study-circle/', 'Study Circle', 'Monthly giving that keeps the pathway funded'),
    megaItem('/get-involved/ambassadors/', 'Ambassadors', 'Soft campus and community voice'),
    megaItem('/get-involved/partners/', 'Partner with us', 'Assemble or place Study Lights'),
    megaItem('/get-involved/partners/assembly/', 'Assembly partners', 'Print, solder, and ship a batch'),
    megaItem('/get-involved/partners/distribution/', 'Distribution partners', 'Place lights with students you serve'),
  ].join('');

  const aboutKids = [
    megaItem('/about/', 'Our Story', 'How Flash Forward started'),
    megaItem('/about/team/', 'Leadership', 'Board and open unpaid seats'),
    megaItem('/nonprofit-status/', 'Nonprofit Status', 'Determination letter and trust cues'),
    megaItem('/faq/', 'FAQs', 'Straight answers'),
    megaItem('/news/', 'News', 'Updates from the pathway'),
    megaItem('/contact/', 'Contact', 'Reach the team'),
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

  const offInvolved = [
    `<a class="cw-link--primary" href="/get-involved/">Get involved</a>`,
    subnavItem('/join/internships/', 'Internships', 'Marketing · Partnerships · Fundraising.'),
    subnavItem('/join/apply/', 'Apply', 'Start an application.'),
    subnavItem('/donate/', 'Donate', 'Give in flashlight units (~$5.17).'),
    subnavItem('/donate/study-circle/', 'Study Circle', 'Monthly giving that keeps the pathway funded.'),
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
          ${hasDropdown('Our Model', 'Study lights become study hours. Design, assemble, deliver, unlock.', modelKids)}
          ${hasDropdown('Impact', 'Proof with honesty — study hours, stories, and the reports behind them.', impactKids)}
          ${hasDropdown('Get Involved', 'Join the team, give, or partner on assembly and delivery.', involvedKids)}
          ${hasDropdown('About', 'A student-led 501(c)(3) in Bellevue. The people, the status, and the answers.', aboutKids)}
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
  const year = new Date().getFullYear();
  return `<!--ff:chrome-footer-->
<footer class="cw-footer no-top-border">
  <div class="mailing-list-and-info w-full bg-grey-5 text-center flex flex-col border-b border-r border-l border-solid border-0 border-grey-30 rounded-b items-center theme-maji">
    <div class="optional-text normal-case pb-2 text-cw-black">
      <h6 class="h70">Add impact to your inbox</h6>
      <p class="p40">Get our emails to stay in the know.</p>
    </div>
    <div class="lead-form-wrapper theme-maji" style="line-height:0">
      <form class="m-auto text-center w-full" action="/contact/" method="get">
        <div class="md-flex">
          <div class="mailing-input-names md-flex md-justify-center max-w-xs mx-auto">
            <div class="mailing-input-wrapper name first md-flex-1">
              <label class="for-screen-readers-only" for="ff-foot-name">First name</label>
              <input id="ff-foot-name" name="name" placeholder="First Name" type="text">
            </div>
            <div class="mailing-input-wrapper surname mt-2 md-mt-0 md-flex-1">
              <label class="for-screen-readers-only" for="ff-foot-surname">Last name</label>
              <input id="ff-foot-surname" name="surname" placeholder="Last Name" type="text">
            </div>
          </div>
          <div class="mailing-input-wrapper email max-w-xs mt-2 mx-auto md-mt-0 second">
            <label class="for-screen-readers-only" for="ff-foot-email">Email</label>
            <input id="ff-foot-email" name="email" placeholder="Email" type="email">
          </div>
          <button class="button button--expand mailing-list-sign-up-button max-w-xs mx-auto mt-2 md-mt-0" type="submit">Sign up</button>
        </div>
      </form>
    </div>
  </div>

  <div class="cw-footer-top-row border-b border-solid border-0 border-grey-30 my-3">
    <ul class="mt-0 mb-4 pr-2 w-1/2 md-w-1/4">
      <li class="cw-footer-header">Our model</li>
      <li><a href="/our-model/why-light/">Why light &amp; learning</a></li>
      <li><a href="/our-model/study-unlock-pathway/">Study Unlock Pathway</a></li>
      <li><a href="/our-model/the-study-light/">The study light</a></li>
      <li><a href="/our-model/made-and-delivered/">Made &amp; delivered</a></li>
      <li><a href="/our-model/for-students/">For students, by students</a></li>
    </ul>
    <ul class="mt-0 mb-4 pr-2 w-1/2 md-w-1/4">
      <li class="cw-footer-header">Impact</li>
      <li><a href="/impact/outcomes/">Outcomes &amp; how we measure</a></li>
      <li><a href="/impact/reports/">Reports &amp; financials</a></li>
      <li><a href="/impact-stories/">Impact stories</a></li>
      <li><a href="/impact-stories/sponsor/">Sponsor a story</a></li>
    </ul>
    <ul class="mt-0 mb-2 pr-2 w-1/2 md-w-1/4">
      <li class="cw-footer-header">Get involved</li>
      <li><a href="/join/internships/">Internships</a></li>
      <li><a href="/join/open-roles/">Open roles</a></li>
      <li><a href="/join/apply/">Apply</a></li>
      <li><a href="/donate/">Donate</a></li>
      <li><a href="/donate/study-circle/">Study Circle</a></li>
      <li><a href="/get-involved/ambassadors/">Ambassadors</a></li>
      <li><a href="/get-involved/partners/">Partner with us</a></li>
    </ul>
    <ul class="mt-0 mb-4 pr-2 w-1/2 md-w-1/4">
      <li class="cw-footer-header">About</li>
      <li><a href="/about/">Our story</a></li>
      <li><a href="/about/team/">Leadership</a></li>
      <li><a href="/nonprofit-status/">Nonprofit status</a></li>
      <li><a href="/faq/">FAQs</a></li>
      <li><a href="/news/">News</a></li>
      <li><a href="/contact/">Contact</a></li>
    </ul>
  </div>

  <div class="max-w-xl mx-auto flex flex-col lg-flex-row mt-0">
    <div class="w-full lg-w-3/4">
      <div class="row">
        <ul class="mx-auto justify-center lg-justify-start flex">
          <li class="cw-footer-social-instagram mr-2">
            <a class="text-base" href="https://www.instagram.com/flashforwardfoundation/" target="_blank" rel="noopener" aria-label="Instagram">
              <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true"><path fill="#036" d="M7 3h10a4 4 0 0 1 4 4v10a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4V7a4 4 0 0 1 4-4zm5 4.5A4.5 4.5 0 1 0 16.5 12 4.5 4.5 0 0 0 12 7.5zm6.2-.9a1.1 1.1 0 1 0 1.1 1.1 1.1 1.1 0 0 0-1.1-1.1zM12 9.2A2.8 2.8 0 1 1 9.2 12 2.8 2.8 0 0 1 12 9.2z"/></svg>
            </a>
          </li>
          <li class="cw-footer-social-linkedin">
            <a href="https://discord.gg/UnyvyxMYE" target="_blank" rel="noopener" aria-label="Discord">
              <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true"><path fill="#036" d="M19.3 5.2A16 16 0 0 0 15.1 4l-.4.8a14.6 14.6 0 0 1 3.7 1.1 12.8 12.8 0 0 0-11 0A14 14 0 0 1 11.2 4.8L10.8 4a16 16 0 0 0-4.2 1.2C3.4 9.3 2.6 13.3 3 17.2a16.4 16.4 0 0 0 5 2.5l.6-1a10.7 10.7 0 0 1-1.7-.8l.4-.3a11.7 11.7 0 0 0 10.2 0l.4.3a10.7 10.7 0 0 1-1.7.8l.6 1a16.4 16.4 0 0 0 5-2.5c.5-4.5-.8-8.5-3.5-12zM9.2 15.1c-1 0-1.8-.9-1.8-2s.8-2 1.8-2 1.8.9 1.8 2-.8 2-1.8 2zm5.6 0c-1 0-1.8-.9-1.8-2s.8-2 1.8-2 1.8.9 1.8 2-.8 2-1.8 2z"/></svg>
            </a>
          </li>
        </ul>
      </div>
      <div class="row mt-1">
        <ul class="my-0 mt-0 flex justify-center lg-justify-start flex-col md-flex-row text-center cw-footer-secondary-links">
          <li class="pl-0"><a class="cw-footer-emph" href="/privacy/">Privacy policy</a></li>
          <li><a class="cw-footer-emph" href="/terms/">Terms</a></li>
          <li><a class="cw-footer-emph" href="/accessibility/">Accessibility</a></li>
        </ul>
      </div>
    </div>
    <div class="mx-auto mt-2 lg-mt-0 w-full max-w-xs footer-country-container lg-w-1/4">
      <div class="input-wrapper country-f mb-0 theme-maji">
        <div>
          <span class="bg-center bg-no-repeat bg-contain preinput ml-1 w-4 h-4" style="background-image:url(https://www.charitywater.org/vite/assets/us-flag-BM09-wqq.svg)"></span>
          <select class="country-footer pl-3" name="country" aria-label="Currency">
            <option value="us">United States dollar</option>
          </select>
        </div>
      </div>
    </div>
  </div>

  <div class="max-w-xl mx-auto text-center lg-text-left mt-2 flex flex-col lg-flex-row lg-justify-between items-center">
    <div class="lg-mt-0">
      <p class="h80 text-grey-50 normal-case">Flash Forward Foundation is a student-led 501(c)(3) nonprofit organization.</p>
      <ul class="my-0 mt-1 flex justify-center lg-justify-start flex-col md-flex-row text-center cw-footer-secondary-links">
        <li><a class="cw-footer-emph" href="/nonprofit-status/trust/">Gifts are preference-based. Placement is best effort.</a></li>
        <li class="footer-email-signup-link"><a class="cw-footer-emph" href="/contact/">Get our emails</a></li>
      </ul>
    </div>
  </div>

  <div class="max-w-xl mx-auto text-center lg-text-left mt-2">
    <p class="h80 mt-1 text-grey-50 normal-case">
      <span>© ${year} Flash Forward Foundation, 1402 153rd Pl SE, Bellevue, WA 98007. A US 501(c)(3) public charity, EIN 39-3605570. about@flashforwardfoundation.org</span>
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
