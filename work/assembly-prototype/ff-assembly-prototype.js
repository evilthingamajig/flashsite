(function(){
  var sequence=[
    {id:'case-shell',start:0,move:.13,offset:[0,0],label:'enclosure'},
    {id:'battery',start:.12,move:.22,offset:[145,-82],label:'600 mAh battery'},
    {id:'recharge-module',start:.25,move:.22,offset:[-132,34],label:'recharge module'},
    {id:'wires',start:.38,move:.22,offset:[-86,82],label:'wires and connections'},
    {id:'led',start:.49,move:.22,offset:[112,92],label:'LED'},
    {id:'solar-panel',start:.60,move:.22,offset:[0,-142],label:'5V solar panel'},
    {id:'top-cover',start:.72,move:.20,offset:[0,-220],label:'finished light'}
  ];
  function clamp(n){return Math.max(0,Math.min(1,n));}
  function ease(n){return n<.5?2*n*n:1-Math.pow(-2*n+2,2)/2;}
  function init(root){
    if(!root||root.getAttribute('data-assembly-ready'))return;
    root.setAttribute('data-assembly-ready','true');
    var parts={};
    root.querySelectorAll('[data-part]').forEach(function(el){parts[el.getAttribute('data-part')]=el;});
    var list=root.querySelectorAll('.ff-assembly-steps li');
    var status=root.querySelector('#assembly-status');
    var finished=root.querySelector('#assembly-finished');
    var meter=root.querySelector('#assembly-meter-fill');
    if(!list.length||!status||!finished||!meter)return;
    var reduced=window.matchMedia&&window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    function render(progress){
      var p=clamp(progress);
      sequence.forEach(function(item,index){
        var reveal=clamp((p-item.start)/.055);
        var move=ease(clamp((p-item.start)/item.move));
        var part=parts[item.id];
        if(!part)return;
        part.style.opacity=String(reveal);
        part.style.transform='translate('+((1-move)*item.offset[0])+'px,'+((1-move)*item.offset[1])+'px)';
        if(index<list.length)list[index].removeAttribute('aria-current');
      });
      var active=0;
      sequence.forEach(function(item,index){if(p>=item.start)active=index;});
      if(p>.88)active=sequence.length-1;
      list[active].setAttribute('aria-current','step');
      status.textContent=p>.92?'Step 7 of 7 · assembled light':'Step '+(active+1)+' of 7 · '+sequence[active].label;
      finished.style.opacity=String(clamp((p-.86)/.14));
      finished.setAttribute('aria-hidden',p>.94?'false':'true');
      meter.style.transform='scaleX('+p+')';
    }
    if(reduced){
      root.setAttribute('data-motion','reduced');
      render(1);
      return;
    }
    if(window.gsap&&window.ScrollTrigger){
      window.gsap.registerPlugin(window.ScrollTrigger);
      window.ScrollTrigger.create({trigger:root,start:'top top',end:'bottom bottom',scrub:true,onUpdate:function(self){render(self.progress)},onRefresh:function(self){render(self.progress)}});
      render(0);
    }else{
      function update(){
        var rect=root.getBoundingClientRect();
        var span=Math.max(1,root.offsetHeight-window.innerHeight);
        render(clamp(-rect.top/span));
      }
      window.addEventListener('scroll',update,{passive:true});
      window.addEventListener('resize',update);
      update();
    }
  }
  function start(){
    var existing=document.querySelector('[data-assembly-sequence]');
    if(existing){init(existing);return;}
    var cost=document.querySelector('#cost-breakdown');
    if(!cost)return;
    var base='work/assembly-prototype/';
    if(!document.querySelector('link[data-ff-assembly-css]')){
      var link=document.createElement('link');
      link.rel='stylesheet';link.href=base+'ff-assembly-prototype.css';link.setAttribute('data-ff-assembly-css','');
      document.head.appendChild(link);
    }
    fetch(base+'ff-assembly-prototype.html',{credentials:'same-origin'}).then(function(response){
      if(!response.ok)throw new Error('Assembly prototype unavailable');
      return response.text();
    }).then(function(markup){
      var parsed=new DOMParser().parseFromString(markup,'text/html');
      var section=parsed.querySelector('[data-assembly-sequence]');
      if(!section)return;
      var image=section.querySelector('.ff-assembly-finished img');
      if(image)image.setAttribute('src','images/flashforward/flashlightpics.webp');
      cost.insertAdjacentElement('afterend',section);
      init(section);
    }).catch(function(error){
      if(window.console)console.warn('[Flash Forward] assembly sequence unavailable',error);
    });
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});
  else start();
})();
