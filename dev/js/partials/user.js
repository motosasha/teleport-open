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
