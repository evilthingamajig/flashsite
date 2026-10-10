// The only script on the site. Behaviours are opt-in through data attributes so the scraped markup stays as it was.
// data-toggle="#id"            click toggles .is-open on #id
// data-accordion-trigger       inside [data-accordion-item]; toggles .is-open on the item
// data-tab="#panel"            inside [data-tabs]; opens that [data-tab-panel], closes its siblings
// #ff-search-form / #ff-search-results on /search/
(() => {
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
  });

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

// News index tag filter
(function(){
  var grid=document.getElementById('ff-newsgrid');if(!grid)return;
  var chips=document.querySelectorAll('.ff-chiprow .ff-chip');
  chips.forEach(function(c){c.addEventListener('click',function(){
    chips.forEach(function(x){x.classList.remove('is-active')});c.classList.add('is-active');
    var t=c.getAttribute('data-filter');
    grid.querySelectorAll('[data-tag]').forEach(function(card){
      card.style.display=(t==='all'||card.getAttribute('data-tag')===t)?'':'none';
    });
  });});
})();
