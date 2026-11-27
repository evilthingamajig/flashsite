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

  // The existing FAQ markup uses headings as its disclosure controls.
  document.querySelectorAll('.R-gd-faq .faqs-section .accordion-item').forEach((item, i) => {
    const trigger = item.querySelector('.accordion-trigger');
    const panel = item.querySelector('.accordion-panel');
    if (!trigger || !panel) return;
    panel.id = `ff-faq-answer-${i}`;
    panel.hidden = true;
    trigger.setAttribute('role', 'button');
    trigger.setAttribute('tabindex', '0');
    trigger.setAttribute('aria-controls', panel.id);
    trigger.setAttribute('aria-expanded', 'false');
    const toggleAnswer = () => {
      panel.hidden = !panel.hidden;
      trigger.classList.toggle('active', !panel.hidden);
      trigger.setAttribute('aria-expanded', String(!panel.hidden));
    };
    trigger.addEventListener('click', toggleAnswer);
    trigger.addEventListener('keydown', (event) => {
      if (event.key !== 'Enter' && event.key !== ' ') return;
      event.preventDefault();
      toggleAnswer();
    });
  });

  // Keep the monthly-giving card, and let Givebutter handle the secure checkout.
  const circleForm = document.getElementById('the-spring_form');
  if (circleForm) {
    const amountInput = circleForm.querySelector('input[name="amount"]');
    circleForm.querySelectorAll('.amount-button:not(.wps-amount-button),.other-amount-button').forEach((choice) => {
      choice.setAttribute('role', 'button');
      choice.setAttribute('tabindex', '0');
      const chooseAmount = () => {
        circleForm.querySelectorAll('.amount-button,.other-amount-button').forEach((button) => button.classList.toggle('selected', button === choice));
        const custom = choice.classList.contains('other-amount-button');
        circleForm.querySelector('.input-wrapper.donate-amount')?.classList.toggle('hidden', !custom);
        if (custom) amountInput?.focus();
        else if (amountInput) amountInput.value = choice.textContent.match(/\d+/)?.[0] || '20';
      };
      choice.addEventListener('click', chooseAmount);
      choice.addEventListener('keydown', (event) => {
        if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); chooseAmount(); }
      });
    });
    circleForm.addEventListener('submit', (event) => {
      event.preventDefault();
      if (!amountInput?.reportValidity()) return;
      const checkout = new URL(circleForm.action);
      checkout.searchParams.set('amount', amountInput.value);
      checkout.searchParams.set('frequency', 'monthly');
      location.assign(checkout.href);
    });
  }

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

// Donate: One-time | Study Circle + amount chips + destination → Givebutter widget
(function(){
  var LIGHT=5.17;
  var FUNDS={'greatest-need':'73949',haiti:'73950',india:'73951',drc:'73952'};
  var LABELS={'greatest-need':'Greatest need',haiti:'Haiti (Brighten Haiti)',india:'India (Loksadhana)',drc:'DR Congo (Malaika)'};
  var slot=document.getElementById('givebutter-embed');
  if(!slot&&!document.querySelector('[data-donate-freq]'))return;
  var qty=1,freq='once',dest='greatest-need';
  var params=new URLSearchParams(location.search);
  if(params.get('destination')&&FUNDS[params.get('destination')])dest=params.get('destination');
  if(location.hash==='#study-circle')freq='monthly';

  function mountWidget(){
    if(!slot)return;
    var w=document.createElement('givebutter-widget');
    w.setAttribute('id','L0ywAo');
    w.setAttribute('align','center');
    w.setAttribute('frequency',freq);
    w.setAttribute('amount',(LIGHT*qty).toFixed(2));
    w.setAttribute('fund',FUNDS[dest]||FUNDS['greatest-need']);
    var old=slot.querySelector('givebutter-widget');
    if(old)old.replaceWith(w);else slot.prepend(w);
  }
  function render(){
    var amt=(LIGHT*qty).toFixed(2);
    var gt=document.getElementById('gift-total');
    if(gt)gt.textContent='$'+amt+(freq==='monthly'?'/mo':'');
    var note=document.getElementById('dest-pref-note');
    if(note)note.textContent=LABELS[dest]||LABELS['greatest-need'];
    var fl=document.querySelector('[data-freq-label]');
    if(fl)fl.textContent=freq==='monthly'?'Study Circle':'One-time';
    document.querySelectorAll('[data-donate-freq] [data-freq]').forEach(function(b){
      b.classList.toggle('is-active',b.getAttribute('data-freq')===freq);
    });
    document.querySelectorAll('[data-donate-amounts] [data-qty]').forEach(function(b){
      b.classList.toggle('is-active',Number(b.getAttribute('data-qty'))===qty);
    });
    document.querySelectorAll('[data-destination-card]').forEach(function(b){
      b.classList.toggle('is-selected',b.getAttribute('data-destination-card')===dest);
    });
    mountWidget();
  }
  document.querySelectorAll('[data-donate-freq] [data-freq]').forEach(function(b){
    b.addEventListener('click',function(){freq=b.getAttribute('data-freq');render()});
  });
  document.querySelectorAll('[data-donate-amounts] [data-qty]').forEach(function(b){
    b.addEventListener('click',function(){qty=Number(b.getAttribute('data-qty'))||1;render()});
  });
  document.querySelectorAll('[data-destination-card]').forEach(function(b){
    b.addEventListener('click',function(){
      dest=b.getAttribute('data-destination-card');
      document.dispatchEvent(new CustomEvent('flash:destinationchange',{detail:{destination:dest}}));
      render();
    });
  });
  document.addEventListener('flash:destinationchange',function(e){
    if(e.detail&&FUNDS[e.detail.destination]){dest=e.detail.destination;render()}
  });
  // Legacy gift-builder hooks (if present)
  document.querySelectorAll('[data-gift-builder]').forEach(function(b){
    b.querySelectorAll('[data-quantity]').forEach(function(btn){
      btn.addEventListener('click',function(){qty=Number(btn.dataset.quantity)||1;render()});
    });
  });
  render();
})();

// Pathway step reveal on scroll
(function(){
  var steps=[].slice.call(document.querySelectorAll('[data-pathway-step]'));
  if(!steps.length)return;
  if(window.matchMedia&&window.matchMedia('(prefers-reduced-motion: reduce)').matches){
    steps.forEach(function(s){s.classList.add('is-in','is-active')});return;
  }
  if(!('IntersectionObserver' in window)){steps.forEach(function(s){s.classList.add('is-in','is-active')});return}
  var io=new IntersectionObserver(function(entries){
    entries.forEach(function(en){
      if(!en.isIntersecting)return;
      var list=en.target.parentElement?[].slice.call(en.target.parentElement.querySelectorAll('[data-pathway-step]')):steps;
      list.forEach(function(step,i){
        window.setTimeout(function(){
          step.classList.add('is-in');
          if(i===0)step.classList.add('is-active');
        },i*80);
      });
      io.disconnect();
    });
  },{threshold:0.25});
  io.observe(steps[0]);
})();

// Impact Stories filter chips
(function(){
  var grid=document.getElementById('ff-storygrid');if(!grid)return;
  var chips=document.querySelectorAll('[data-story-filters] .ff-filter');
  chips.forEach(function(c){c.addEventListener('click',function(){
    chips.forEach(function(x){x.classList.remove('is-active')});c.classList.add('is-active');
    var t=c.getAttribute('data-filter');
    grid.querySelectorAll('[data-type]').forEach(function(row){
      row.style.display=(t==='all'||row.getAttribute('data-type')===t)?'':'none';
    });
  });});
})();

// Sticky nav border on scroll
(function(){
  var nav=document.querySelector('.ff-nav');if(!nav)return;
  var on=function(){nav.classList.toggle('is-scrolled',window.scrollY>8)};
  on();window.addEventListener('scroll',on,{passive:true});
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
  var caps=[].slice.call(sec.querySelectorAll('.ff-asm__cap'));
  var K=dir==='m'?-0.125:-0.1043;
  function draw(i){
    current=Math.max(1,Math.min(FRAMES,Math.round(i)));
    var cw=cv.width/(window.devicePixelRatio||1),ch=cv.height/(window.devicePixelRatio||1);
    ctx.clearRect(0,0,cw,ch);
    var sr=sec.getBoundingClientRect();
    var stotal=sr.height-window.innerHeight;
    var p=reduced?1:(stotal>0?Math.min(1,Math.max(0,-sr.top/stotal)):1);
    var img=imgs[current-1];
    if(img&&img.complete&&img.naturalWidth){
      var s=Math.min(cw/img.naturalWidth,ch/img.naturalHeight);
      var w=img.naturalWidth*s,h=img.naturalHeight*s;
      var t=Math.min(1,Math.max(0,(p-0.5)/0.35));
      ctx.drawImage(img,(cw-w)/2+K*w*t*t*(3-2*t),(ch-h)/2,w,h);
    }
    if(!reduced){
      var idx=-1;
      for(var j=0;j<caps.length;j++){if(p>=parseFloat(caps[j].dataset.at)-0.001)idx=j;}
      caps.forEach(function(c,j){c.classList.toggle('is-on',j===idx)});
    }
  }
  function resize(){
    var dpr=window.devicePixelRatio||1;
    var w=cv.clientWidth,h=cv.clientHeight;
    if(!w||!h)return;
    cv.width=w*dpr;cv.height=h*dpr;
    ctx.setTransform(dpr,0,0,dpr,0,0);
    draw(current);
  }
  function loadFrames(){
    for(var n=1;n<=FRAMES;n++)(function(k){
      var img=new Image();
      img.src='/frames/assembly/'+dir+'/'+String(k).padStart(4,'0')+'.webp';
      img.onload=function(){if(k===1||k===FRAMES)draw(current)};
      imgs[k-1]=img;
    })(n);
  }
  if('IntersectionObserver' in window){
    var asmIO=new IntersectionObserver(function(es){
      es.forEach(function(e){if(e.isIntersecting){asmIO.disconnect();loadFrames()}});
    },{rootMargin:'600px 0px'});
    asmIO.observe(sec);
  }else loadFrames();
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

// Shared sticky navigation: click-only desktop panels and the mobile drawer.
(function(){
  var body=document.body;
  var nav=document.getElementById('site-nav');
  if(!body||!nav||!body.classList.contains('R-cw-chrome')||nav.dataset.ffClickNav)return;
  nav.dataset.ffClickNav='1';
  var desktop=window.matchMedia('(min-width: 1025px)');
  var reduced=window.matchMedia('(prefers-reduced-motion: reduce)');
  var items=Array.from(nav.querySelectorAll('.has-dropdown'));
  var toggle=nav.querySelector('.off-canvas-toggle');
  var drawer=document.getElementById('ff-offcanvas');
  var scrim=document.querySelector('.ff-drawer-scrim');
  var back=drawer&&drawer.querySelector('.ff-drawer-back');
  var lastDesktopButton=null;
  var background=Array.from(document.querySelectorAll('main,footer'));
  var previousInert=[];

  function closeItem(item){
    clearTimeout(item.ffRevealTimer);
    var panel=item.querySelector('.dropdown');
    item.classList.remove('is-revealed');
    panel.style.transition='none';
    item.classList.remove('is-open');
    item.querySelector('button').setAttribute('aria-expanded','false');
    panel.setAttribute('aria-hidden','true');
    panel.inert=true;
    void panel.offsetWidth;
    panel.style.transition='';
  }
  function closeDesktop(restore){
    items.forEach(closeItem);
    if(restore&&lastDesktopButton)lastDesktopButton.focus();
  }
  function openItem(item){
    closeDesktop(false);
    lastDesktopButton=item.querySelector('button');
    item.classList.add('is-open');
    lastDesktopButton.setAttribute('aria-expanded','true');
    var panel=item.querySelector('.dropdown');
    panel.setAttribute('aria-hidden','false');
    function reveal(){
      if(!item.classList.contains('is-open'))return;
      item.classList.add('is-revealed');
      panel.inert=false;
    }
    item.ffRevealTimer=window.setTimeout(reveal,reduced.matches?0:450);
  }
  nav.addEventListener('click',function(e){
    var trigger=e.target.closest('.dropdown-parent-link');
    if(!trigger||!desktop.matches)return;
    e.preventDefault();
    var item=trigger.closest('.has-dropdown');
    if(item.classList.contains('is-open'))closeDesktop(false);
    else openItem(item);
  });
  document.addEventListener('click',function(e){
    if(!nav.contains(e.target))closeDesktop(false);
  });

  function showPanel(name,focus){
    if(!drawer)return;
    var panels=Array.from(drawer.querySelectorAll('.ff-drawer-panel'));
    var next=panels.find(function(panel){return panel.dataset.panel===name;});
    if(!next)return;
    var previous=panels.find(function(panel){return panel.classList.contains('is-active');});
    panels.forEach(function(panel){
      var on=panel===next;
      panel.classList.toggle('is-active',on);
      panel.inert=!on;
      panel.setAttribute('aria-hidden',String(!on));
    });
    drawer.querySelectorAll('[data-open]').forEach(function(trigger){
      trigger.setAttribute('aria-expanded',String(trigger.dataset.open===name));
    });
    next.scrollTop=0;
    if(back)back.hidden=name==='root';
    if(focus){
      var target=name==='root'&&previous
        ? drawer.querySelector('[data-open="'+previous.dataset.panel+'"]')
        : null;
      // The incoming panel is still translated offscreen. Native focus scrolling
      // must not move the drawer (or the page) to that temporary position.
      (target||next.querySelector('a,button')).focus({preventScroll:true});
    }
  }
  function setDrawer(open,restore){
    if(!drawer)return;
    var wasOpen=body.classList.contains('off-canvas-open');
    body.classList.toggle('off-canvas-open',open);
    toggle.setAttribute('aria-expanded',String(open));
    drawer.setAttribute('aria-hidden',String(!open));
    drawer.inert=!open;
    if(scrim)scrim.hidden=false;
    if(open){
      closeDesktop(false);
      if(!wasOpen){
        previousInert=background.map(function(el){return el.inert;});
        background.forEach(function(el){el.inert=true;});
      }
      showPanel('root',false);
      drawer.querySelector('.ff-drawer-close').focus({preventScroll:true});
    }else{
      if(wasOpen)background.forEach(function(el,i){el.inert=previousInert[i];});
      if(restore&&wasOpen)toggle.focus({preventScroll:true});
    }
  }
  if(toggle)toggle.addEventListener('click',function(){setDrawer(!body.classList.contains('off-canvas-open'),true);});
  if(scrim)scrim.addEventListener('click',function(){setDrawer(false,true);});
  if(drawer)drawer.addEventListener('click',function(e){
    var t=e.target.closest('[data-open],.ff-drawer-back,.ff-drawer-close,a');
    if(!t)return;
    if(t.hasAttribute('data-open'))showPanel(t.dataset.open,true);
    else if(t.classList.contains('ff-drawer-back'))showPanel('root',true);
    else setDrawer(false,!t.matches('a'));
  });
  document.addEventListener('keydown',function(e){
    var drawerOpen=body.classList.contains('off-canvas-open');
    if(e.key==='Escape'){
      if(drawerOpen)setDrawer(false,true);
      else if(nav.querySelector('.is-open'))closeDesktop(true);
    }
    if(e.key==='Tab'&&drawerOpen){
      var focusable=Array.from(drawer.querySelectorAll('a,button')).filter(function(el){return !el.closest('[inert]')&&!el.hidden&&el.getClientRects().length;});
      var first=focusable[0],last=focusable[focusable.length-1];
      if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}
      else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}
    }
  });
  nav.addEventListener('focusout',function(){
    window.setTimeout(function(){if(!nav.contains(document.activeElement))closeDesktop(false);},0);
  });
  desktop.addEventListener('change',function(){closeDesktop(false);setDrawer(false,false);});
  function syncBar(){body.classList.toggle('is-scrolled',window.scrollY>12);}
  syncBar();
  window.addEventListener('scroll',syncBar,{passive:true});
})();

// Team directory filters (Opportunity Green card layout, FF departments)
(function(){
  var root=document.querySelector('[data-team-filter]');
  if(!root)return;
  var tabs=root.querySelectorAll('[data-team]');
  var cards=root.querySelectorAll('[data-teams]');
  var empty=root.querySelector('[data-team-empty]');
  function apply(tag){
    var n=0;
    cards.forEach(function(card){
      var teams=(card.getAttribute('data-teams')||'').split(/\s+/);
      var ok=tag==='all'||teams.indexOf(tag)!==-1;
      card.hidden=!ok;
      if(ok)n++;
    });
    if(empty) empty.hidden=n>0;
  }
  tabs.forEach(function(tab){
    tab.addEventListener('click',function(){
      tabs.forEach(function(t){
        var on=t===tab;
        t.classList.toggle('active', on);
        t.setAttribute('aria-selected', String(on));
      });
      apply(tab.getAttribute('data-team'));
    });
  });
  root.querySelectorAll('[data-readmore]').forEach(function(btn){
    btn.addEventListener('click',function(){
      var card=btn.closest('.expert-card');
      var open=card.classList.toggle('is-open');
      btn.textContent=open?'Show less':'Read more';
    });
  });
})();

// Count-up animation for [data-countup] figures
(function(){
  var els=[].slice.call(document.querySelectorAll('[data-countup]'));
  if(!els.length)return;
  if(window.matchMedia&&window.matchMedia('(prefers-reduced-motion: reduce)').matches)return;
  if(!('IntersectionObserver' in window))return;
  function render(el,v){el.textContent=(el.getAttribute('data-prefix')||'')+v;}
  var io=new IntersectionObserver(function(entries){
    entries.forEach(function(en){
      if(!en.isIntersecting)return;
      io.unobserve(en.target);
      var el=en.target;
      var target=parseInt(el.getAttribute('data-countup'),10)||0;
      render(el,target);
      var finalW=el.getBoundingClientRect().width;
      el.style.minWidth=Math.ceil(finalW)+'px';
      render(el,0);
      var t0=performance.now(),dur=1600;
      function frame(t){
        var p=Math.min(1,(t-t0)/dur);
        var e=1-Math.pow(1-p,3);
        render(el,Math.round(target*e));
        if(p<1)requestAnimationFrame(frame);
        else{render(el,target);el.style.minWidth='';}
      }
      requestAnimationFrame(frame);
    });
  },{threshold:.4});
  els.forEach(function(el){
    var r=el.getBoundingClientRect();
    if(r.bottom>0&&r.top<window.innerHeight)return;
    render(el,0);
    io.observe(el);
  });
})();
/* Lazy video posters: attach poster when the video nears the viewport */
(function(){
  var vids=[].slice.call(document.querySelectorAll('video[data-poster]'));
  if(!vids.length)return;
  var attach=function(v){v.poster=v.getAttribute('data-poster');v.removeAttribute('data-poster');};
  if(!('IntersectionObserver' in window)){vids.forEach(attach);return;}
  var io=new IntersectionObserver(function(entries){
    entries.forEach(function(en){if(en.isIntersecting){io.unobserve(en.target);attach(en.target);}});
  },{rootMargin:'300px 0px'});
  vids.forEach(function(v){io.observe(v);});
})();

// Internship application (#apply). Until /api/apply reports it is configured, the section shows the
// Google Form in an iframe; then it switches to the site's own form. Elements carry data-apply-mode.
// Embed mode can't see inside the iframe, so apply_submit {method:'iframe_estimate'} fires when the
// iframe loads past the form's last page (data-form-pages); check it against the Form's response count.
// GA4 events, in funnel order: apply_view (form on screen), apply_start (first field touched),
// apply_field {field, step} (each question first answered), apply_resume_added, apply_submit_attempt,
// apply_submit (accepted). Also apply_click (on-page Apply button), apply_newtab (Google Form opened in a tab), apply_error {reason} and
// apply_abandon {last_field, fields_done} when someone who started leaves without submitting.
(function(){
  function ga(name,params){if(typeof gtag==='function')gtag('event',name,params)}
  // Google Ads conversions (AW-18497426447 is configured in the gtag snippet build.mjs injects).
  var ADS={opened:'AW-18497426447/5orUCIvUkJwdEI-oofRE',submitted:'AW-18497426447/foYiCI7UkJwdEI-oofRE'};
  function adsConv(k){if(typeof gtag==='function')gtag('event','conversion',{send_to:ADS[k]})}
  var sec=document.getElementById('apply');
  var form=sec&&sec.querySelector('[data-apply-form]');
  var qsTrack=new URLSearchParams(location.search).get('track')||'';
  function track(){
    var c=form&&form.querySelector('input[name=track]:checked');
    return (c&&c.dataset.track)||(sec&&sec.dataset.track)||qsTrack||'general';
  }
  document.addEventListener('click',function(e){
    var a=e.target.closest('[data-apply],a[href*="docs.google.com/forms"]');
    if(!a)return;
    // Opening the Google Form itself is real intent; an on-page Apply button only scrolls to #apply.
    if(a.href.indexOf('docs.google.com/forms')>-1){ga('apply_newtab',{track:track()});adsConv('opened')}
    else ga('apply_click',{track:track()});
  });
  if(!form)return;

  var KEY='ff-apply-draft',MAX=4*1024*1024,EXT=/\.(pdf|docx?)$/i;
  var msg=form.querySelector('.fft-apply__msg'),btn=form.querySelector('[type=submit]');
  var drop=form.querySelector('.fft-drop'),file=form.querySelector('input[type=file]');
  var dropText=form.querySelector('[data-drop-text]'),dropDefault=dropText.innerHTML;
  var widget=null,siteKey='';

  function viewed(name){
    if(!('IntersectionObserver' in window))return;
    var seen=new IntersectionObserver(function(es){if(es[0].isIntersecting){seen.disconnect();ga(name,{track:track()})}},{threshold:.25});
    seen.observe(sec.querySelector('.fft-apply__panel'));
  }
  function embed(){
    var ifr=sec.querySelector('[data-apply-mode=embed] iframe');if(!ifr)return;
    var pages=Number(ifr.dataset.formPages)||1,loads=0,sent=false;
    ifr.addEventListener('load',function(){
      loads++;
      if(loads<2)return;
      ga('apply_form_progress',{track:track(),load:loads});
      if(sent||loads!==pages+1)return;
      sent=true;
      try{if(sessionStorage.getItem('ff-apply-sent'))return;sessionStorage.setItem('ff-apply-sent','1')}catch(e){}
      ga('apply_submit',{track:track(),method:'iframe_estimate'});adsConv('submitted');
      if(typeof plausible==='function')plausible('Apply Submit',{props:{track:track()}});
    });
    // Focus moving into the iframe is the only sign someone started the embedded form.
    window.addEventListener('blur',function(){
      if(document.activeElement===ifr&&!started){started=true;ga('apply_start',{track:track(),method:'iframe'})}
    });
    ifr.src=ifr.dataset.src;
    viewed('apply_embed_view');
  }
  fetch('/api/apply',{cache:'no-store'}).then(function(r){return r.json()}).catch(function(){return{}}).then(function(s){
    if(!s.ready){embed();return}
    siteKey=s.siteKey;
    sec.querySelectorAll('[data-apply-mode]').forEach(function(el){el.hidden=el.dataset.applyMode!=='form'});
    form.elements._t.value=String(Date.now());
    restore();
    var pre=sec.dataset.track||qsTrack;
    var r=pre&&form.querySelector('input[name=track][data-track="'+pre+'"]');
    if(r&&!form.querySelector('input[name=track]:checked'))r.checked=true;
    if(location.hash==='#apply')sec.scrollIntoView();
    viewed('apply_view');
  });

  // Turnstile loads on first interaction so it costs nothing for visitors who only read the page.
  function loadCheck(){
    if(widget!==null||!siteKey)return;widget=0;
    window.ffTurnstile=function(){widget=turnstile.render(form.querySelector('[data-turnstile]'),{sitekey:siteKey,appearance:'interaction-only'})};
    var s=document.createElement('script');s.src='https://challenges.cloudflare.com/turnstile/v0/api.js?onload=ffTurnstile&render=explicit';s.async=true;document.head.appendChild(s);
  }
  var started=false,submitted=false,lastField='',done={};
  var order=[].map.call(form.querySelectorAll('[data-field]'),function(f){return f.dataset.field});
  form.addEventListener('focusin',function(e){
    loadCheck();
    var f=e.target.closest('[data-field]');if(f)lastField=f.dataset.field;
    if(!started){started=true;ga('apply_start',{track:track()})}
  });
  // A question counts as answered the first time it holds a valid value.
  function answered(el){
    var f=el.closest('[data-field]');if(!f)return;
    var name=f.dataset.field;
    if(done[name]||!el.value||(el.type==='radio'&&!el.checked)||(el.validity&&!el.validity.valid))return;
    done[name]=true;
    if(name==='resume')ga('apply_resume_added',{track:track(),file_type:(el.files[0].name.split('.').pop()||'').toLowerCase()});
    else ga('apply_field',{track:track(),field:name,step:order.indexOf(name)+1});
  }
  form.addEventListener('change',function(e){answered(e.target)});
  form.addEventListener('focusout',function(e){answered(e.target)});
  window.addEventListener('pagehide',function(){
    if(started&&!submitted)ga('apply_abandon',{track:track(),last_field:lastField,fields_done:Object.keys(done).length,transport_type:'beacon'});
  });

  function save(){
    var d={};
    [].forEach.call(form.elements,function(el){
      if(!el.name||el.type==='file'||el.type==='hidden'||el.name==='website')return;
      if(el.type==='radio'){if(el.checked)d[el.name]=el.value}else d[el.name]=el.value;
    });
    try{localStorage.setItem(KEY,JSON.stringify(d))}catch(e){}
  }
  function restore(){
    var d;try{d=JSON.parse(localStorage.getItem(KEY)||'null')}catch(e){}
    if(!d)return;
    Object.keys(d).forEach(function(k){
      var els=form.querySelectorAll('[name="'+k+'"]');
      els.forEach(function(el){if(el.type==='radio')el.checked=el.value===d[k];else el.value=d[k]});
    });
  }
  form.addEventListener('input',function(e){save();clear(e.target.closest('[data-field]'))});
  form.addEventListener('change',function(e){save();clear(e.target.closest('[data-field]'))});

  function setErr(name,text){
    var f=form.querySelector('[data-field="'+name+'"]');if(!f)return;
    f.classList.add('is-invalid');
    var p=f.querySelector('.fft-field__err');if(p)p.textContent=text;
  }
  function clear(f){if(!f)return;f.classList.remove('is-invalid');var p=f.querySelector('.fft-field__err');if(p)p.textContent=''}

  function showFile(){
    var f=file.files[0];
    drop.classList.toggle('is-filled',!!f);
    dropText.innerHTML=f?'':dropDefault;
    if(f)dropText.textContent=f.name;
  }
  file.addEventListener('change',showFile);
  ['dragenter','dragover'].forEach(function(t){drop.addEventListener(t,function(){drop.classList.add('is-over')})});
  ['dragleave','drop'].forEach(function(t){drop.addEventListener(t,function(){drop.classList.remove('is-over')})});

  function check(){
    var ok=true;
    form.querySelectorAll('[data-field]').forEach(clear);
    [].forEach.call(form.elements,function(el){
      if(!el.name||el.type==='file'||el.type==='radio'||el.validity.valid)return;
      ok=false;setErr(el.name,el.validity.valueMissing?'Required':el.type==='email'?'Enter a valid email':'Check this field');
    });
    if(!form.querySelector('input[name=track]:checked')){ok=false;setErr('track','Pick a track, or "Not sure yet"')}
    var f=file.files[0];
    if(!f){ok=false;setErr('resume','Add your resume')}
    else if(!EXT.test(f.name)){ok=false;setErr('resume','Use a PDF or Word file')}
    else if(f.size>MAX){ok=false;setErr('resume','Resume must be 4 MB or smaller')}
    return ok;
  }

  form.addEventListener('submit',function(e){
    e.preventDefault();
    msg.textContent='';
    ga('apply_submit_attempt',{track:track()});
    if(!check()){
      ga('apply_error',{track:track(),reason:'invalid:'+[].map.call(form.querySelectorAll('.is-invalid'),function(f){return f.dataset.field}).join(',')});
      var bad=form.querySelector('.is-invalid input,.is-invalid select,.is-invalid textarea');if(bad)bad.focus();return
    }
    btn.disabled=true;btn.textContent='Sending…';
    fetch('/api/apply',{method:'POST',body:new FormData(form)}).then(function(r){return r.json().catch(function(){return{ok:false}})}).then(function(res){
      if(res.ok){
        var t=track();
        submitted=true;
        ga('apply_submit',{track:t});adsConv('submitted');
        if(typeof plausible==='function')plausible('Apply Submit',{props:{track:t}});
        try{localStorage.removeItem(KEY)}catch(e){}
        form.hidden=true;
        var thanks=sec.querySelector('.fft-apply__done');thanks.hidden=false;thanks.focus();
        return;
      }
      ga('apply_error',{track:track(),reason:res.error||'server'});
      if(res.fields)Object.keys(res.fields).forEach(function(k){setErr(k,res.fields[k])});
      msg.textContent=res.message||'Something went wrong. Please try again.';
      throw 0;
    }).catch(function(){
      if(!msg.textContent){ga('apply_error',{track:track(),reason:'network'});msg.textContent='Could not reach the server. Check your connection and try again.'}
      btn.disabled=false;btn.textContent='Submit application';
      if(window.turnstile&&widget)turnstile.reset(widget);
    });
  });
})();

// Donation conversions (/donate/). The Givebutter widget library reports to the page's gtag():
// add_to_cart when a donor starts the form, begin_checkout at the payment step, and purchase
// {value, currency, transaction_id} when the gift completes. GA4 gets those as they are; this forwards
// begin_checkout and purchase to the Google Ads conversion actions "FF Donation Started" and "FF Donation".
(function(){
  if(!document.querySelector('givebutter-widget')||typeof window.gtag!=='function')return;
  var ADS={purchase:'AW-18497426447/4VKdCKjb8rkdEI-oofRE',begin_checkout:'AW-18497426447/9tntCJ-Y_LkdEI-oofRE'};
  var orig=window.gtag,sent={};
  window.gtag=function(type,name,p){
    orig.apply(this,arguments);
    if(type!=='event'||!ADS[name])return;
    p=p||{};
    var key=name+':'+(p.transaction_id||'');
    if(sent[key])return;sent[key]=1;
    if(name==='purchase'){
      var c={send_to:ADS.purchase,value:Number(p.value)||5.17,currency:p.currency||'USD'};
      if(p.transaction_id)c.transaction_id=String(p.transaction_id);
      orig('event','conversion',c);
    }else orig('event','conversion',{send_to:ADS.begin_checkout});
  };
})();

// Keep sponsorship inquiries in the main contact form.
(function () {
  var topic = document.getElementById('contact-topic');
  if (!topic) return;
  var requested = new URLSearchParams(window.location.search).get('topic');
  var topics = {
    sponsorship: 'Project sponsorship',
    corporate: 'Project sponsorship',
    builders: 'Builders — assembling lights',
    ambassadors: 'Ambassadors',
    internships: 'Internships',
    partners: 'Distribution partnerships'
  };
  if (topics[requested]) topic.value = topics[requested];
})();
