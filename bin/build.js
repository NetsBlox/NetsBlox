'use strict';

var concat = require('concat'),
    path = require('path'),
    srcPath = path.join(__dirname, '..', 'src', 'client'),
    dstPath = path.join(__dirname, '..', 'build');

// Get the given js files
// TODO: Parse these files from the index.html file
var jsFiles = [
    'build-message',
    'map-shim',
    'morphic',
    'locale',
    'widgets',
    'blocks',
    'websockets',
    'threads',
    'messages',
    'netsblox',
    'objects',
    'gui',
    'paint',
    'lists',
    'byob',
    'xml',
    'store',
    'cloud',
    'sha512',
    'message-inputs',
    'message-listeners'
].map(name => path.join(srcPath, name + '.js'));

concat(jsFiles, path.join(srcPath, 'build.js'), function(err) {
    if (err) {
        return console.log('Error!', err);
    }
    console.log('Finished building build.js');
});

var devFiles = [
    path.join(__dirname, '..', 'src', 'virtual-client', 'virtual-helpers.js')
];

concat(jsFiles.concat(devFiles), path.join(srcPath, 'build-dev.js'), function(err) {
    console.log('Finished building build-dev.js');
});
