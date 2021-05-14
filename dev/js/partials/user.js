'use strict';

$(document).ready(function() {
	//tabs
	$('ul.tabs__caption').on('click', 'li:not(.tabs__item_active)', function() {
		$(this).addClass('tabs__item_active').siblings().removeClass('tabs__item_active')
			.closest('.tabs').find('.tabs__tab').removeClass('tabs__tab_active').eq($(this).index()).addClass('tabs__tab_active');
	})

	$('input[type="tel"]').mask("+7 (999) 999-99-99");

	/*
	$('.header a.nav__link').on('click', function(event) {
		if (this.hash !== "") {
			event.preventDefault();
			let hash = this.hash;
			$('html, body').animate({
				scrollTop: $(hash).offset().top
			}, 800, function(){
				window.location.hash = hash;
			});
		}
	});
	*/
});
