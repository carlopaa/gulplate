'use strict';

const del = require('del');
const gulp = require('gulp');
const pug = require('gulp-pug');
const sass = require('gulp-sass');
const gulp_if = require('gulp-if');
const newer = require('gulp-newer');
const uglify = require('gulp-uglify');
const rename = require('gulp-rename');
const jshint = require('gulp-jshint');
const notify = require('gulp-notify');
const plumber = require('gulp-plumber');
const imagemin = require('gulp-imagemin');
const purgecss = require('gulp-purgecss');
const css_minify = require('gulp-clean-css');
const prefixer = require('gulp-autoprefixer');
const browser_sync = require('browser-sync').create();
const in_production = process.env.NODE_ENV === 'production';

const src = {
    sass: 'resources/assets/sass/*.scss',
    js: 'resources/assets/js/*.js',
    views: 'resources/views',
    vendor: 'resources/assets/vendor/**/*',
    images: 'resources/assets/images/**/*.+(png|jpg|jpeg|gif|svg)',
    fonts: 'resources/assets/fonts/**/*.+(svg|eot|ttf|woff|woff2)'
}

const output = {
    css: 'dist/assets/css',
    js: 'dist/assets/js',
    views: 'dist',
    vendor: 'dist/assets/vendor',
    images: 'dist/assets/images',
    fonts: 'dist/assets/fonts'
}

/**
 * Error log
 */
const onError = error => {
    console.error(error);
}

/** Handles sass styles */
function styles() {
    return gulp.src(src.sass)
        .pipe(plumber({errorHandler: notify.onError("Error: <%= error.message %>")}))
        .pipe(sass({outputStyle: 'expanded'}))
        .pipe(prefixer({browsers: ['> 1%','last 2 versions']}))
        .pipe(gulp_if(in_production, purgecss({
            content: [
                src.views + '/**/*.pug',
                src.js,
                output.views + '/**/*.html',
                src.vendor + '.js'
            ]
        })))
        .pipe(gulp.dest(output.css))
        .pipe(css_minify({compatibility: 'ie10'}))
        .pipe(rename({suffix: '.min'}))
        .pipe(gulp.dest(output.css))
        .pipe(browser_sync.stream())
        .pipe(notify({message: 'Styles compiled', onLast: true}));
}

/** Handles scripts */
function scripts() {
    return gulp.src(src.js)
        .pipe(plumber({errorHandler: notify.onError("Error: <%= error.message %>")}))
        .pipe(jshint())
        .pipe(jshint.reporter('default'))
        .pipe(gulp.dest(output.js))
        .pipe(uglify())
        .pipe(rename({suffix: '.min'}))
        .pipe(gulp.dest(output.js))
        .pipe(notify({message: 'Scripts compiled', onLast: true}));
}

/** Handles Pug views */
function views() {
    return gulp.src(src.views + '/*.pug')
        .pipe(plumber({errorHandler: notify.onError("Error: <%= error.message %>")}))
        .pipe(pug({
            pretty: "\t"
        }))
        .pipe(gulp.dest(output.views))
        .pipe(notify({message: 'Views compiled', onLast: true}));
}

/** Handles vendor plugins / library */
function vendors() {
    return gulp.src(src.vendor)
        .pipe(gulp.dest(output.vendor))
        .pipe(notify({message: 'Vendor assets loaded', onLast: true}));
}

/** Handles images */
function images() {
    return gulp.src(src.images)
        .pipe(newer(output.images))
        .pipe(imagemin({
            interlaced: true,
            progressive: true,
            optimizationLevel: 5,
            svgoPlugins: [{removeViewBox: true}]
        }))
        .pipe(gulp.dest(output.images))
        .pipe(notify({message: 'Images loaded', onLast: true}));
}

/** Handles fonts */
function fonts() {
    return gulp.src(src.fonts)
        .pipe(gulp.dest(output.fonts))
        .pipe(notify({message: 'Fonts loaded', onLast: true}));
}

/** Cleans the dist folder */
function clean() {
    return del('./dist');
}

/** Files to watch */
function watchFiles(done) {
    gulp.watch(src.sass.replace('*', '**/*'), styles);
    gulp.watch(src.js, gulp.series(scripts, browserSyncReload));
    gulp.watch(src.views + '/**/*.pug', gulp.series(views, browserSyncReload));
    gulp.watch(src.images, images);
    gulp.watch(src.fonts, fonts);
    gulp.watch(src.vendor, vendors);

    done();
}

/** Reloads BrowserSync */
function browserSyncReload(done) {
    browser_sync.reload();
    done();
}

/** Initialize BrowserSync */
function browserSync() {
    return browser_sync.init({
        server: {
            baseDir: './dist'
        },
        open: false
    });
}

gulp.task('clean', clean);
gulp.task('default', gulp.parallel(styles, scripts, views, fonts, images, vendors));
gulp.task('watch', gulp.series(watchFiles, browserSync));
