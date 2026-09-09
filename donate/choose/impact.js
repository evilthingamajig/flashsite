(function () {
  'use strict';
  const destinations = {
    'greatest-need': {name:'Where it is needed most',status:'Flash Forward selection',summary:'Choose any current flashlight-program destination, or let Flash Forward direct the gift across Haiti, India, and DR Congo.',partner:'Chosen by Flash Forward',lights:'72 lights across three partner destinations',learning:'432 learning hours per day (6 per light)',article:'#stories',articleLabel:'View all partner stories'},
    haiti: {iso:'ht',name:'Haiti',partner:'Brighten Haiti',status:'Selected destination',summary:'Flash Forward shipped 42 solar study lights to Haiti through its work with Brighten Haiti, which brings solar power and training to schools and communities.',lights:'42 lights shipped',learning:'252 learning hours per day (6 per light)',article:'/donate/choose/stories/brighten-haiti/',articleLabel:'Read the Brighten Haiti story'},
    drc: {iso:'cd',name:'DR Congo',partner:'Malaika',status:'Selected destination',summary:'Malaika connects education with clean water, health, and community programs in DR Congo. Flash Forward’s flashlight program includes 15 lights for this destination.',lights:'15 lights',learning:'90 learning hours per day (6 per light)',article:'/donate/choose/stories/malaika/',articleLabel:'Read the Malaika story'},
    india: {iso:'in',name:'India',partner:'Loksadhana',status:'Selected destination',summary:'Loksadhana expands education, skills, health, and livelihood opportunities in rural Maharashtra. Flash Forward’s flashlight program includes 15 lights for this destination.',lights:'15 lights',learning:'90 learning hours per day (6 per light)',article:'/donate/choose/stories/loksadhana/',articleLabel:'Read the Loksadhana story'}
  };
  const countryKeys = ['haiti', 'drc', 'india'];
  const requested = new URLSearchParams(window.location.search).get('destination');
  let selected = destinations[requested] ? requested : 'greatest-need';
  let previewed = null;
  let locked = selected !== 'greatest-need';
  let svg = null;
  const mount = document.querySelector('#world-map-mount');
  const viewport = document.querySelector('#map-viewport');
  const card = document.querySelector('#country-card');
  const neededMost = document.querySelector('#needed-most-button');

  const activeKey = () => previewed || selected;

  function updateCard(key, isPreview) {
    const item = destinations[key];
    document.querySelector('#panel-status').textContent = isPreview ? 'Previewing destination' : item.status;
    document.querySelector('#country-name').textContent = item.name;
    document.querySelector('#country-summary').textContent = item.summary;
    document.querySelector('#partner-name').textContent = item.partner;
    document.querySelector('#light-count').textContent = item.lights;
    document.querySelector('#learning-hours').textContent = item.learning;
    const article = document.querySelector('#country-article-link');
    article.href = item.article;
    article.firstChild.textContent = `${item.articleLabel} `;
  }

  function updateMap() {
    if (!svg) return;
    const active = activeKey();
    svg.classList.toggle('has-country-focus', active !== 'greatest-need');
    countryKeys.forEach((key) => {
      const path = svg.querySelector(`#${destinations[key].iso}`);
      if (!path) return;
      path.classList.toggle('is-current', key === active);
      path.classList.toggle('is-selected', key === selected && locked);
      path.setAttribute('aria-pressed', String(key === selected && locked));
    });
    const haitiInset = svg.querySelector('.haiti-inset');
    if (haitiInset) {
      haitiInset.classList.toggle('is-current', active === 'haiti');
      haitiInset.classList.toggle('is-selected', selected === 'haiti' && locked);
      haitiInset.setAttribute('aria-pressed', String(selected === 'haiti' && locked));
    }
    mount.querySelectorAll('.mobile-map-label').forEach((label) => {
      const key = label.dataset.destination;
      label.classList.toggle('is-current', key === active);
      label.classList.toggle('is-selected', key === selected && locked);
      label.setAttribute('aria-pressed', String(key === selected && locked));
    });
  }

  function filterStories(key) {
    document.querySelectorAll('[data-story-country]').forEach((story) => {
      story.hidden = key !== 'greatest-need' && story.dataset.storyCountry !== key;
    });
    document.querySelector('#stories-heading').textContent = key === 'greatest-need' ? 'Start with the local context' : `Context from ${destinations[key].name}`;
    document.querySelector('#stories-description').textContent = key === 'greatest-need' ? 'Showing stories from all three partner locations.' : `Showing the partner story for ${destinations[key].name}.`;
  }

  function commit(key) {
    selected = destinations[key] ? key : 'greatest-need';
    locked = selected !== 'greatest-need';
    previewed = null;
    document.body.dataset.destination = selected;
    neededMost.classList.toggle('is-active', selected === 'greatest-need');
    neededMost.setAttribute('aria-pressed', String(selected === 'greatest-need'));
    updateCard(selected, false);
    updateMap();
    filterStories(selected);
    document.dispatchEvent(new CustomEvent('flash:destinationchange', {detail:{destination:selected}}));
    const url = new URL(window.location.href);
    if (selected === 'greatest-need') url.searchParams.delete('destination');
    else url.searchParams.set('destination', selected);
    window.history.replaceState({}, '', `${url.pathname}${url.search}${url.hash}`);
  }

  function preview(key) {
    if (!destinations[key]) return;
    previewed = key;
    updateCard(key, true);
    updateMap();
  }

  function clearPreview() {
    if (!previewed) return;
    previewed = null;
    updateCard(selected, false);
    updateMap();
  }

  function keyForPath(path) {
    return countryKeys.find((key) => destinations[key].iso === path.id);
  }

  function bindDestinationControl(element, key) {
    element.addEventListener('pointerenter', () => preview(key));
    element.addEventListener('focus', () => preview(key));
    element.addEventListener('blur', clearPreview);
    element.addEventListener('click', (event) => { event.stopPropagation(); commit(key); });
    element.addEventListener('keydown', (event) => {
      if (event.key !== 'Enter' && event.key !== ' ') return;
      event.preventDefault();
      commit(key);
    });
  }

  function addHaitiInset() {
    const haiti = svg.querySelector('#ht');
    if (!haiti) return;
    const ns = 'http://www.w3.org/2000/svg';
    const make = (tag, attributes, text) => {
      const node = document.createElementNS(ns, tag);
      Object.entries(attributes || {}).forEach(([name, value]) => node.setAttribute(name, value));
      if (text) node.textContent = text;
      return node;
    };
    const bounds = haiti.getBBox();
    const sourceX = bounds.x + bounds.width / 2;
    const sourceY = bounds.y + bounds.height / 2;
    const compactMap = window.matchMedia('(max-width:680px)').matches;
    const panel = compactMap
      ? {x:40, y:650, width:700, height:300}
      : {x:650, y:690, width:270, height:135};
    const shapeBox = compactMap
      ? {x:95, y:750, width:220, height:135}
      : {x:674, y:738, width:96, height:68};
    const scale = Math.min(shapeBox.width / bounds.width, shapeBox.height / bounds.height);

    const group = make('g', {
      class:'haiti-inset',
      role:'button',
      tabindex:'0',
      'aria-label':'Choose Haiti, enlarged map view'
    });
    group.dataset.destination = 'haiti';
    group.appendChild(make('path', {
      class:'haiti-inset-leader',
      d:`M ${sourceX} ${sourceY} C ${sourceX + 35} ${sourceY + 75}, ${panel.x - 35} ${panel.y - 30}, ${panel.x + 18} ${panel.y + 18}`,
      'aria-hidden':'true'
    }));
    group.appendChild(make('circle', {
      class:'haiti-origin-ring', cx:String(sourceX), cy:String(sourceY), r:'17', 'aria-hidden':'true'
    }));
    group.appendChild(make('rect', {
      class:'haiti-inset-panel', x:String(panel.x), y:String(panel.y),
      width:String(panel.width), height:String(panel.height), rx:'10', 'aria-hidden':'true'
    }));
    group.appendChild(make('text', {
      class:'haiti-inset-label', x:String(panel.x + (compactMap ? 40 : 24)), y:String(panel.y + (compactMap ? 53 : 31)), 'aria-hidden':'true'
    }, 'ENLARGED VIEW'));
    const enlarged = haiti.cloneNode(true);
    enlarged.removeAttribute('id');
    enlarged.removeAttribute('role');
    enlarged.removeAttribute('tabindex');
    enlarged.removeAttribute('aria-label');
    enlarged.removeAttribute('aria-pressed');
    enlarged.setAttribute('aria-hidden', 'true');
    enlarged.setAttribute('class', 'haiti-inset-shape');
    enlarged.setAttribute('transform', `translate(${shapeBox.x} ${shapeBox.y}) scale(${scale}) translate(${-bounds.x} ${-bounds.y})`);
    group.appendChild(enlarged);
    group.appendChild(make('text', {
      class:'haiti-inset-name', x:String(panel.x + (compactMap ? 350 : 135)), y:String(panel.y + (compactMap ? 160 : 87)), 'aria-hidden':'true'
    }, 'Haiti'));
    bindDestinationControl(group, 'haiti');
    svg.appendChild(group);
  }

  function addMobileMapLabels() {
    if (!window.matchMedia('(max-width:680px)').matches) return;
    const layer = document.createElement('div');
    layer.className = 'mobile-map-labels';
    layer.setAttribute('aria-label', 'Flash Forward destinations');
    countryKeys.forEach((key) => {
      const item = destinations[key];
      const sourcePath = svg.querySelector(`#${item.iso}`);
      const button = document.createElement('button');
      button.type = 'button';
      button.className = `mobile-map-label mobile-map-label--${key}`;
      button.dataset.destination = key;
      button.setAttribute('aria-label', `Choose ${item.name}`);
      button.setAttribute('aria-pressed', 'false');
      if (sourcePath) {
        const bounds = sourcePath.getBBox();
        const padding = Math.max(bounds.width, bounds.height) * .14;
        const icon = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        icon.setAttribute('class', 'mobile-map-label-icon');
        icon.setAttribute('viewBox', `${bounds.x - padding} ${bounds.y - padding} ${bounds.width + padding * 2} ${bounds.height + padding * 2}`);
        icon.setAttribute('aria-hidden', 'true');
        icon.setAttribute('focusable', 'false');
        const shape = sourcePath.cloneNode(true);
        shape.removeAttribute('id');
        shape.removeAttribute('role');
        shape.removeAttribute('tabindex');
        shape.removeAttribute('aria-label');
        shape.removeAttribute('aria-pressed');
        shape.setAttribute('class', 'mobile-map-label-shape');
        icon.appendChild(shape);
        button.appendChild(icon);
      }
      const copy = document.createElement('span');
      copy.className = 'mobile-map-label-copy';
      const name = document.createElement('strong');
      name.textContent = item.name;
      const partner = document.createElement('small');
      partner.textContent = item.partner;
      copy.append(name, partner);
      button.appendChild(copy);
      bindDestinationControl(button, key);
      layer.appendChild(button);
    });
    mount.appendChild(layer);
  }

  function prepareMap(loadedSvg) {
    svg = loadedSvg;
    svg.classList.add('world-map-svg');
    svg.setAttribute('role', 'group');
    svg.setAttribute('aria-label', 'World map with Flash Forward flashlight-program countries in Haiti, DR Congo, and India');
    svg.removeAttribute('width');
    svg.removeAttribute('height');
    svg.querySelectorAll('path').forEach((path) => {
      const key = keyForPath(path);
      path.classList.add('map-country');
      if (!key) {
        path.setAttribute('aria-hidden', 'true');
        return;
      }
      path.classList.add('is-partner-country');
      path.setAttribute('role', 'button');
      path.setAttribute('tabindex', '0');
      path.setAttribute('aria-label', `Choose ${destinations[key].name}`);
      bindDestinationControl(path, key);
      const bounds = path.getBBox();
      const hitArea = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      hitArea.setAttribute('cx', String(bounds.x + bounds.width / 2));
      hitArea.setAttribute('cy', String(bounds.y + bounds.height / 2));
      hitArea.setAttribute('r', window.matchMedia('(max-width:680px)').matches ? '160' : '50');
      hitArea.setAttribute('class', 'country-hit-target');
      hitArea.dataset.destination = key;
      hitArea.setAttribute('aria-hidden', 'true');
      hitArea.addEventListener('pointerenter', () => preview(key));
      hitArea.addEventListener('click', (event) => { event.stopPropagation(); commit(key); });
      svg.appendChild(hitArea);
    });
    addHaitiInset();
    addMobileMapLabels();
    svg.addEventListener('pointerover', (event) => {
      if (!event.target.closest('.is-partner-country') && !event.target.closest('.country-hit-target') && !event.target.closest('.haiti-inset')) clearPreview();
    });
    svg.addEventListener('pointerleave', clearPreview);
    mount.setAttribute('aria-busy', 'false');
    updateMap();
  }

  viewport.addEventListener('click', (event) => {
    if (event.target.closest('#country-card') || event.target.closest('.is-partner-country') || event.target.closest('.country-hit-target') || event.target.closest('.haiti-inset')) return;
    commit('greatest-need');
  });
  card.addEventListener('click', (event) => event.stopPropagation());
  neededMost.addEventListener('click', () => commit('greatest-need'));
  document.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape') return;
    if (previewed) clearPreview();
    else if (locked) commit('greatest-need');
  });

  fetch('/images/flashforward/world-interactive.svg')
    .then((response) => { if (!response.ok) throw new Error('Map unavailable'); return response.text(); })
    .then((markup) => {
      const parsed = new DOMParser().parseFromString(markup, 'image/svg+xml');
      mount.replaceChildren(document.importNode(parsed.documentElement, true));
      prepareMap(mount.querySelector('svg'));
    })
    .catch(() => {
      mount.setAttribute('aria-busy', 'false');
      mount.innerHTML = '<div class="map-error"><p>The map could not load. Choose a destination:</p><div><button type="button" data-fallback="haiti">Haiti</button><button type="button" data-fallback="drc">DR Congo</button><button type="button" data-fallback="india">India</button></div></div>';
      mount.querySelectorAll('[data-fallback]').forEach((button) => button.addEventListener('click', (event) => {
        event.stopPropagation();
        commit(button.dataset.fallback);
      }));
    });

  commit(selected);
}());
