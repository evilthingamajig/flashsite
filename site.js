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
    if(a.href.indexOf('docs.google.com/forms')>-1)ga('apply_newtab',{track:track()});
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
      ga('apply_submit',{track:track(),method:'iframe_estimate'});
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
        ga('apply_submit',{track:t});
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
