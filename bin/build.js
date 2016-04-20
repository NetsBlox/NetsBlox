'use strict';

var fs = require('fs'),
    path = require('path'),
    srcPath = path.join(__dirname, '..', 'src', 'client'),
    dstPath = path.join(__dirname, '..', 'build');

// Get the given js files
var devHtml = fs.readFileSync(path.join(srcPath, 'netsblox-dev.html'), 'utf8'),
    re = /text\/javascript" src="(.*)">/,
    match = devHtml.match(re),
    srcFiles = [];

while (match) {
    srcFiles.push(match[1]);
    devHtml = devHtml.substring(match.index + match[0].length);
    match = devHtml.match(re);
}
console.log('concatting and minifying:', srcFiles);
srcFiles = srcFiles.map(file => path.join(srcPath, file));
var src = srcFiles
    .map(file => fs.readFileSync(file, 'utf8'))
    .join('\n');

var ugly = require("uglify-js");

console.log('dev src length:', src.length);
var final_code = ugly.minify(srcFiles, {outSourceMap: path.join(srcPath, 'netsblox-build.js.map')});

console.log('output length:', final_code.code.length);
console.log('compression ratio:', 1-(final_code.code.length/src.length));

fs.writeFileSync(path.join(srcPath, 'netsblox-build.js'), final_code.code);
