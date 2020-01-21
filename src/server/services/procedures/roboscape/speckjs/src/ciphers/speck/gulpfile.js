'use strict'

var gulp = require('gulp')
var clean = require('gulp-rimraf')
var concat = require('gulp-concat')
var sourcemaps = require('gulp-sourcemaps');
var sjs = require('gulp-sweetjs')
var merge = require('merge-stream')
var uglify = require('gulp-uglify')

gulp.task('default', ['build-node'])

gulp.task('clean', function () {
	return gulp.src('lib/*', {read: false}).
		pipe(clean())
})

gulp.task('compile', ['clean'], function () {
	return gulp.src('src/*.sjs').
		pipe(sourcemaps.init()).
			pipe(sjs({
				readableNames: true,
				modules: ['./src/macros/speck'],
			})).
		pipe(sourcemaps.write('.')).
	pipe(gulp.dest('lib'))
})

var versions = require('./src/versions')

gulp.task('build-node', ['compile', 'copy'], function () {
	return merge.apply(null, versions.map(function (v) {
		return gulp.src(['lib/' + v.replace('/', '_') + '_*.js', 'src/inc/commonjs-exports.js']).
			pipe(sourcemaps.init({loadMaps: true})).
				pipe(concat(v + '.js')).
			pipe(sourcemaps.write('.')).
		pipe(gulp.dest('lib'))
	}))
})

gulp.task('copy', ['clean'], function () {
	return gulp.src(['src/*.js', 'src/*.json']).pipe(gulp.dest('lib'))
})