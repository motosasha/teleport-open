/* global exports process console __dirname Buffer */
'use strict';

const {series, parallel, src, dest, watch, lastRun} = require('gulp');
const atImport              = require("postcss-import");
const autoprefixer          = require("autoprefixer");
const browserSync           = require('browser-sync').create();
const cheerio               = require('gulp-cheerio');
const cpy                   = require('cpy');
const csso                  = require('gulp-csso');
const debug                 = require('gulp-debug');
const del                   = require('del');
const fs                    = require('fs');
const getClassesFromHtml    = require('get-classes-from-html');
const ghPages               = require('gh-pages');
const inlineSVG             = require('postcss-inline-svg');
const mqpacker              = require("css-mqpacker");
const objectFitImages       = require('postcss-object-fit-images');
const path                  = require('path');
const plumber               = require('gulp-plumber');
const postcss               = require('gulp-postcss');
const prettyHtml            = require('gulp-pretty-html');
const pug                   = require('gulp-pug');
const rename                = require('gulp-rename');
const replace               = require('gulp-replace');
const rigger                = require('gulp-rigger');
const sass                  = require('gulp-sass');
const svgstore              = require('gulp-svgstore');
const svgmin                = require('gulp-svgmin');
const through2              = require('through2');
const uglify            	= require('gulp-uglify-es').default;
const webpackStream         = require('webpack-stream');

// Глобальные настройки
const ghPgs = process.env.ghPgs || false;
const idm = {};
idm.config = require('./config.js');
idm.blocksFromHtml = Object.create(idm.config.alwaysAddBlocks); // блоки из конфига сразу добавим в список блоков
idm.scssImportsList = []; // список импортов стилей
const dir = idm.config.source;

// Сообщение для компилируемых файлов
let doNotEditMsg = '\n ВНИМАНИЕ! Этот файл генерируется автоматически.\n\n';

// Настройки pug-компилятора
let pugOption = {
	data: {repoUrl: '',},
	filters: {'show-code': filterShowCode}
};

// Настройки бьютификатора
let prettyOption = {
	indent_with_tabs: '-s',
	indent_inner_html: true,
	extra_liners: ['body'],
	unformatted: ['code', 'em', 'strong', 'span', 'i', 'b', 'br', 'script'],
	content_unformatted: [],
};

// Список и настройки плагинов postCSS
let postCssPlugins = [
	autoprefixer({grid: true}),
	mqpacker({
		sort: true
	}),
	atImport(),
	inlineSVG(),
	objectFitImages(),
];



function writePugMixinsFile(cb) {
	let allBlocksWithPugFiles = getDirectories('pug');
	let pugMixins = '//-' + doNotEditMsg.replace(/\n /gm,'\n  ');
	allBlocksWithPugFiles.forEach(function(blockName) {
		pugMixins += `include ${dir.blocks.replace(dir.dev,'../')}${blockName}/${blockName}.pug\n`;
	});
	fs.writeFileSync(`${dir.dev}pug/mixins.pug`, pugMixins);
	cb();
}
exports.writePugMixinsFile = writePugMixinsFile;

function compilePug() {
	const fileList = [
		`${dir.dev}pages/**/*.pug`
	];
	return src(fileList)
		.pipe(plumber({
			errorHandler: function (err) {
				console.log(err.message);
				this.emit('end');
			}
		}))
		.pipe(debug({title: 'Compiles '}))
		.pipe(pug(pugOption))
		.pipe(prettyHtml(prettyOption))
		.pipe(through2.obj(getClassesToBlocksList))
		.pipe(dest(dir.build));
}
exports.compilePug = compilePug;

function compilePugFast() {
	const fileList = [
		`${dir.dev}pages/**/*.pug`
	];
	return src(fileList, { since: lastRun(compilePugFast) })
		.pipe(plumber({
			errorHandler: function (err) {
				console.log(err.message);
				this.emit('end');
			}
		}))
		.pipe(debug({title: 'Compiles '}))
		.pipe(pug(pugOption))
		.pipe(prettyHtml(prettyOption))
		.pipe(through2.obj(getClassesToBlocksList))
		.pipe(dest(dir.build));
}
exports.compilePugFast = compilePugFast;

function writeSassImportsFile(cb) {
	const newScssImportsList = [];
	idm.config.addStyleBefore.forEach(function(src) {
		newScssImportsList.push(src);
	});
	idm.config.alwaysAddBlocks.forEach(function(blockName) {
		if (fileExist(`${dir.blocks}${blockName}/${blockName}.scss`)) newScssImportsList.push(`${dir.blocks}${blockName}/${blockName}.scss`);
	});
	let allBlocksWithScssFiles = getDirectories('scss');
	allBlocksWithScssFiles.forEach(function(blockWithScssFile){
		let url = `${dir.blocks}${blockWithScssFile}/${blockWithScssFile}.scss`;
		if (idm.blocksFromHtml.indexOf(blockWithScssFile) == -1) return;
		if (newScssImportsList.indexOf(url) > -1) return;
		newScssImportsList.push(url);
	});
	idm.config.addStyleAfter.forEach(function(src) {
		newScssImportsList.push(src);
	});
	let diff = getArraysDiff(newScssImportsList, idm.scssImportsList);
	if (diff.length) {
		let msg = `\n/*!*${doNotEditMsg.replace(/\n /gm,'\n * ').replace(/\n\n$/,'\n */\n\n')}`;
		let styleImports = msg;
		newScssImportsList.forEach(function(src) {
			styleImports += `@import "${src}";\n`;
		});
		styleImports += msg;
		fs.writeFileSync(`${dir.dev}scss/style.scss`, styleImports);
		console.log('---------- Write new style.scss');
		idm.scssImportsList = newScssImportsList;
	}
	cb();
}
exports.writeSassImportsFile = writeSassImportsFile;

function compileSass() {
	const fileList = [
		`${dir.dev}scss/style.scss`,
	];
	return src(fileList, { sourcemaps: true })
		.pipe(plumber({
			errorHandler: function (err) {
				console.log(err.message);
				this.emit('end');
			}
		}))
		.pipe(debug({title: 'Compiles:'}))
		.pipe(sass({includePaths: [__dirname+'/','node_modules']}))
		.pipe(postcss(postCssPlugins))
		.pipe(csso({
			restructure: false,
		}))
		.pipe(dest(`${dir.build}/css`, { sourcemaps: '.' }))
		.pipe(browserSync.stream());
}
exports.compileSass = compileSass;

function compileLanding() {
	const fileList = [
		`${dir.landing}/landing.scss`,
	];
	return src(fileList, { sourcemaps: true })
		.pipe(plumber({
			errorHandler: function (err) {
				console.log(err.message);
				this.emit('end');
			}
		}))
		.pipe(debug({title: 'Compiles:'}))
		.pipe(sass({includePaths: [__dirname+'/','node_modules']}))
		.pipe(postcss(postCssPlugins))
		.pipe(csso({
			restructure: false,
		}))
		.pipe(dest(`${dir.build}/css`, { sourcemaps: '.' }))
		.pipe(browserSync.stream());
}
exports.compileLanding = compileLanding;

function buildJs(cb) {
	let jsPath = `${dir.dev}js/`;
	if(fileExist(jsPath)) {
		return src(jsPath + '*.js')
			.pipe(plumber())
			.pipe(rigger())
			.pipe(uglify())
			.pipe(dest(`${dir.build}js`));
	}
	else {
		cb();
	}
}
exports.buildJs = buildJs;

function copyAssets(cb) {
	let assetsPath = `${dir.dev}assets/`;
	if(fileExist(assetsPath)) {
		return src(assetsPath + '**/*.*')
			.pipe(dest(`${dir.build}assets/`))
	}
	else {
		cb();
	}
}
exports.copyAssets = copyAssets;

function copyAdditions(cb) {
	for (let item in idm.config.addAdditions) {
		let dest = `${dir.build}${idm.config.addAdditions[item]}`;
		cpy(item, dest);
	}
	cb();
}
exports.copyAssets = copyAssets;

function copyImg(cb) {
	let imgPath = `${dir.dev}img/`;
	if(fileExist(imgPath)) {
		return src(imgPath + '**/*.*')
			.pipe(dest(`${dir.build}img/`))
	}
	else {
		cb();
	}
}
exports.copyImg = copyImg;

function copySvg(cb) {
	let svgPath = `${dir.dev}svg/`;
	if(fileExist(svgPath)) {
		return src(svgPath + '**/*.svg')
			.pipe(dest(`${dir.build}img/`))
	}
	else {
		cb();
	}
}
exports.copySvg = copySvg;

function generateSvgSprite(cb) {
	let spriteSvgPath = `${dir.dev}symbols/`;
	if(fileExist(spriteSvgPath)) {
		return src(spriteSvgPath + '*.svg')
			.pipe(plumber({
				errorHandler: function (err) {
					console.log(err.message);
					this.emit('end');
				}
			}))
			.pipe(svgmin(function () {
				//return { plugins: [{ cleanupIDs: { minify: true } }] }
			}))
			.pipe(svgstore({ inlineSvg: true }))
			.pipe(cheerio({
				run: function ($) {
					let addition = fs.readFileSync(dir.svgAsBg, "utf8");
					$('svg').append(addition);
				},
				parserOptions: { xmlMode: true }
			}))
			.pipe(rename('svgSprite.svg'))
			.pipe(dest(`${dir.build}img/`));
	}
	else {
		cb();
	}
}
exports.generateSvgSprite = generateSvgSprite;

function copyFonts(cb) {
	let fontsPath = `${dir.dev}fonts/`;
	if(fileExist(fontsPath)) {
		return src(fontsPath + '**/*.*')
			.pipe(dest(`${dir.build}/fonts/`))
	}
	else {
		cb();
	}
}
exports.copyFonts = copyFonts;

function copyVideo(cb) {
	let imgPath = `${dir.dev}video/`;
	if(fileExist(imgPath)) {
		return src(imgPath + '**/*.*')
			.pipe(dest(`${dir.build}video/`))
	}
	else {
		cb();
	}
}
exports.copyVideo = copyVideo;



function clearBuildDir() {
	return del([
		`${dir.build}**/*`
	]);
}
exports.clearBuildDir = clearBuildDir;

function reload(done) {
	browserSync.reload();
	done();
}

function deploy(cb) {
	let pageAddress = '/agrostar';
	ghPages.publish(path.join(process.cwd(), './build'), cb);
}
exports.deploy = deploy;

function serve() {
	browserSync.init({
		server: dir.build,
		host: '192.168.1.39',
		logPrefix: "dev-server",
		port: 3000,
		startPath: 'index.html',
		open: false,
		notify: false,
	});

	// Страницы: изменение, добавление
	watch([`${dir.dev}pages/**/*.pug`], { events: ['change', 'add'], delay: 100 }, series(
		compilePugFast,
		parallel(writeSassImportsFile),
		parallel(compileSass, buildJs),
		reload
	));

	// Страницы: удаление
	watch([`${dir.dev}pages/**/*.pug`], { delay: 100 })
		.on('unlink', function(path) {
			let filePathInBuildDir = path.replace(`${dir.dev}pages/`, dir.build.pages).replace('.pug', '.html');
			fs.unlink(filePathInBuildDir, (err) => {
				if (err) throw err;
				console.log(`---------- Delete:  ${filePathInBuildDir}`);
			});
		});

	// Разметка Блоков: изменение
	watch([`${dir.blocks}**/*.pug`], { events: ['change'], delay: 100 }, series(
		compilePug,
		reload
	));

	// Разметка Блоков: добавление
	watch([`${dir.blocks}**/*.pug`], { events: ['add'], delay: 100 }, series(
		writePugMixinsFile,
		compilePug,
		reload
	));

	// Разметка Блоков: удаление
	watch([`${dir.blocks}**/*.pug`], { events: ['unlink'], delay: 100 }, writePugMixinsFile);

	// Шаблоны pug: все события
	watch([`${dir.dev}pug/**/*.pug`, `!${dir.dev}pug/mixins.pug`], { delay: 100 }, series(
		compilePug,
		parallel(writeSassImportsFile),
		parallel(compileSass, buildJs),
		reload,
	));

	// Стили Блоков: изменение
	watch([`${dir.blocks}**/*.scss`], { events: ['change'], delay: 100 }, series(
		compileSass,
	));

	// Стили Блоков: добавление
	watch([`${dir.blocks}**/*.scss`], { events: ['add'], delay: 100 }, series(
		writeSassImportsFile,
		compileSass,
	));

	// Стилевые глобальные файлы: все события
	watch([`${dir.dev}scss/**/*.scss`, `!${dir.dev}scss/style.scss`], { events: ['all'], delay: 100 }, series(
		compileSass,
	));

	// Скриптовые глобальные файлы: все события
	watch([`${dir.dev}js/**/*.js`, `!${dir.dev}js/entry.js`, `${dir.blocks}**/*.js`], { events: ['all'], delay: 100 }, series(
		//writeJsRequiresFile,
		buildJs,
		reload
	));

	// Копирование Assets
	watch([`${dir.dev}assets/**/*.*`], { events: ['all'], delay: 100 }, series(
		copyAssets,
		reload,
	));

	// Копирование Images
	watch([`${dir.dev}img/**/*.*`], { events: ['all'], delay: 100 }, series(
		copyImg,
		reload,
	));

	// Копирование SVG
	watch([`${dir.dev}svg/*.svg`], { events: ['all'], delay: 100 }, series(
		copySvg,
		reload,
	));

	// Спрайт SVG
	watch([`${dir.dev}symbols/*.svg`], { events: ['all'], delay: 100 }, series(
		generateSvgSprite,
		reload,
	));

	// Копирование шрифтов
	watch([`${dir.dev}fonts/`], { events: ['all'], delay: 100 }, series(
		copyFonts,
		reload,
	));
}


exports.build = series(
	parallel(clearBuildDir, writePugMixinsFile),
	parallel(compilePugFast, copyAssets, generateSvgSprite),
	parallel(copyAdditions, copyFonts, copyImg, copySvg, copyVideo),
	parallel(writeSassImportsFile),
	parallel(compileSass, buildJs)
);

exports.default = series(
	parallel(clearBuildDir, writePugMixinsFile),
	parallel(compilePugFast, copyAssets, generateSvgSprite),
	parallel(copyAdditions, copyFonts, copyImg, copySvg, copyVideo),
	parallel(writeSassImportsFile),
	parallel(compileSass, buildJs),
	serve,
);


// Функции, не являющиеся задачами Gulp ----------------------------------------

/**
 * Получение списка классов из HTML и запись его в глоб. переменную idm.blocksFromHtml.
 * @param  {object}   file Обрабатываемый файл
 * @param  {string}   enc  Кодировка
 * @param  {Function} cb   Коллбэк
 */
function getClassesToBlocksList(file, enc, cb) {
	// Передана херь — выходим
	if (file.isNull()) {
		cb(null, file);
		return;
	}
	// Проверяем, не является ли обрабатываемый файл исключением
	let processThisFile = true;
	idm.config.notGetBlocks.forEach(function(item) {
		if (file.relative.trim() == item.trim()) processThisFile = false;
	});
	// Файл не исключён из обработки, погнали
	if (processThisFile) {
		const fileContent = file.contents.toString();
		let classesInFile = getClassesFromHtml(fileContent);
		// idm.blocksFromHtml = [];
		// Обойдём найденные классы
		for (let item of classesInFile) {
			// Не Блок или этот Блок уже присутствует?
			if ((item.indexOf('__') > -1) || (item.indexOf('_') > -1) || (idm.blocksFromHtml.indexOf(item) + 1)) continue;
			// Класс совпадает с классом-исключением из настроек?
			if (idm.config.ignoredBlocks.indexOf(item) + 1) continue;
			// У этого блока отсутствует папка?
			// if (!fileExist(dir.blocks + item)) continue;
			// Добавляем класс в список
			idm.blocksFromHtml.push(item);
		}
		console.log('---------- Used HTML blocks: ' + idm.blocksFromHtml.join(', '));
		file.contents = new Buffer.from(fileContent);
	}
	this.push(file);
	cb();
}

/**
 * Pug-фильтр, выводящий содержимое pug-файла в виде форматированного текста
 */
function filterShowCode(text, options) {
	let lines = text.split('\n');
	let result = '<pre class="code">\n';
	if (typeof(options['first-line']) !== 'undefined') result = result + '<code>' + options['first-line'] + '</code>\n';
	for (let i = 0; i < (lines.length - 1); i++) { // (lines.length - 1) для срезания последней строки (пустая)
		result = result + '<code>' + lines[i].replace(/</gm, '&lt;') + '</code>\n';
	}
	result = result + '</pre>\n';
	result = result.replace(/<code><\/code>/g, '<code>&nbsp;</code>');
	return result;
}

/**
 * Проверка существования файла или папки
 * @param  {string} path - Путь до файла или папки
 * @return {boolean}
 */
function fileExist(filepath){
	let flag = true;
	try{
		fs.accessSync(filepath, fs.F_OK);
	}catch(e){
		flag = false;
	}
	return flag;
}

/**
 * Получение всех названий поддиректорий, содержащих файл указанного расширения, совпадающий по имени с поддиректорией
 * @param  {string} ext    Расширение файлов, которое проверяется
 * @return {array}         Массив из имён блоков
 */
function getDirectories(ext) {
	let source = dir.blocks;
	let res = fs.readdirSync(source)
		.filter(item => fs.lstatSync(source + item).isDirectory())
		.filter(item => fileExist(source + item + '/' + item + '.' + ext));
	return res;
}

/**
 * Получение разницы между двумя массивами.
 * @param  {array} a1 Первый массив
 * @param  {array} a2 Второй массив
 * @return {array}    Элементы, которые отличаются
 */
function getArraysDiff(a1, a2) {
	return a1.filter(i=>!a2.includes(i)).concat(a2.filter(i=>!a1.includes(i)))
}
