const gulp = require('gulp');
const less = require('gulp-less');
const watch = require('gulp-watch');
const batch = require('gulp-batch');
const plumber = require('gulp-plumber');
const rename = require('gulp-rename');
const jetpack = require('fs-jetpack');
const bundle = require('./bundle');
const utils = require('./utils');
const debug = require('gulp-debug');

const projectDir = jetpack;
const srcDir = jetpack.cwd('./src');
const destDir = jetpack.cwd('./app');
const iconDir = jetpack.cwd('./build');

gulp.task('bundle', () => {
  return Promise.all([
    bundle(srcDir.path('background.js'), destDir.path('background.js')),
    bundle(srcDir.path('app.js'), destDir.path('app.js'))
  ]);
});

gulp.task('less', () => {
  return gulp.src(srcDir.path('stylesheets/*.less'))
  .pipe(plumber())
  .pipe(less())
  .pipe(gulp.dest(destDir.path('stylesheets')));
});

gulp.task('icon', () => {
  return gulp.src(iconDir.path('icons/512x512.png'))
  .pipe(rename('icon.png'))
  .pipe(gulp.dest(destDir.path('')));
});

gulp.task('watch', () => {
  const beepOnError = (done) => {
    return (err) => {
      if (err) {
        utils.beepSound();
      }
      done(err);
    };
  };

  watch('src/**/*.js', batch((events, done) => {
    gulp.start('bundle', beepOnError(done));
  }));
  watch('src/**/*.less', batch((events, done) => {
    gulp.start('less', beepOnError(done));
  }));
});

gulp.task('build', ['bundle', 'less', 'icon']);
