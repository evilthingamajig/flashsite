(function(){'use strict';
function init(section){
 if(!section||section.getAttribute('data-assembly-ready'))return;
 section.setAttribute('data-assembly-ready','true');
 var stage=section.querySelector('.ff-assembly-stage'),visual=section.querySelector('.ff-assembly-visual'),intro=section.querySelector('.ff-assembly-finished-intro'),master=section.querySelector('.ff-assembly-master'),lid=section.querySelector('.ff-assembly-lid'),finished=section.querySelector('.ff-assembly-final'),copy=section.querySelector('.ff-assembly-copy'),chapters=[].slice.call(section.querySelectorAll('.ff-assembly-chapter')),finalCopy=section.querySelector('.ff-assembly-final-copy');
 if(!stage||!visual||!intro||!master||!lid||!finished||!copy)return;
 var layers={enclosure:section.querySelector('[data-assembly-layer="enclosure"]'),battery:section.querySelector('[data-assembly-layer="battery"]'),'recharge-module':section.querySelector('[data-assembly-layer="recharge-module"]'),'led-pair':section.querySelector('[data-assembly-layer="led-pair"]'),'solar-panel':section.querySelector('[data-assembly-layer="solar-panel"]')};
 var ids=['enclosure','battery','recharge-module','led-pair','solar-panel'];
 var offsets={enclosure:[-14,-22],battery:[42,34],'recharge-module':[-52,20],'led-pair':[54,-18],'solar-panel':[0,-48]};
 var rotations={enclosure:-3,battery:4,'recharge-module':-4,'led-pair':5,'solar-panel':-2};
 var starts=[.16,.26,.36,.46,.56];
 var reduced=window.matchMedia&&window.matchMedia('(prefers-reduced-motion: reduce)').matches;
 function clamp(v){return Math.max(0,Math.min(1,v));}
 function set(el,opacity,x,y,scale,rotation){if(!el)return;el.style.opacity=String(opacity);el.style.transform='translate3d('+x+'px,'+y+'px,0) scale('+scale+') rotateZ('+rotation+'deg)';}
 function chapterAt(p){var active=-1;starts.forEach(function(v,i){if(p>=v&&p<(.26+i*.10))active=i;});return active;}
 function render(p){
  p=clamp(p);
  if(reduced)p=1;
  var explosion=clamp((p-.08)/.08), assembly=clamp((p-.66)/.08), lidProgress=clamp((p-.74)/.10), finishProgress=clamp((p-.84)/.06), final=p>=.90;
  set(intro,p<.08?1:1-explosion*1.15,0,0,1,0);
  ids.forEach(function(id,i){var el=layers[id];if(!el)return;var chapterStart=starts[i],chapterEnd=chapterStart+.10,chapterFade=clamp((p-chapterStart)/.03),chapterOut=clamp((chapterEnd-p)/.03),chapterOpacity=p<.16?explosion:p<.66?Math.min(chapterFade,chapterOut):1;var ex=offsets[id],assembled=1-assembly;var x=(ex[0]*assembled),y=(ex[1]*assembled),r=rotations[id]*assembled;set(el,final?0:chapterOpacity,x,y,1,r);});
  var masterOpacity=clamp((p-.70)/.04);set(master,final?0:masterOpacity,0,0,1,0);
  set(lid,p<.74?0:p<.84?lidProgress:0,0,-72*(1-lidProgress),1,0);
  set(finished,final?1:finishProgress,0,0,1,0);
  var active=chapterAt(p);chapters.forEach(function(ch,i){ch.classList.toggle('is-active',!final&&active===i);});
  if(finalCopy)finalCopy.classList.toggle('is-active',final);
  if(copy)copy.classList.toggle('is-right',active%2===1&&!final);
 }
 render(reduced?1:0);
 if(reduced)return;
 if(window.gsap&&window.ScrollTrigger){window.gsap.registerPlugin(window.ScrollTrigger);var mm=window.gsap.matchMedia();mm.add('(min-width:700px), (max-width:699px)',function(){var proxy={p:0};var tl=window.gsap.timeline({scrollTrigger:{trigger:section,start:'top top',end:'bottom bottom',pin:stage,pinSpacing:false,scrub:.55,anticipatePin:1,onUpdate:function(){render(proxy.p)}}});tl.to(proxy,{p:1,duration:1,ease:'none',onStart:function(){render(proxy.p)},onUpdate:function(){render(proxy.p)}});return function(){tl.scrollTrigger&&tl.scrollTrigger.kill();tl.kill();};});}else{var ticking=false;function update(){if(ticking)return;ticking=true;requestAnimationFrame(function(){var r=section.getBoundingClientRect(),p=clamp(-r.top/Math.max(1,section.offsetHeight-window.innerHeight));render(p);ticking=false;});}window.addEventListener('scroll',update,{passive:true});window.addEventListener('resize',update);update();}
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',function(){init(document.querySelector('[data-assembly-sequence]'));},{once:true});else init(document.querySelector('[data-assembly-sequence]'));
})();
