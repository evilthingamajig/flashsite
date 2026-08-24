(function(){
  function reduced(){return window.matchMedia&&window.matchMedia('(prefers-reduced-motion: reduce)').matches;}
  function init(){
    var section=document.querySelector('.section-worldmap');
    var wrapper=section&&section.querySelector('.map-dotted-wrapper');
    var headline=section&&section.querySelector('#worldmap-headline');
    var paragraphs=section?section.querySelectorAll('.paragraph-base'):[];
    var buttons=section?section.querySelectorAll('.button-base'):[];
    if(!section||!wrapper||!headline||!paragraphs.length)return;
    if(!reduced()&&buttons.length)return;
    if(section.getAttribute('data-ff-map-optional-ready'))return;
    section.setAttribute('data-ff-map-optional-ready','true');
    if(reduced()){
      wrapper.style.clipPath='circle(100%)';
      headline.style.transform='none';
      paragraphs.forEach(function(item){item.style.opacity='1';item.style.transform='none';});
      return;
    }
    if(window.gsap&&window.ScrollTrigger){
      window.gsap.timeline({scrollTrigger:{trigger:wrapper,start:'top 50%',markers:false,toggleActions:'play none none none'}})
        .from(headline,{y:'120%',ease:'Power4.easeOut',duration:.65})
        .to(wrapper,{clipPath:'circle(100%)',ease:'Power4.easeOut',duration:3},'-=0.8')
        .from(paragraphs,{y:'120%',ease:'Power4.easeOut',duration:1},.2);
    }else{
      wrapper.style.clipPath='circle(100%)';
    }
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});
  else init();
})();
