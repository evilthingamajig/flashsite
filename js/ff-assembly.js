(function(){
  var sequence=[
    {id:'case-shell',start:0,label:'3D-printed case',offset:[0,0]},
    {id:'battery',start:.08,label:'600 mAh lithium battery',offset:[145,-80],rotation:-80},
    {id:'recharge-module',start:.18,label:'recharge module',offset:[-130,32],rotation:60},
    {id:'wires',start:.28,label:'wires and connections',offset:[-84,78],rotation:-45},
    {id:'led',start:.39,label:'LED',offset:[112,88],rotation:80},
    {id:'solar-panel',start:.50,label:'5V solar panel',offset:[0,-138],rotation:-55}
  ];
  function clamp(value){return Math.max(0,Math.min(1,value));}
  function ease(value){return value<.5?2*value*value:1-Math.pow(-2*value+2,2)/2;}
  function init(root){
    if(!root||root.getAttribute('data-assembly-ready'))return;
    root.setAttribute('data-assembly-ready','true');
    var parts={};root.querySelectorAll('[data-part]').forEach(function(el){parts[el.getAttribute('data-part')]=el;});
    var photoMap={'battery':'rechargeable-battery.webp','recharge-module':'recharge-module.webp','led':'white-led.webp','solar-panel':'solar-panel.webp'};
    Object.keys(photoMap).forEach(function(id){var host=parts[id];if(!host)return;var img=document.createElementNS('http://www.w3.org/2000/svg','image');img.setAttribute('href','images/flashforward/assembly/'+photoMap[id]);img.setAttribute('x','250');img.setAttribute('y','235');img.setAttribute('width','220');img.setAttribute('height','115');img.setAttribute('preserveAspectRatio','xMidYMid meet');img.setAttribute('class','ff-assembly-photo');img.setAttribute('alt','');host.appendChild(img);});
    var svgLabels=root.querySelectorAll('.ff-assembly-svg .svg-label,.ff-assembly-svg .svg-dark-label');
    var track=root.querySelector('.ff-assembly-stage-column');
    var steps=root.querySelectorAll('.ff-assembly-steps li'),status=root.querySelector('#assembly-status'),finished=root.querySelector('#assembly-finished');
    var note=root.querySelector('.ff-assembly-note');if(note)note.textContent='Representative component imagery; parts may vary by build.';
    if(!track||!steps.length||!status||!finished)return;
    var reduced=window.matchMedia&&window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    function render(progress){
      var p=clamp(progress),assemble=ease(clamp((p-.65)/.25));
      sequence.forEach(function(item,index){
        var reveal=index===0?1:(p>=.55?1:clamp((p-item.start)/.07)),part=parts[item.id];if(!part)return;
        var spin=ease(reveal)*item.rotation*(1-assemble);
        part.style.opacity=String(reveal);part.style.transform='translate('+((1-assemble)*item.offset[0])+'px,'+((1-assemble)*item.offset[1])+'px) rotateZ('+spin+'deg)';
        steps[index].removeAttribute('aria-current');
      });
      var labelOpacity=clamp(1-(p-.55)/.35);svgLabels.forEach(function(label){label.style.opacity=String(labelOpacity)});
      var active=0;sequence.forEach(function(item,index){if(p>=item.start)active=index;});steps[active].setAttribute('aria-current','step');
      status.textContent=p>=.9?'Finished schematic':p>=.55?'Exploded assembly hold':'Assembly step: '+sequence[active].label;
      finished.style.opacity=String(clamp((p-.9)/.1));finished.setAttribute('aria-hidden',p>=.9?'false':'true');
    }
    if(reduced){root.setAttribute('data-motion','reduced');render(1);return;}
    if(window.gsap&&window.ScrollTrigger){
      window.gsap.registerPlugin(window.ScrollTrigger);
      window.ScrollTrigger.create({trigger:track,start:'top top',end:'bottom bottom',scrub:true,onUpdate:function(self){render(self.progress)},onRefresh:function(self){render(self.progress)}});
      render(0);
    }else{
      function update(){var rect=track.getBoundingClientRect(),span=Math.max(1,track.offsetHeight-window.innerHeight);render(clamp(-rect.top/span));}
      window.addEventListener('scroll',update,{passive:true});window.addEventListener('resize',update);update();
    }
  }
  function start(){var root=document.querySelector('[data-assembly-sequence]');if(root)init(root);}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();
