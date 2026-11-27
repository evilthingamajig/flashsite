(() => {
  const root = document.querySelector('.ff-page-news');
  if (!root) return;
  const cards = [...root.querySelectorAll('[data-news-category]')];
  const filters = [...root.querySelectorAll('[data-news-filter]')];
  const pager = root.querySelector('.ff-news-pagination');
  const numbers = root.querySelector('.ff-news-page-numbers');
  const previous = root.querySelector('[data-news-prev]');
  const next = root.querySelector('[data-news-next]');
  const status = root.querySelector('.ff-news-result-status');
  const heading = root.querySelector('#news-latest-heading');
  const perPage = 6;
  let category = 'all';
  let page = 1;

  function readLocation() {
    const params = new URLSearchParams(location.search);
    category = filters.some(f => f.dataset.newsFilter === params.get('topic')) ? params.get('topic') : 'all';
    page = Math.max(1, parseInt(params.get('page'), 10) || 1);
  }
  function render() {
    const matching = cards.filter(c => category === 'all' || c.dataset.newsCategory === category);
    const totalPages = Math.max(1, Math.ceil(matching.length / perPage));
    page = Math.min(page, totalPages);
    const start = (page - 1) * perPage;
    const visible = new Set(matching.slice(start, start + perPage));
    cards.forEach(c => { c.hidden = !visible.has(c); });
    filters.forEach(f => f.setAttribute('aria-pressed', String(f.dataset.newsFilter === category)));
    numbers.replaceChildren();
    for (let n = 1; n <= totalPages; n++) {
      const button = document.createElement('button');
      button.type = 'button';
      button.textContent = String(n);
      button.setAttribute('aria-label', `Page ${n}`);
      if (n === page) button.setAttribute('aria-current', 'page');
      button.addEventListener('click', () => changePage(n));
      numbers.append(button);
    }
    previous.disabled = page === 1;
    next.disabled = page === totalPages;
    pager.hidden = totalPages <= 1;
    status.textContent = `${start + 1}–${Math.min(start + perPage, matching.length)} of ${matching.length} articles`;
    status.hidden = false;
  }
  function saveLocation() {
    const url = new URL(location.href);
    if (category === 'all') url.searchParams.delete('topic');
    else url.searchParams.set('topic', category);
    if (page === 1) url.searchParams.delete('page');
    else url.searchParams.set('page', String(page));
    history.pushState(null, '', url);
  }
  function changePage(n) {
    page = n;
    render();
    saveLocation();
    heading.focus({preventScroll: true});
    heading.scrollIntoView({block: 'start'});
  }
  filters.forEach(filter => filter.addEventListener('click', () => {
    category = filter.dataset.newsFilter;
    page = 1;
    render();
    saveLocation();
  }));
  previous.addEventListener('click', () => changePage(page - 1));
  next.addEventListener('click', () => changePage(page + 1));
  window.addEventListener('popstate', () => { readLocation(); render(); });
  root.querySelector('.ff-news-filters').hidden = false;
  readLocation();
  render();
})();
