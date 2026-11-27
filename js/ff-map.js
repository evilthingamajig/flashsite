/* Project map on /impact/: pins, tabs and the list swap the detail card. Without JS it stays a static overview. */
(function () {
  'use strict';
  var root = document.querySelector('[data-ffm]');
  if (!root) return;
  root.classList.add('ffm-js');

  var places = {
    haiti: { kicker: 'Haiti', title: 'Brighten Haiti', lights: 42, img: '/images/partners/brighten-haiti/photo-2.webp', alt: 'Students at a school served by Brighten Haiti',
      text: 'Brighten Haiti brings solar power to schools and communities. It knows the students it serves and chooses who receives each light.',
      href: '/impact-stories/brighten-haiti/', cta: 'Read the Brighten Haiti story' },
    india: { kicker: 'Maharashtra, India', title: 'Loksadhana', lights: 15, img: '/images/partners/loksadhana/class-3.webp', alt: 'Students at Loksadhana’s school in Maharashtra',
      text: 'An education and skills organization in rural Maharashtra, with hostels for students who live too far to travel to school each day.',
      href: '/impact-stories/loksadhana/', cta: 'Read the Loksadhana story' },
    drc: { kicker: 'Kalebuka, DR Congo', title: 'Malaika', lights: 15, img: '/images/partners/malaika/school-1.webp', alt: 'A teacher with her class at Malaika’s school',
      text: 'A free school for girls and a community center in Kalebuka, near Lubumbashi. Malaika selects the students who receive the lights.',
      href: '/impact-stories/malaika/', cta: 'Read the Malaika story' },
    home: { kicker: 'Bellevue, Washington', title: 'Where we started', lights: null, img: '/images/build/peopleworkingonflash.webp', alt: 'Students working together on Flash Forward study lights',
      text: 'Flash Forward was founded by students in Bellevue in 2024. Our student-led team coordinates the volunteer Builders and the partners who place each light.',
      href: '/about/', cta: 'Read our story' }
  };

  var card = root.querySelector('.ffm-card');
  var overview = card.innerHTML;
  var pins = root.querySelectorAll('.ffm-pin');
  var tabs = root.querySelectorAll('.ffm-tab');
  var arcs = root.querySelectorAll('.ffm-arcs path');

  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }

  function show(key) {
    pins.forEach(function (p) { p.setAttribute('aria-pressed', String(p.getAttribute('data-place') === key)); });
    tabs.forEach(function (t) { t.setAttribute('aria-pressed', String(t.getAttribute('data-place') === key)); });
    arcs.forEach(function (a) { a.classList.toggle('is-dim', key !== 'all' && key !== 'home' && a.getAttribute('data-to') !== key); });
    if (key === 'all') { card.innerHTML = overview; bindList(); return; }
    var p = places[key];
    card.innerHTML =
      '<img src="' + p.img + '" alt="' + esc(p.alt) + '">' +
      '<div class="ffm-card-body"><p class="ffm-kicker">' + esc(p.kicker) + '</p><h3>' + esc(p.title) + '</h3>' +
      (p.lights ? '<p class="ffm-count"><strong>' + p.lights + '</strong>study lights delivered</p>' : '') +
      '<p>' + esc(p.text) + '</p><a href="' + p.href + '">' + esc(p.cta) + ' →</a></div>';
  }

  function bindList() {
    card.querySelectorAll('[data-show]').forEach(function (b) {
      b.addEventListener('click', function () { show(b.getAttribute('data-show')); });
    });
  }

  pins.forEach(function (p) { p.addEventListener('click', function () { show(p.getAttribute('data-place')); }); });
  tabs.forEach(function (t) { t.addEventListener('click', function () { show(t.getAttribute('data-place')); }); });
  bindList();

  var panel = root.querySelector('.ffm-panel');
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (es) {
      if (es.some(function (e) { return e.isIntersecting; })) { panel.classList.add('is-in'); io.disconnect(); }
    }, { threshold: 0.25 });
    io.observe(panel);
  } else {
    panel.classList.add('is-in');
  }
})();
