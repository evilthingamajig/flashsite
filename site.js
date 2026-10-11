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

// Gift builder (donate page)
(function(){
  var LIGHT=5.17;
  var labels={'greatest-need':"Where it's needed most",haiti:'Haiti (Brighten Haiti)',india:'India (Loksadhana)',drc:'DR Congo (Malaika)'};
  document.querySelectorAll('[data-gift-builder]').forEach(function(b){
    var qty=1,dest=b.dataset.destination||document.body.dataset.destination||'greatest-need';
    var btns=[].slice.call(b.querySelectorAll('[data-quantity]'));
    var custom=b.querySelector('[data-custom-quantity]');
    var freqs=[].slice.call(b.querySelectorAll('input[type=radio][name=frequency]'));
    function freq(){var c=freqs.find(function(i){return i.checked});return c?c.value:'once'}
    function render(){
      var recurring=freq()==='monthly';
      var amt=(LIGHT*qty).toFixed(2);
      var name=labels[dest]||labels['greatest-need'];
      var line=(recurring?'Monthly':'One time')+' · '+qty+' '+(qty===1?'light':'lights');
      var gl=document.getElementById('gift-line');if(gl)gl.textContent=line;
      var gt=document.getElementById('gift-total');if(gt)gt.textContent='$'+amt+(recurring?'/mo':'');
      var pref=document.getElementById('dest-pref');if(pref)pref.textContent=name;
      var note=document.getElementById('dest-pref-note');if(note)note.textContent=name;
    }
    function pick(btn){qty=Number(btn.dataset.quantity);if(custom)custom.value='';
      btns.forEach(function(i){i.classList.toggle('is-active',i===btn);i.setAttribute('aria-pressed',String(i===btn))});render()}
    btns.forEach(function(i){i.addEventListener('click',function(){pick(i)})});
    freqs.forEach(function(i){i.addEventListener('change',render)});
    if(custom)custom.addEventListener('input',function(){
      if(custom.value==='')return;qty=Math.max(1,Math.min(100,Math.floor(Number(custom.value)||1)));custom.value=String(qty);
      btns.forEach(function(i){i.classList.remove('is-active');i.setAttribute('aria-pressed','false')});render()});
    document.addEventListener('flash:destinationchange',function(e){
      if(e.detail&&labels[e.detail.destination]){dest=e.detail.destination;render()}});
    render();
  });
})();

// Scroll-scrubbed CAD assembly (the-light page)
(function(){
  var sec=document.getElementById('ff-asm'),cv=document.getElementById('ff-asm-canvas');
  if(!sec||!cv)return;
  var reduced=window.matchMedia('(prefers-reduced-motion:reduce)').matches;
  var FRAMES=72;
  var dir=window.innerWidth<700?'m':'d';
  var size=dir==='m'?[720,720]:[1280,960];
  var imgs=new Array(FRAMES);var current=1;
  var ctx=cv.getContext('2d');
  function draw(i){
    current=Math.max(1,Math.min(FRAMES,Math.round(i)));
    var cw=cv.width/(window.devicePixelRatio||1),ch=cv.height/(window.devicePixelRatio||1);
    ctx.clearRect(0,0,cw,ch);
    var img=imgs[current-1];
    if(img&&img.complete&&img.naturalWidth){
      var s=Math.min(cw/img.naturalWidth,ch/img.naturalHeight);
      var w=img.naturalWidth*s,h=img.naturalHeight*s;
      ctx.drawImage(img,(cw-w)/2,(ch-h)/2,w,h);
    }
    var p=(current-1)/(FRAMES-1);
    document.querySelectorAll('.ff-asm__cap').forEach(function(c){
      var at=parseFloat(c.dataset.at);
      c.classList.toggle('is-on',p>=at&&p<at+0.3);
    });
  }
  function resize(){
    var dpr=window.devicePixelRatio||1;
    var w=cv.clientWidth,h=cv.clientHeight;
    if(!w||!h)return;
    cv.width=w*dpr;cv.height=h*dpr;
    ctx.setTransform(dpr,0,0,dpr,0,0);
    draw(current);
  }
  for(var n=1;n<=FRAMES;n++)(function(k){
    var img=new Image();
    img.src='/frames/assembly/'+dir+'/'+String(k).padStart(4,'0')+'.webp';
    img.onload=function(){if(k===1||k===FRAMES)draw(current)};
    imgs[k-1]=img;
  })(n);
  if(reduced){
    window.setTimeout(function(){resize();draw(FRAMES);},400);
    document.querySelectorAll('.ff-asm__cap').forEach(function(c){c.classList.add('is-on')});
    window.addEventListener('resize',resize);
    return;
  }
  var raf=null;
  function onScroll(){
    if(raf)return;
    raf=requestAnimationFrame(function(){
      raf=null;
      var r=sec.getBoundingClientRect();
      var total=r.height-window.innerHeight;
      if(total<=0)return;
      var p=Math.min(1,Math.max(0,-r.top/total));
      draw(1+p*(FRAMES-1));
    });
  }
  resize();
  window.addEventListener('resize',resize);
  window.addEventListener('scroll',onScroll,{passive:true});
  draw(1);onScroll();
})();

// Mobile menu toggle for the site header
(function(){
  var t=document.querySelector('.ff-nav__toggle');
  if(!t)return;
  t.addEventListener('click',function(){
    var nav=document.getElementById(t.getAttribute('aria-controls'));
    var open=nav.classList.toggle('is-open');
    t.setAttribute('aria-expanded',String(open));
  });
})();
