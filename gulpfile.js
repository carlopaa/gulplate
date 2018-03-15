'use strict';

const gulp = require('gulp');
const sass = require('gulp-sass');
const prefixer = require('gulp-autoprefixer');
const plumber = require('gulp-plumber');
const rename = require('gulp-rename');
const cssMinify = require('gulp-clean-css');
const pug = require('gulp-pug');
const del = require('del');
const browserSync = require('browser-sync').create();
const uglify = require('gulp-uglify');
const jshint = require('gulp-jshint');
const imagemin = require('gulp-imagemin');
const imageminPngquant = require('imagemin-pngquant');
const imageminZopfli = require('imagemin-zopfli');
const imageminMozjpeg = require('imagemin-mozjpeg');
const imageminGiflossy = require('imagemin-giflossy');
const purify = require('gulp-purifycss');
const notify = require('gulp-notify');
const gulpIf = require('gulp-if');
const inProduction = process.env.NODE_ENV === 'production';

const src = {
    sass: 'resources/assets/sass/*.scss',
    js: 'resources/assets/js/*.js',
    view: 'resources/views',
    vendor: 'resources/assets/vendor/**/*',
    images: 'resources/assets/images/**/*.+(png|jpg|jpeg|gif|svg)',
    fonts: 'resources/assets/fonts/**/*.+(svg|eot|ttf|woff|woff2)'
};

const output = {
    css: 'dist/assets/css',
    js: 'dist/assets/js',
    view: 'dist',
    vendor: 'dist/assets/vendor',
    images: 'dist/assets/images',
    fonts: 'dist/assets/fonts'
};

const onError = (error) => {
    console.log(error);
};

gulp.task('styles', () => {
    return gulp.src(src.sass)
        .pipe(plumber({errorHandler: notify.onError("Error: <%= error.message %>")}))
        .pipe(sass({outputStyle: 'expanded'}))
        .pipe(prefixer({browsers: ['> 1%','last 2 versions']}))
        .pipe(gulpIf(inProduction, purify([src.view + '/**/*.pug', src.js, output.view + '/**/*.html', src.vendor + '.js'])))
        .pipe(gulp.dest(output.css))
        .pipe(cssMinify({compatibility: 'ie10'}))
        .pipe(rename({suffix: '.min'}))
        .pipe(gulp.dest(output.css))
        .pipe(browserSync.stream())
        .pipe(notify({message: 'Styles compiled', onLast: true}));
});

gulp.task('scripts', () => {
    return gulp.src(src.js)
        .pipe(plumber({errorHandler: notify.onError("Error: <%= error.message %>")}))
        .pipe(jshint())
        .pipe(jshint.reporter('default'))
        .pipe(gulp.dest(output.js))
        .pipe(uglify())
        .pipe(rename({suffix: '.min'}))
        .pipe(gulp.dest(output.js))
        .pipe(notify({message: 'Scripts compiled', onLast: true}));
});

gulp.task('views', () => {
    return gulp.src(src.view + '/*.pug')
        .pipe(plumber({errorHandler: notify.onError("Error: <%= error.message %>")}))
        .pipe(pug({
            pretty: "\t"
        }))
        .pipe(gulp.dest(output.view))
        .pipe(notify({message: 'Views compiled', onLast: true}));
});

gulp.task('vendor', () => {
    return gulp.src(src.vendor)
        .pipe(gulp.dest(output.vendor))
        .pipe(notify({message: 'Vendor assets loaded', onLast: true}));
});

gulp.task('images', () => {
    return gulp.src(src.images)
        .pipe(imagemin([
            imageminPngquant({
                speed: 1,
                quality: 98
            }),
            imageminZopfli({
                more: true
            }),
            imageminGiflossy({
                optimizationLevel: 3,
                optimize: 3,
                lossy: 2
            }),
            imagemin.svgo({
                plugins: [{
                    removeViewBox: false
                }]
            }),
            imagemin.jpegtran({
                progressive: true
            }),
            imageminMozjpeg({
                quality: 90
            })
        ]))
        .pipe(gulp.dest(output.images))
        .pipe(notify({message: 'Images loaded', onLast: true}));
});

gulp.task('fonts', () => {
    return gulp.src(src.fonts)
        .pipe(gulp.dest(output.fonts))
        .pipe(notify({message: 'Fonts loaded', onLast: true}));
});

gulp.task('clean', () => {
    del('./dist');
});

gulp.task('scripts-watch', ['scripts'], (done) => {
    browserSync.reload();
    done();
} );

gulp.task('images-watch', ['images'], (done) => {
    browserSync.reload();
    done();
} );

gulp.task('fonts-watch', ['fonts'], (done) => {
    browserSync.reload();
    done();
} );

gulp.task('vendor-watch', ['vendor'], (done) => {
    browserSync.reload();
    done();
} );

gulp.task('view-watch', ['views'], (done) => {
    browserSync.reload();
    done();
} );

gulp.task('browser-sync', ['default'], () => {
    browserSync.init({
        server: {
            baseDir: './dist'
        },
        open: false
    });

    gulp.watch(['./resources/assets/sass/**/*.scss'], ['styles']);
    gulp.watch(src.view, ['views']);
    gulp.watch(src.js, ['scripts-watch']);
    gulp.watch(src.image, ['images-watch']);
    gulp.watch(src.fonts, ['fonts-watch']);
    gulp.watch(src.vendor, ['vendor-watch']);
    gulp.watch(src.view + '/**/*.pug', ['view-watch']);
    gulp.watch(output.view + '/*.html').on('change', browserSync.reload);
});

gulp.task('default', [
    'styles', 'views', 'scripts', 'vendor', 'images', 'fonts'
]);
