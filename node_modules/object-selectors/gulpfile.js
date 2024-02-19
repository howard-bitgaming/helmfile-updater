import gulp from 'gulp';
import tap from 'gulp-tap';
import rename from 'gulp-rename';
import peggy from 'peggy';

const buildParser = function() {
	return gulp.src('selector.peg')
		.pipe(tap(function(file) {
			file.contents = new Buffer(peggy.generate(file.contents.toString('utf-8'), {
				output: 'source-with-inline-map',
				grammarSource: 'selector.peg',
				format: 'es'
			}));
		}))
		.pipe(rename(function(path) {
			path.extname = '.js';
		}))
		.pipe(gulp.dest('.'));
}
buildParser.displayName = 'build-parser';

gulp.task(buildParser);
gulp.task(function watch() {
	gulp.watch(['*.peg'], { usePolling: process.env.GULP_WATCH_POLLING }, buildParser);
});