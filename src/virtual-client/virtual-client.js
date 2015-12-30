/*globals phantom*/
'use strict';
var page = require('webpage').create(),
    args = require('system').args;

if (args.length < 3) {
    console.log('Usage: phantomjs start-virtual-client.js <HOST> <PROJECT>');
    phantom.exit(1);
}

var host = args[1],
    CONSTANTS = require('../common/Constants'),
    username = CONSTANTS.GHOST.USER,
    password = CONSTANTS.GHOST.PASSWORD,
    project = args[2];

console.log('Connecting to ' + host + ' and opening project "' + project + '"');

// The server should start this virtual client
//
// Problems:
//  + How do they bypass login?
//      + Virtual user?

var saveCanvas = function(page, filename) {
    // FIXME: This next piece should depend on the size of the stage
    page.clipRect = {
        top: 0,
        left: 0,
        width: 1024,
        height: 768
    };
    console.log('Saving screenshot to ' + filename);
    page.render(filename);
};

page.viewportSize = { width: 1024, height: 768 };
page.onConsoleMessage = function(msg) {
    console.log(' - - - ' + msg + ' - - - ');
};

page.open(host, function(status) {
    console.log('status', status);
    // Testing
    setTimeout(function() {
        // Setup
        page.injectJs('./virtual-helpers.js');
        page.injectJs('./phantomjs-shim.js');

        startVirtualClient(function() {
            setTimeout(function() {
                saveCanvas(page, 'whole.png');
                phantom.exit();
            }, 1000);
        });
    }, 1000);
});

// Set up code
var login = function() {
    //jshint ignore:start
    helpers.signInAs('USERNAME', 'PASSWORD');
    //jshint ignore:end
}.toString()
    .replace('USERNAME', username)
    .replace('PASSWORD', password);

var openProject = function() {
    //jshint ignore:start
    helpers.openProject('PROJECT');
    //jshint ignore:end
}.toString()
    .replace('PROJECT', 'Fox' || project);

var startVirtualClient = function(done) {
    page.evaluate(login);

    // Open the given project
    page.evaluate(openProject);
    setTimeout(done, 2000);
};
