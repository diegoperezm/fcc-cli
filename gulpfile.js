var gulp     = require("gulp");
var prettier = require("gulp-prettier");

gulp.task("prettier", function() {
  return gulp
    .src("./src/index.js")
    .pipe(prettier())
    .pipe(gulp.dest("./src/"));
});

