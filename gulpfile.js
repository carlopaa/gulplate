'use strict';

const del = require('del');
const gulp = require('gulp');
const pug = require('gulp-pug');
const tap = require('gulp-tap');
const size = require('gulp-size');
const sass = require('gulp-sass');
const gulpIf = require('gulp-if');
const newer = require('gulp-newer');
const babelify = require('babelify');
const uglify = require('gulp-uglify');
const rename = require('gulp-rename');
const notify = require('gulp-notify');
const eslint = require('gulp-eslint');
const pkg = require('./package.json');
const comment = require('gulp-header');
const buffer = require('vinyl-buffer');
const browserify = require('browserify');
const plumber = require('gulp-plumber');
const imagemin = require('gulp-imagemin');
const purgecss = require('gulp-purgecss');
const npmDist = require('gulp-npm-dist');
const cssMinify = require('gulp-clean-css');
const prefixer = require('gulp-autoprefixer');
const source = require('vinyl-source-stream');
const stripDebug = require('gulp-strip-debug');
const browserSync = require('browser-sync').create();
const inProduction = process.env.NODE_ENV === 'production';

const src = {
    sass: 'src/assets/sass/*.scss',
    js: 'src/assets/js/*.js',
    views: 'src/views',
    vendor: 'src/assets/vendor/**/*',
    images: 'src/assets/images/**/*.+(png|jpg|jpeg|gif|svg)',
    fonts: 'src/assets/fonts/**/*.+(svg|eot|ttf|woff|woff2)'
}

const dist = {
    css: 'dist/assets/css',
    js: 'dist/assets/js',
    views: 'dist',
    vendor: 'dist/assets/vendor',
    images: 'dist/assets/images',
    fonts: 'dist/assets/fonts'
}

/**
 * Clean / deletes a folder
 *
 * @param  String folder
 *
 * @return Promise
 */
function clean () {
    return del('./dist');
}

/**
 * Header comments
 *
 * @return stream
 */
function header () {
    const homepage = pkg.homepage ? `(${pkg.homepage})` : '';

    return comment([
        '/*!',
        ` * ${ucwords(pkg.name.split('-').join(' '))} v${pkg.version} ${homepage}`,
        ` * Licensed under ${pkg.license}`,
        ` * (c) ${pkg.author}`,
        ' */',
        ''
    ].join('\n'), { pkg: pkg });
}

/**
 * Extracts npm dependencies in package.json
 *
 * @return stream
 */
function libraries () {
    return gulp.src(npmDist(), { base: './node_modules' })
        .pipe(plumber(errorHandler()))
        .pipe(rename(path => path.dirname = path.dirname.replace(/\/dist/, '').replace(/\\dist/, '')))
        .pipe(size({ title: 'npm packages' }))
        .pipe(gulp.dest(dist.vendor))
        .pipe(success('npm packages extracted'));
}

/**
 * Gets each npm dependency paths
 *
 * @param  String append
 *
 * @return Array
 */
function npmPackagePaths (append) {
    let packages = [];

    Object.keys(pkg.dependencies).map(function (dependency) {
        packages.push(`node_modules/${dependency}/${append}`);
    });

    return packages;
}

/**
 * Handles styles
 * Converts sass to css
 * Add vendor prefixes
 * Removes unused css rules if NODE_ENV in production
 *
 * @return stream
 */
function styles () {
    const toPurge = npmPackagePaths('**/*.js').concat([
        src.views + '/**/*.pug',
        src.js,
        dist.views + '/**/*.html',
    ]);

    return gulp.src(src.sass)
        .pipe(tap(function (f, t) {
            const file = f.path;
            const fileName = file.replace(/^.*[\\\/]/, '');

            gulp.src(src.sass.replace('*.scss', '') + fileName)
                .pipe(plumber(errorHandler()))
                .pipe(sass({distStyle: 'expanded'}))
                .pipe(prefixer())
                .pipe(gulpIf(inProduction, purgecss({ content: toPurge })))
                .pipe(gulpIf(fileName !== 'vendor.scss', header()))
                .pipe(size({ showFiles: true }))
                .pipe(gulp.dest(dist.css))
                .pipe(cssMinify({compatibility: 'ie10'}))
                .pipe(rename({suffix: '.min'}))
                .pipe(size({ showFiles: true }))
                .pipe(gulp.dest(dist.css))
                .pipe(browserSync.stream());
        })).pipe(success('Styles compiled'));
}

/**
 * Eslinting
 *
 * @return stream
 */
function esLint () {
    return gulp.src([src.js])
        .pipe(plumber(errorHandler()))
        .pipe(eslint())
        .pipe(eslint.format())
        .pipe(eslint.failAfterError());
}

/**
 * Handles javascript
 * Converts ES6 to ES5
 * Minify and compress
 *
 * @return stream
 */
function scripts () {
    return gulp.src(src.js).pipe(tap(function (f, t) {
        const file = f.path;
        const fileName = file.replace(/^.*[\\\/]/, '');

        return browserify({ entries: src.js.replace('*.js', '') + fileName })
            .transform(babelify, { presets: ['@babel/preset-env'] })
            .bundle()
            .pipe(source(fileName))
            .pipe(buffer())
            .pipe(gulpIf(inProduction, stripDebug()))
            .pipe(gulpIf(fileName !== 'vendor.js', header()))
            .pipe(size({ showFiles: true }))
            .pipe(gulpIf(fileName !== 'vendor.js', gulp.dest(dist.js)))
            .pipe(rename({ suffix: '.min' }))
            .pipe(uglify())
            .pipe(gulpIf(fileName !== 'vendor.js', header()))
            .pipe(size({ showFiles: true }))
            .pipe(gulp.dest(dist.js))
            .pipe(browserSync.stream())
            .pipe(success('Scripts compiled'));
    }));
}

/**
 * Handles pug / jade template and converts to html
 *
 * @return stream
 */
function views () {
    return gulp.src(src.views + '/*.pug')
        .pipe(plumber(errorHandler()))
        .pipe(pug({ pretty: "\t" }))
        .pipe(size({ showFiles: true }))
        .pipe(gulp.dest(dist.views))
        .pipe(browserSync.stream())
        .pipe(success('Views compiled'));
}

/**
 * Handles image copy and optimization
 *
 * @return stream
 */
function images () {
    const options = [
        imagemin.gifsicle({ interlaced: true }),
        imagemin.jpegtran({ progressive: true }),
        imagemin.optipng({ optimizationLevel: 5 }),
        imagemin.svgo({
            plugins: [{
                removeViewBox: false,
                collapseGroups: true
            }]
        })
    ];

    return gulp.src(src.images)
        .pipe(newer(dist.images))
        .pipe(imagemin(options, { verbose: true }))
        .pipe(gulp.dest(dist.images))
        .pipe(success('Images loaded'));
}

/**
 * Copies fonts from src to dist
 *
 * @return stream
 */
function fonts () {
    return gulp.src(src.fonts)
        .pipe(size({ showFiles: true }))
        .pipe(gulp.dest(dist.fonts))
        .pipe(success('Fonts loaded'));
}

/**
 * Watch files for changes and trigger task
 *
 * @param  Function done
 *
 * @return callback
 */
function watchFiles (done) {
    gulp.watch(src.sass.replace('*', '**/*'), styles);
    gulp.watch(src.js, gulp.series(esLint, scripts));
    gulp.watch(src.views + '/**/*.pug', views);
    gulp.watch(src.images, images);
    gulp.watch(src.fonts, fonts);
    gulp.watch(src.vendor, vendors);

    done();
}

/**
 * Reloads browser sync
 * @param  Function done
 *
 * @return callback
 */
function browserSyncReload (done) {
    browserSync.reload();
    done();
}

/**
 * Initialize browser sync
 *
 * @return stream
 */
function sync () {
    return browserSync.init({
        server: {
            baseDir: './dist'
        },
        open: false
    });
}

/**
 * Capitalize every first character of each word
 *
 * @param  String str
 *
 * @return String
 */
function ucwords(str) {
    return (str + '').replace(/^(.)|\s+(.)/g, function ($1) {
        return $1.toUpperCase();
    });
}

/**
 * Notify handler error message
 *
 * @return Object
 */
function errorHandler () {
    return {
        errorHandler: notify.onError("Error: <%= error.message %>")
    }
}

function success (message) {
    return notify({
        message: message,
        onLast: true
    });
}

/** Gulp tasks */
gulp.task('clean', clean);
gulp.task('watch', gulp.series(watchFiles, sync));
gulp.task('default', gulp.parallel(views, fonts, images, libraries, gulp.series(esLint, scripts), styles));
