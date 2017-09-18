var fs = require("fs");
var browserify = require("browserify");
var babelify = require("babelify");

browserify({ debug: true })
    .transform(babelify)
    .require("./index.js", { entry: true })
    .bundle()
    .on("error", function (err) { console.log("Error: " + err.message); })
    .pipe(fs.createWriteStream("bundle.js"));

browserify({ debug: true })
    .transform(babelify)
    .require("./admin.js", { entry: true })
    .bundle()
    .on("error", function (err) { console.log("Error: " + err.message); })
    .pipe(fs.createWriteStream("bundle-admin.js"));