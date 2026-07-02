// add library before code <link rel="stylesheet"
// href="https://unpkg.com/swiper/swiper-bundle.min.css" /> <script
// src="https://unpkg.com/swiper/swiper-bundle.min.js"></script>
$(document).ready(function () {
      var slider_wrapper = new Swiper(".slider-wrapper", {
          wrapperClass: "slider-list",
      slideClass: "slider-item",
      navigation: {
        nextEl: '.next-slide',
        prevEl: '.prev-slide'
      },
      pagination: {
          type: 'bullets',
    el: '.pagination',
    clickable: true,

      },
  autoplay: {
          delay: 3000,
    disableOnInteraction: false,

      },
  speed: 700,
  slidesPerView: 'auto',
  loop: true,

        on: {
          init: function () {
              var swiper_pagination_bulletwe_style = document.createElement('style'); swiper_pagination_bulletwe_style.type = 'text/css'; swiper_pagination_bulletwe_style.innerHTML =
      ` .swiper-pagination-bullet{   background:#fff;
    margin-right:8px;
    transition:.2s;
   } `;
      document.getElementsByTagName('head')[0].appendChild(swiper_pagination_bulletwe_style);var swiper_pagination_bullethoverwe_style = document.createElement('style'); swiper_pagination_bullethoverwe_style.type = 'text/css'; swiper_pagination_bullethoverwe_style.innerHTML =
      ` .swiper-pagination-bullet:hover{   opacity:.7;
   } `;
      document.getElementsByTagName('head')[0].appendChild(swiper_pagination_bullethoverwe_style);var swiper_pagination_bullet_activehoverwe_style = document.createElement('style'); swiper_pagination_bullet_activehoverwe_style.type = 'text/css'; swiper_pagination_bullet_activehoverwe_style.innerHTML =
      ` .swiper-pagination-bullet-active:hover{   opacity:1;
   } `;
      document.getElementsByTagName('head')[0].appendChild(swiper_pagination_bullet_activehoverwe_style);var swiper_pagination_fractionwe_style = document.createElement('style'); swiper_pagination_fractionwe_style.type = 'text/css'; swiper_pagination_fractionwe_style.innerHTML =
      ` .swiper-pagination-fraction{   font-size:16px;
   } `;
      document.getElementsByTagName('head')[0].appendChild(swiper_pagination_fractionwe_style);var slide_imagewe_style = document.createElement('style'); slide_imagewe_style.type = 'text/css'; slide_imagewe_style.innerHTML =
      ` .slide-image{   transition:transform .2s;
   } `;
      document.getElementsByTagName('head')[0].appendChild(slide_imagewe_style);var slide_contentwe_style = document.createElement('style'); slide_contentwe_style.type = 'text/css'; slide_contentwe_style.innerHTML =
      ` .slide-content{   transition:opacity .2s;
   } `;
      document.getElementsByTagName('head')[0].appendChild(slide_contentwe_style);$('.slider-item').on('mouseover',function() {
    $(this).find('.slide-image').css({
      'transform':'scale(1.1)',
    });
    $(this).find('.slide-content').css({
      'opacity':'.8',
    });
  });
  $('.slider-item').on('mouseout',function() {
    $(this).find('.slide-image').css({
      'transform':'scale(1)',
    });
    $(this).find('.slide-content').css({
      'opacity':'1',
    });
  });

          },
        },
      });
    });
