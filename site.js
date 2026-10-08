// The only script on the site. Behaviours are opt-in through data attributes so the scraped markup stays as it was.
// data-toggle="#id"            click toggles .is-open on #id
// data-accordion-trigger       inside [data-accordion-item]; toggles .is-open on the item
// data-tab="#panel"            inside [data-tabs]; opens that [data-tab-panel], closes its siblings
// data-lights="n"              sets the light count for [data-donate-link] (Every.org checkout)
// data-frequency="once|monthly"
// #ff-search-form / #ff-search-results on /search/
(() => {
  const LIGHT_CENTS = 517; // one light, parts only (site/lib/facts.ts)
  const EVERY_ORG = 'https://www.every.org/flash-forward-foundation';

  document.addEventListener('click', (e) => {
    const toggle = e.target.closest('[data-toggle]');
    if (toggle) {
      e.preventDefault();
      const target = document.querySelector(toggle.dataset.toggle);
      const open = target?.classList.toggle('is-open');
      toggle.setAttribute('aria-expanded', String(Boolean(open)));
      return;
    }
    const trigger = e.target.closest('[data-accordion-trigger]');
    if (trigger) {
      e.preventDefault();
      const item = trigger.closest('[data-accordion-item]');
      const open = item.classList.toggle('is-open');
      trigger.setAttribute('aria-expanded', String(open));
      return;
    }
    const tab = e.target.closest('[data-tab]');
    if (tab) {
      e.preventDefault();
      const group = tab.closest('[data-tabs]');
      group.querySelectorAll('[data-tab]').forEach((t) => { t.classList.toggle('is-active', t === tab); t.setAttribute('aria-selected', String(t === tab)); });
      group.querySelectorAll('[data-tab-panel]').forEach((p) => p.classList.toggle('is-open', p.matches(tab.dataset.tab)));
      return;
    }
    const choice = e.target.closest('[data-lights], [data-frequency]');
    if (choice) {
      e.preventDefault();
      const form = choice.closest('[data-donate]') || document;
      const attr = choice.hasAttribute('data-lights') ? 'data-lights' : 'data-frequency';
      form.querySelectorAll(`[${attr}]`).forEach((b) => b.classList.toggle('is-active', b === choice));
      updateDonate(form);
    }
  });

  function updateDonate(form) {
    const lights = Math.min(100, Math.max(1, parseInt(form.querySelector('[data-lights].is-active')?.dataset.lights || '1', 10)));
    const monthly = form.querySelector('[data-frequency].is-active')?.dataset.frequency === 'monthly';
    const amount = ((lights * LIGHT_CENTS) / 100).toFixed(2);
    const params = new URLSearchParams({
      amount,
      frequency: monthly ? 'MONTHLY' : 'ONCE',
      designation: `${lights} solar study light${lights === 1 ? '' : 's'}${monthly ? ' every month' : ''}`,
    });
    form.querySelectorAll('[data-donate-link]').forEach((a) => { a.href = `${EVERY_ORG}?${params}#donate`; });
    form.querySelectorAll('[data-donate-amount]').forEach((el) => { el.textContent = `$${amount}`; });
  }
  document.querySelectorAll('[data-donate]').forEach(updateDonate);

  // Every form returns to /contact/?sent=1 after FormSubmit accepts it.
  const sent = document.getElementById('ff-sent');
  if (sent && new URLSearchParams(location.search).has('sent')) { sent.hidden = false; sent.scrollIntoView({ block: 'center' }); }

  const results = document.getElementById('ff-search-results');
  if (results) {
    const q = new URLSearchParams(location.search).get('q') || '';
    const input = document.querySelector('#ff-search-form input[name="q"]');
    if (input) input.value = q;
    fetch('/search-index.json').then((r) => r.json()).then((pages) => {
      const words = q.toLowerCase().split(/\s+/).filter(Boolean);
      const hits = words.length ? pages.filter((p) => words.every((w) => `${p.title} ${p.description}`.toLowerCase().includes(w))) : [];
      results.innerHTML = !words.length ? '<p>Type a word above to search the site.</p>'
        : hits.length ? '<ul>' + hits.map((p) => `<li><a href="${p.url}">${p.title}</a><br><span>${p.description}</span></li>`).join('') + '</ul>'
        : `<p>No pages matched "${q.replace(/[<>&"]/g, '')}". Try the <a href="/site-map/">site map</a>.</p>`;
    });
  }
})();
