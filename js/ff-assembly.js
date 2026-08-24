(function(){'use strict';
function init(section){
 if(!section||section.getAttribute('data-assembly-ready'))return;
 section.setAttribute('data-assembly-ready','true');
 var stage=section.querySelector('.ff-assembly-stage'),visual=section.querySelector('.ff-assembly-visual'),intro=section.querySelector('.ff-assembly-finished-intro'),body=section.querySelector('.ff-assembly-body'),master=section.querySelector('.ff-assembly-master'),lid=section.querySelector('.ff-assembly-lid'),finished=section.querySelector('.ff-assembly-final'),copy=section.querySelector('.ff-assembly-copy'),chapters=[].slice.call(section.querySelectorAll('.ff-assembly-chapter')),finalCopy=section.querySelector('.ff-assembly-final-copy');
 if(!stage||!visual||!intro||!body||!master||!lid||!finished||!copy)return;
 var layers={enclosure:section.querySelector('[data-assembly-layer="enclosure"]'),battery:section.querySelector('[data-assembly-layer="battery"]'),'recharge-module':section.querySelector('[data-assembly-layer="recharge-module"]'),'led-pair':section.querySelector('[data-assembly-layer="led-pair"]'),'solar-panel':section.querySelector('[data-assembly-layer="solar-panel"]')};
 var ids=['enclosure','battery','recharge-module','led-pair','solar-panel'];
 var offsets={enclosure:[-14,-22],battery:[42,34],'recharge-module':[-52,20],'led-pair':[54,-18],'solar-panel':[0,-48]};
 var rotations={enclosure:-3,battery:4,'recharge-module':-4,'led-pair':5,'solar-panel':-2};
 var starts=[.16,.26,.36,.46,.56],reduced=window.matchMedia&&window.matchMedia('(prefers-reduced-motion: reduce)').matches,mm=null,tl=null,cleaned=false,scrollHandler=null,resizeHandler=null;
 function clamp(v){return Math.max(0,Math.min(1,v));}
 function set(el,opacity,x,y,scale,rotation){if(!el)return;el.style.opacity=String(clamp(opacity));el.style.transform='translate3d('+x+'px,'+y+'px,0) scale('+scale+') rotateZ('+rotation+'deg)';}
 function chapterAt(p){var active=-1;starts.forEach(function(v,i){if(p>=v&&p<(.26+i*.10))active=i;});return active;}
 function render(p){
  p=clamp(p);if(reduced)p=1;
  var explosion=clamp((p-.08)/.08),masterProgress=clamp((p-.64)/.08),swap=clamp((p-.72)/.03),lidTravel=clamp((p-.75)/.09),finishProgress=clamp((p-.84)/.06),final=p>=.90;
  set(intro,p<.08?1:1-explosion,0,0,1,0);
  ids.forEach(function(id,i){var el=layers[id];if(!el)return;var start=starts[i],end=start+.10,fadeIn=clamp((p-(start-.025))/.025),fadeOut=clamp(((end+.025)-p)/.025),baseOpacity=p<.16?explosion:p<.66?Math.min(fadeIn,fadeOut):0,fan=clamp((p-.62)/.04),chapterOpacity=p>=.62?Math.max(baseOpacity,fan):baseOpacity,ex=offsets[id],assembled=1-masterProgress;set(el,final?0:chapterOpacity*(1-masterProgress),ex[0]*assembled,ex[1]*assembled,1,rotations[id]*assembled);});
  set(master,final?0:masterProgress*(1-swap),0,0,1,0);
  var replacementOpacity=(p<.75?swap:1)*(1-finishProgress);
  set(body,final?0:replacementOpacity,0,0,1,0);
  var travel=Math.max(120,(visual.clientWidth||620)*.27);set(lid,final?0:replacementOpacity,0,travel*lidTravel,1,0);
  set(finished,final?1:finishProgress,0,0,1,0);
  var active=chapterAt(p);chapters.forEach(function(ch,i){ch.classList.toggle('is-active',!final&&active===i);});
  if(finalCopy)finalCopy.classList.toggle('is-active',final);
  if(copy)copy.classList.toggle('is-right',active%2===1&&!final);
 }
 function cleanup(){if(cleaned)return;cleaned=true;if(tl){if(tl.scrollTrigger)tl.scrollTrigger.kill();tl.kill();tl=null;}if(mm){mm.revert();mm=null;}if(scrollHandler)window.removeEventListener('scroll',scrollHandler);if(resizeHandler)window.removeEventListener('resize',resizeHandler);}
 render(reduced?1:0);window.addEventListener('pagehide',cleanup,{once:true});
 if(reduced)return;
 if(window.gsap&&window.ScrollTrigger){window.gsap.registerPlugin(window.ScrollTrigger);mm=window.gsap.matchMedia();mm.add('(min-width:700px), (max-width:699px)',function(){var proxy={p:0};tl=window.gsap.timeline({scrollTrigger:{trigger:section,start:'top top',end:'bottom bottom',pin:stage,pinSpacing:false,scrub:.55,anticipatePin:1,onUpdate:function(){render(proxy.p)}}});tl.to(proxy,{p:1,duration:1,ease:'none',onUpdate:function(){render(proxy.p)}});return cleanup;});}
 else{var ticking=false;scrollHandler=function(){if(ticking)return;ticking=true;requestAnimationFrame(function(){var r=section.getBoundingClientRect(),p=clamp(-r.top/Math.max(1,section.offsetHeight-window.innerHeight));render(p);ticking=false;});};resizeHandler=scrollHandler;window.addEventListener('scroll',scrollHandler,{passive:true});window.addEventListener('resize',resizeHandler);scrollHandler();}
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',function(){init(document.querySelector('[data-assembly-sequence]'));},{once:true});else init(document.querySelector('[data-assembly-sequence]'));
})();
