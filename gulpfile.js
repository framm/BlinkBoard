'use strict';

// Import modules
var gulp = require('gulp');
var exec = require('child_process')
	.exec;
var livereload = require('gulp-livereload');
var sass = require('gulp-sass');

// Paths
var styling = 'public/sass/';
var viewerStyling = 'public/viewers/';
var client = ['public/javascripts/**/*', 'public/templates/**/*', 'public/viewers/**/*', 'public/ui-router/**/*'];
var server = ['app.js', '.env', 'viewer_modules/**/*', 'views/**/*'];

// Compile sass and livereload
gulp.task('styling', function () {
	console.log('Compiling sass and reloading client');

	gulp.src(styling + '**/*.scss')
		.pipe(sass()
			.on('error', sass.logError))
		.pipe(gulp.dest(styling))
		.pipe(livereload());
});

// Compile viewer sass and livereload
gulp.task('viewerStyling', function () {
	console.log('Compiling viewer sass and reloading client');

	var viewers = ['currencyviewer', 'rssviewer', 'stockviewer'];

	for (var i = viewers.length - 1; i >= 0; i--) {
		gulp.src(viewerStyling + viewers[i] + '/' + viewers[i] + '.scss')
			.pipe(sass()
				.on('error', sass.logError))
			.pipe(gulp.dest(viewerStyling + viewers[i]));
	}

	livereload();
});

// Reload on client changes
gulp.task('client', function () {
	console.log('Reloading client');

	gulp.src(client)
		.pipe(livereload());
});

// Reload on client changes
gulp.task('server', function (cb) {
	console.log('Reloading server');

	var nodeProcess = exec('node blinkboard');

	nodeProcess.stdout.pipe(process.stdout);
	nodeProcess.stderr.pipe(process.stderr);

	gulp.src(server)
		.pipe(livereload());
});

// Initial run
gulp.task('default', function (cb) {
	console.log('Starting server');

	var nodeProcess = exec('node blinkboard');

	nodeProcess.stdout.pipe(process.stdout);
	nodeProcess.stderr.pipe(process.stderr);

	gulp.watch(styling + '**/*.scss', ['styling']);
	gulp.watch(viewerStyling + '**/*.scss', ['viewerStyling']);
	gulp.watch(client, ['client']);
	gulp.watch(server, ['server']);

	livereload.listen();
});
