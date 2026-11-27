// Contact and news layouts adapted to the references supplied for these pages.
// Article titles, descriptions and publication labels stay with their source articles.
import { readFileSync, writeFileSync } from 'node:fs';
import { head, nav, footer } from './chrome.mjs';

const esc = (s) => s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const unesc = (s) => s.replace(/&amp;/g, '&').replace(/&#39;|&#039;|&apos;/g, "'").replace(/&quot;/g, '"');
const arrow = '<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><path d="M4 12h16m-6-6 6 6-6 6"/></svg>';
function page(path, title, description, bodyClass, css, main, script = '') {
  let html = head({ title: `${title} | Flash Forward Foundation`, description, canonical: path, bodyClass });
  html = html.replace('ff.css,cw-chrome.css', `ff.css,cw-chrome.css,${css}`);
  html += nav() + `<main id="main" class="ff-main">${main}</main>` + footer();
  if (script) html = html.replace('</body>', `<script src="${script}" defer></script>\n</body>`);
  writeFileSync(`.${path}index.html`, html);
}

const faqs = [
  ['What does Flash Forward Foundation do?', 'We are a student-led nonprofit working to help students study after dark. We design solar study lights, work with assembly partners to build them, and place them through local distribution partners. <a href="/impact/">See our impact</a>.'],
  ['How can my organization partner with you?', 'We work with organizations that can help build lights or place them with students. Tell us about your organization, location, and the kind of partnership you have in mind. You can also read about <a href="/get-involved/partners/assembly/">assembly partnerships</a> and <a href="/get-involved/partners/distribution/">distribution partnerships</a>.'],
  ['How do I apply for an internship?', 'Use our <a href="/join/apply/">internship application</a> to tell us about your interests and experience. Internship applications have their own form, so you do not need to submit your application through this contact page.'],
  ['Who decides which students receive the lights?', 'Our distribution partners know the schools and communities they serve. Each partner decides who receives a light. Flash Forward provides the lights to partners free of charge.'],
  ['How can I support the work?', 'You can <a href="/donate/">make a donation</a>, <a href="/news/start-a-fundraiser/">start a fundraiser</a>, or help us connect with a potential assembly or distribution partner.'],
  ['Can I share a student or partner story?', 'Yes. Use the <a href="/impact-stories/share/">Share your story</a> page to prepare an email for our team to review. Please get permission from anyone whose story or photo you include. Stories are reviewed before publication.'],
  ['Where can I find your nonprofit information?', 'Flash Forward Foundation is a US 501(c)(3) public charity, EIN 39-3605570. Our <a href="/nonprofit-status/">Nonprofit Status page</a> has more information.'],
];

page('/contact/', 'Contact Us', 'Contact Flash Forward Foundation about partnerships, internships, donations, press, or a story from your community.', 'ff-page-contact', 'ff-contact.css', `
  <section class="ff-contact-top ff-contact-wrap" aria-labelledby="contact-heading">
    <div class="ff-contact-primary">
      <p class="ff-contact-kicker">Contact us</p>
      <h1 id="contact-heading">Get in touch.</h1>
      <p class="ff-contact-intro">Have a question, an idea, or a connection that could help more students study after dark? Fill out the form below and our team will get back to you.</p>
      <form id="ff-contact-form" class="ff-contact-form" action="https://formspree.io/f/xdegjjor" method="post">
        <input type="hidden" name="_subject" value="Flash Forward Foundation — Contact inquiry">
        <div class="ff-contact-trap" aria-hidden="true"><label for="contact-website">Leave this field empty</label><input id="contact-website" name="_gotcha" type="text" tabindex="-1" autocomplete="off"></div>
        <div class="ff-contact-name-row">
          <div><label for="contact-first-name">First name</label><input id="contact-first-name" name="first_name" autocomplete="given-name" maxlength="100" required></div>
          <div><label for="contact-last-name">Last name</label><input id="contact-last-name" name="last_name" autocomplete="family-name" maxlength="100" required></div>
        </div>
        <div><label for="contact-email">Email</label><input id="contact-email" name="email" type="email" autocomplete="email" maxlength="254" required></div>
        <div><label for="contact-topic">What would you like to talk about?</label><select id="contact-topic" name="topic" required><option value="" selected disabled>Select a topic</option><option>Partnerships</option><option>Internships</option><option>Donations and fundraising</option><option>Press and media</option><option>Sharing a story</option><option>Something else</option></select></div>
        <div><label for="contact-message">Message</label><textarea id="contact-message" name="message" rows="5" maxlength="10000" required></textarea></div>
        <p class="ff-contact-privacy">By submitting this form, you agree that we may use your information to respond to your message in accordance with our <a href="/privacy/">Privacy Policy</a>.</p>
        <button class="ff-contact-button" type="submit">Send message</button>
      </form>
    </div>
    <aside class="ff-contact-aside" aria-label="Other ways to connect">
      <div><h2>Looking for an answer?</h2><p>Find answers to common questions about our work, partnerships, and ways to get involved.</p><a class="ff-contact-text-link" href="#contact-faq">Visit our FAQs ${arrow}</a></div>
      <div><h2>Talk with us</h2><p>Prefer email? Reach the Flash Forward team directly.</p><a class="ff-contact-email" href="mailto:about@flashforwardfoundation.org">about@flashforwardfoundation.org</a><p class="ff-contact-location">Based in Bellevue, Washington.<br>Working with partners across borders.</p></div>
    </aside>
  </section>
  <section id="contact-faq" class="ff-contact-faq ff-contact-wrap" aria-labelledby="contact-faq-heading">
    <div class="ff-contact-faq-heading"><span class="ff-contact-faq-label">FAQ</span><h2 id="contact-faq-heading">Frequently<br>asked questions</h2><p>A few answers about Flash Forward<br class="ff-contact-desktop-br"> and how you can be part of the work.</p></div>
    <div class="ff-contact-questions">${faqs.map(([q, a]) => `<details><summary>${q}<svg viewBox="0 0 20 20" width="20" height="20" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8"><path d="m5 8 5 5 5-5"/></svg></summary><div class="ff-contact-answer"><p>${a}</p></div></details>`).join('')}</div>
  </section>
  <section class="ff-contact-next ff-contact-wrap" aria-label="Get involved">
    <div><h2>Interested in<br>partnering?</h2><p>Bring your school, club, or organization into the work.</p><a class="ff-contact-button" href="/get-involved/partners/assembly/">Build lights with us</a><a class="ff-contact-small-link" href="/get-involved/partners/distribution/">Explore distribution partnerships ${arrow}</a></div>
    <div><h2>Ready for<br>an internship?</h2><p>Put your skills to work with a student-led team.</p><a class="ff-contact-button" href="/join/apply/">Apply for an internship</a></div>
  </section>`);

const news = [
  ['brighten-haiti-42-lights', 'deliveries', '/images/build/assembly-lights.webp', 'Solar study lights being assembled for delivery', '2026', '2026'],
  ['loksadhana-15-lights', 'deliveries', '/images/partners/loksadhana/class-3.webp', 'Loksadhana’s school in Maharashtra', '2026', '2026'],
  ['malaika-15-lights', 'deliveries', '/images/partners/malaika/school-1.webp', 'A teacher and students at Malaika’s school', '2026', '2026'],
  ['hand-delivered-in-india', 'deliveries', '/images/students/student-with-flashlight-3.jpg', 'A student in India holding a Flash Forward study light', '2026', '2026'],
  ['why-study-lights', 'our-work', '/images/light/assembled-anchor.webp', 'A completed Flash Forward solar study light', '2026-10', 'October 2026'],
  ['start-a-fundraiser', 'our-work', '/images/build/flashlight-units-group.webp', 'A group of completed solar study lights', null, null],
  ['brighten-haiti-student-essays', 'student-voices', '/images/partners/brighten-haiti/photo-1.webp', 'Students at a school served by Brighten Haiti', '2025-12', 'December 2025'],
  ['irs-recognition', 'foundation', '/images/brand/og-image.jpg', 'Flash Forward Foundation', '2025-08-05', 'August 5, 2025'],
  ['founded', 'foundation', '/images/build/flashfinishedworkshop.webp', 'Students with their finished study lights', '2024', '2024'],
].map(([slug, category, image, alt, date, label]) => {
  const html = readFileSync(`news/${slug}/index.html`, 'utf8');
  const title = unesc(html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/)[1].replace(/<[^>]*>/g, ''));
  const description = unesc(html.match(/<meta name="description" content="([^"]*)"/)[1]);
  return {slug, category, image, alt, date, label, title, description};
});
const featuredHtml = readFileSync('news/program-record/index.html', 'utf8');
const featuredTitle = unesc(featuredHtml.match(/<h1[^>]*>([\s\S]*?)<\/h1>/)[1]);
const cards = news.map(n => `<article class="ff-news-card" data-news-category="${n.category}"><a class="ff-news-card-image" href="/news/${n.slug}/" tabindex="-1" aria-hidden="true"><img src="${n.image}" alt="${esc(n.alt)}" loading="lazy" decoding="async"></a><h3><a href="/news/${n.slug}/">${esc(n.title)}</a></h3><p>${esc(n.description)}</p>${n.date ? `<time datetime="${n.date}">${n.label}</time>` : '<span class="ff-news-date">Fundraising guide</span>'}</article>`).join('');

page('/news/', 'News', 'The latest news from Flash Forward Foundation: solar study light deliveries, student voices, and updates from our student-led team.', 'ff-page-news', 'ff-news.css', `
  <section class="ff-news-feature" aria-labelledby="latest-news-heading"><div class="ff-news-wrap ff-news-feature-grid">
    <a class="ff-news-feature-image" href="/news/program-record/" tabindex="-1" aria-hidden="true"><img src="/images/build/packagedlights.webp" alt="Packaged Flash Forward solar study lights ready for delivery" fetchpriority="high" decoding="sync"></a>
    <div class="ff-news-feature-copy"><h1 id="latest-news-heading">Latest news</h1><h2><a href="/news/program-record/">${esc(featuredTitle)}</a></h2><p>All 72 solar study lights built by student interns have been delivered to three partners: Brighten Haiti, Loksadhana in India and Malaika in the DR Congo.</p><a class="ff-news-outline" href="/news/program-record/">Read more</a></div>
  </div></section>
  <section class="ff-news-latest ff-news-wrap" aria-labelledby="news-latest-heading">
    <div class="ff-news-toolbar"><h2 id="news-latest-heading" tabindex="-1">Latest from Flash Forward</h2><div class="ff-news-filters" role="group" aria-label="Filter news by topic" hidden>${[['all','All'],['deliveries','Deliveries'],['student-voices','Student voices'],['our-work','Our work'],['foundation','Foundation']].map(([key,label]) => `<button type="button" data-news-filter="${key}" aria-pressed="${key === 'all'}">${label}</button>`).join('')}</div></div>
    <div class="ff-news-grid">${cards}</div>
    <p class="ff-news-result-status" aria-live="polite" aria-atomic="true" hidden></p>
    <nav class="ff-news-pagination" aria-label="News pages" hidden><button type="button" data-news-prev aria-label="Previous page"><span aria-hidden="true">←</span></button><div class="ff-news-page-numbers"></div><button type="button" data-news-next aria-label="Next page"><span aria-hidden="true">→</span></button></nav>
  </section>
  <section class="ff-news-community ff-news-wrap" aria-labelledby="news-community-heading"><h2 id="news-community-heading">From our community</h2><a class="ff-news-community-card" href="/news/brighten-haiti-student-essays/"><div class="ff-news-community-image"><img src="/images/partners/brighten-haiti/photo-2.webp" alt="Students learning at a school served by Brighten Haiti" loading="lazy" decoding="async"></div><div><p class="ff-news-eyebrow">Student voices</p><h3>In their own words: students in Dumas, Haiti, on solar power</h3><p>26 students wrote about school before and after solar power. Read their essays in English translation.</p><span>Brighten Haiti · December 2025</span></div></a></section>
  <section class="ff-news-actions ff-news-wrap" aria-label="Support Flash Forward"><a href="/join/apply/" class="ff-news-action"><img src="/images/build/peopleworkingonflash.webp" alt="" loading="lazy" decoding="async"><div><h2>Get involved</h2><span class="ff-news-outline">Join our team</span></div></a><a href="/donate/" class="ff-news-action"><img src="/images/students/student-with-flashlight-3.jpg" alt="" loading="lazy" decoding="async"><div><h2>Support our efforts</h2><span class="ff-news-outline">Donate</span></div></a></section>`, '/js/ff-news.js');
