'use strict';

$(document).ready(function() {
	// tabs
	$('ul.tabs__caption').on('click', 'li:not(.tabs__item_active)', function() {
		$(this).addClass('tabs__item_active').siblings().removeClass('tabs__item_active')
			.closest('.tabs').find('.tabs__tab').removeClass('tabs__tab_active').eq($(this).index()).addClass('tabs__tab_active');
	})
	// input mask
	$('.input_phone').toArray().forEach(function(field){
		new Cleave(field, {
			prefix: '+7 ',
			phone: true,
			phoneRegionCode: 'RU'
		});
	});
	$('.input_sum').toArray().forEach(function(field){
		new Cleave(field, {
			delimiter: ' ',
			numeral: true,
			numeralThousandsGroupStyle: 'thousand'
		});
	});
	// date picker
	$('.input_date').datepicker();
	$('.input_date_period').datepicker({
		minDate: new Date(),
		range: true,
		multipleDatesSeparator: " – "
	});
	// calculator
	let calcExec = $('#calcExec'),
		calcPart = $('#calcPart'),
		calcGO = $('#calcGO'),
		calcVA = $('#calcVA'),
		calcRadio = $('.calculator__radios input.checkbox__input');
	$('[name="calcTab"]').change(function(){
		if ($(this).val() === '0') {
			calcExec.prop('checked', true);
			calcPart.prop('disabled', false);
			calcGO.prop('disabled', false);
			calcVA.prop('disabled', true);
			calcRadio.prop('checked', false);
		}
		else if ($(this).val() === '1') {
			calcExec.prop('checked', true);
			calcPart.prop('disabled', false);
			calcGO.prop('disabled', false);
			calcVA.removeAttr("disabled");
			calcRadio.prop('checked', false);
		}
		else if ($(this).val() === '2') {
			calcExec.prop('checked', true);
			calcPart.prop('disabled', true);
			calcGO.prop('disabled', true);
			calcVA.prop('disabled', true);
			calcRadio.prop('checked', false);
		}
	});
	// table sort
	$('.calculator-table').stupidtable();
	// hero slider
	let heroSlider = new Swiper('.hero-slider', {
		autoplay: {
			delay: 5000,
			disableOnInteraction: false,
		},
		speed: 600,
		loop: true,
		pagination: {
			el: '.hero-slider__pagination',
			clickable: true,
		}
	});
	// partners slider
	let partnersSlider = new Swiper('.partners-slider', {
		autoplay: {
			delay: 5000,
			disableOnInteraction: false,
		},
		navigation: {
			nextEl: ".partners-slider__button-next",
			prevEl: ".partners-slider__button-prev",
		},
		speed: 600,
		loop: true,
		breakpoints: {
			300: {
				slidesPerView: 1,
			},
			768: {
				slidesPerView: 2,
				spaceBetween: 20,
			},
			1200: {
				slidesPerView: 3,
				spaceBetween: 16,
			},
		},
	});

	// modals
	const modals = new HystModal({
		linkAttributeName: "data-hystmodal",
		catchFocus: false
	});

	// drop nav
	let page = document.querySelector('.page');
	let headerDropTrigger = document.querySelector('.header-nav__trigger');
	headerDropTrigger.addEventListener('click', function () {
		page.classList.toggle('page_nav_open');
	});
	document.documentElement.addEventListener('click', function(e) {
		if (e.target !== headerDropTrigger && !headerDropTrigger.contains(e.target)) {
			page.classList.remove('page_nav_open');
		}
	});

	// scroll
	$('.header a.header-nav__text').on('click', function(event) {
		if (this.hash !== "") {
			if (this.href === location.href) {
				event.preventDefault();
			}
			let hash = this.hash;
			if ($(hash).length) {
				$('html, body').animate({
					scrollTop: $(hash).offset().top
				}, 800);
			}
		}
	});

	// to top
	let btn = $('.page__to-top');
	$(window).scroll(function() {
		if ($(window).scrollTop() > 300) {
			btn.addClass('show');
		} else {
			btn.removeClass('show');
		}
	});
	btn.on('click', function(e) {
		e.preventDefault();
		$('html, body').animate({scrollTop:0}, '300');
	});

	// aos
	AOS.init({
		easing: 'ease',
		duration: 1000
	});
	if (document.readyState === 'complete') {
		AOS.refresh();
	}

	// tippy
	tippy('[data-tippy-content]');
});
