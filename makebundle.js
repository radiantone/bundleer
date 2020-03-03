const fs = require('fs');
var uglifycss = require('uglifycss');

var myArgs = process.argv.slice(2);

var DIR = "sites/" + myArgs[0];

var bundle = "";
var styles = [];

var scripts = JSON.parse(fs.readFileSync(DIR + "/scripts.json"));
var css = JSON.parse(fs.readFileSync(DIR + "/css.json"));

css.forEach(function (v) {
    console.log("Reading " + v['local']);
    styles.push(v['local']);
});

scripts.forEach(function (v) {
    console.log("Reading " + v['local']);
    var contents = fs.readFileSync(v['local'], 'utf8');
    bundle += contents;
    console.log(contents);
});

var uglified = uglifycss.processFiles(
    styles,
    { maxLineLen: 500, expandVars: true }
);
 
console.log(uglified);

fs.writeFile(DIR + "/bundle.css", uglified, () => { });
fs.writeFile(DIR + "/bundle.js", bundle, () => { });
