'use strict';

var gulp = require('gulp');
var gulpif = require('gulp-if');
var gutil = require('gulp-util');

var livereload = require('gulp-livereload');
var rename = require('gulp-rename');

(function() {
  var babelify = require('babelify');
  var browserify = require('browserify');
  var buffer = require('vinyl-buffer');
  var extend = require('lodash').extend;
  var path = require('path');
  var sourcemaps = require('gulp-sourcemaps');
  var source = require('vinyl-source-stream');
  var uglify = require('gulp-uglify');
  var watchify = require('watchify');

  function writeJSFile(name, shouldUglify) {
    var p = source(name);

    p.pipe(buffer())
      .pipe(sourcemaps.init({ loadMaps: true }))
      .pipe(gulpif(shouldUglify, uglify()))
      .pipe(sourcemaps.write('./'))
      .pipe(gulp.dest('./dev'))
      .pipe(livereload())
      .pipe(gulp.dest('./dist'));

    return p;
  }

  function buildBundler(watch, shouldUglify) {
    var entries = [
      'index.jsx'
    ];
    var customOpts = {
      entries: entries.map(function(e) { return './src/' + e; }),
      debug: true
    };
    var opts = extend({}, watchify.args, customOpts);

    var b = browserify(opts);
    if (watch) {
      b = watchify(b, {
        ignoreWatch: true
      });
      b.on('update', function() { bundleJS(b, false); });
      b.on('log', gutil.log);
    }

    b.transform(babelify);

    return b;
  }

  function bundleJS(b, shouldUglify) {
    return b.bundle()
      .on('error', gutil.log.bind(gutil, 'Browserify Error'))
      .pipe(writeJSFile('index.min.js', shouldUglify));
  }

  gulp.task('development:bundle-js', function() {
    return bundleJS(buildBundler(false, false), false);
  });
  gulp.task('production:bundle-js', function() {
    return bundleJS(buildBundler(false, true), true);
  });

  var eslint = require('gulp-eslint');
  gulp.task('eslint', function() {
    return gulp.src(['./src/**/*.{js,jsx}', 'animations/animate.js'])
      .pipe(eslint())
      .pipe(eslint.format());
  });

  gulp.task('watch-js', function() {
    bundleJS(buildBundler(true));
  });
})();

(function() {
  var less = require('gulp-less');
  var autoprefixer = require('gulp-autoprefixer');
  var csscomb = require('gulp-csscomb');

  gulp.task('csscomb', function() {
    return gulp.src(['src/css/*.css.less'])
      .pipe(csscomb())
      .pipe(gulp.dest('src/css'));
  });

  gulp.task('less', function() {
    return gulp.src('src/css/*.css.less')
      .pipe(less({
        strictMath: true
      }))
      .on('error', gutil.log.bind(gutil, 'LESS Error'))
      .pipe(autoprefixer())
      .on('error', gutil.log.bind(gutil, 'Autoprefixer Error'))
      .pipe(rename({ extname: '' })) // Change .css.css to .css.
      .pipe(gulp.dest('dev'))
      .pipe(livereload())
      .pipe(gulp.dest('dist'))
      .on('error', function() {});
  });
})();

(function() {
  var template = require('gulp-template');

  function templateEnv(file, env, dest) {
    return function() {
      return gulp.src([ file ])
        .pipe(template({ env: env }))
        .pipe(rename({ extname: '' }))
        .pipe(gulp.dest(dest))
        .pipe(livereload());
    };
  }

  gulp.task('development:template', templateEnv('index.html.erb', 'development', 'dev'));
}());

gulp.task('watch', ['watch-js'], function() {
  gulp.watch('src/css/*.*', ['less']);
  gulp.watch('*.html', ['development:template']);
  gulp.watch('src/**/*.{js,jsx}', ['eslint']);
  livereload.listen(35729);
});

gulp.task('default', [
  'eslint',
  'development:bundle-js',
  'development:template',
  'less'
]);
