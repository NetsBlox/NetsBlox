'use strict';

var phantom = require('phantom'),
    debug = require('debug'),
    browserLog = debug('NetsBlox:VirtualClient:Browser:log'),
    args = process.argv;

// TODO: Add command line flag for monitoring
// TODO: We need to be able to query the state remotely...
if (args.length < 3) {
    console.log('Usage: node start-virtual-client.js <HOST> [PROJECT]');
    process.exit(1);
}

var host = args[2],
    CONSTANTS = require('../common/Constants'),
    username = CONSTANTS.GHOST.USER,
    password = CONSTANTS.GHOST.PASSWORD,
    project = args[3];

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
    page.render(filename);
};

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
    var dialog = helpers.openProject('PROJECT');
    setTimeout(function() {
        console.log(dialog.getProjectList());
    }, 1000);
    //jshint ignore:end
}.toString()
    .replace('PROJECT', project);

var startVirtualClient = function(page, done) {
    // FIXME: "login" should block until the user is logged in
    page.evaluate(login);

    // Open the given project
    console.log('project:', typeof project);
    console.log('project:', !!project);
    if (project) {
        setTimeout(
            function() {page.evaluate(openProject);},
            500
        );
    }
    setTimeout(done, 1100);
};

phantom.create(ph => {
    ph.createPage(page => {

        // Customize the page
        page.set('viewportSize', { width: 1024, height: 768 });
        page.set('onConsoleMessage', function(msg) {
            browserLog(msg);
        });

        page.open(host, function(status) {
            if (status !== 'success') {
                console.error('Could not open page: ' + status);
                process.exit(1);
            }
            // Testing
            setTimeout(function() {
                // Setup
                page.injectJs('./virtual-helpers.js');
                page.injectJs('./phantomjs-shim.js');

                // Periodically take screenshots to help with debugging
                var filename = 'whole.png';
                console.log('Saving screenshot to ' + filename);
                setInterval(function() {
                    saveCanvas(page, filename);
                    //phantom.exit();
                }, 1000);

                // Update function
                startVirtualClient(page, function() {
                    console.log('virtual client started!');
                });
            }, 1000);
        });

    });
});

