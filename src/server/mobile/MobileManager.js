// This object uses cordova to compile the NetsBlox app into a mobile app.
'use strict';

var _ = require('lodash'),
    fs = require('fs-extra'),
    path = require('path'),
    R = require('ramda'),
    assert = require('assert'),
    successText = fs.readFileSync(path.join(__dirname, 'install-instructions.md.ejs')),
    errorText = fs.readFileSync(path.join(__dirname, 'build-failure.md.ejs')),
    rm_rf = require('rimraf'),
    template = {
        success: _.template(successText),
        error: _.template(errorText)
    },

    // debug logging
    debug = require('debug'),
    trace = debug('NetsBlox:MobileManager:trace'),
    error = debug('NetsBlox:MobileManager:error'),
    warn = debug('NetsBlox:MobileManager:warn'),
    log = debug('NetsBlox:MobileManager:log'),
    
    // Compilation helpers
    async = require('async'),
    spawn = require('child_process').spawn,
    TMP_DIR = path.join(__dirname, 'tmp');

var CLIENT_DIR = path.join(__dirname, '..', '..', 'client'),
    CLIENT_JS = fs.readdirSync(CLIENT_DIR)
        .filter(file => path.extname(file) === '.js')
        .map(file => path.join(CLIENT_DIR, file));

var MobileManager = function(mailTransport) {
    this.transport = mailTransport;

    // Check environment for cordova command
    this.supported = false;
    MobileManager.cordova([], {}, err => {
        if (err) {
            warn('Mobile app compilation not supported in this environment. Is cordova installed?');
        } else {
            this.supported = true;
        }
    });
};

MobileManager.prototype.emailProjectApk = function(name, email, baseURL, xml) {
    var self = this,
        myTmpDir = path.join(TMP_DIR, name + new Date().getTime()),
        myProjectDir = path.join(myTmpDir, name);

    assert(this.supported);

    async.series([
        rm_rf.bind(null, TMP_DIR),
        fs.mkdirs.bind(fs, myTmpDir),
        MobileManager.cordova.bind(null, ['create', name], {cwd: myTmpDir}),
        MobileManager.customizeCordovaApp.bind(null, {
            projectName: name,
            baseURL,
            projectXml: xml,
            cordovaRoot: myProjectDir,
            email
        }),
        MobileManager.cordova.bind(null, ['platform', 'add', 'android'], {cwd: myProjectDir}),
        MobileManager.cordova.bind(null, ['compile', 'android'], {cwd: myProjectDir})
        ], 
        function(err) {
            // Get the apk 
            // FIXME: This should not be hardcoded :/
            var apkPath = path.join(myProjectDir, 'platforms', 'android', 'ant-build', 'MainActivity-debug.apk');
            self._emailResults(err, email, name, apkPath);
            //rm_rf(apkPath);
        }
    );
};

// Private
MobileManager.prototype._emailResults = function(err, email, project, projectPath) {
    var mkdn,
        emailOptions = {
            from: 'no-reply@netsblox.com',
            subject: project + ' for Android',
            to: email
        };

    if (err) {
        error('Compiling ' + project + ' failed: ' + err);
        mkdn = template.error({project: project, error: err});
        emailOptions.subject += ': Build Error';
    } else {
        trace('Compiling ' + project + ' success');
        mkdn = template.success({project: project, error: err});
        emailOptions.attachments = [
            {
                filename: project + '.apk',
                path: projectPath
            }
        ];
    }

    trace('Emailing ' + email + ' about ' + project + ' compilation');
    emailOptions.markdown = mkdn;
    this.transport.sendMail(emailOptions);
};

/**
 * Spawn a cordova command in a child process
 *
 * @param {String[]} args
 * @param {Object} options
 * @param {Function} callback
 * @return {undefined}
 */
MobileManager.cordova = function(args, options, callback) {
    var job = spawn('cordova', args, options), 
        error = '';

    trace('Invoking cordova ' + args.join(' '));
    job.stderr.on('data', function(data) {
        error += data.toString();
    });

    job.on('close', function(code) {
        if (code !== 0) {
            error = error || 'Unknown error';
        }
        callback(error);
    });
};

/**
 * Add the NetsBlox project to the Cordova app.
 *
 * @param {String} cordovaRoot
 * @param {Function} callback
 * @return {undefined}
 */
MobileManager.customizeCordovaApp = function(content, callback) {
    var resDir = path.join(__dirname, 'resources'),
        specialFiles = {
            'index.html.ejs': 'www',
            'config.xml.ejs': ''
        };

    R.mapObj(dst => path.join(content.cordovaRoot, dst));
    //indexHtml = path.join(resDir, ),
    content.projectXml = content.projectXml.replace(/'/g, "\\'");

    async.series([
        // Create the new special files (index.html, config.xml.ejs, etc)
        function(next) {
            var files = Object.keys(specialFiles),
                len = files.length;

            files
                .forEach(srcFile => {
                    var srcPath = path.join(resDir, srcFile),
                        dstPath = path.join(content.cordovaRoot,
                            specialFiles[srcFile],
                            srcFile.replace(/\.ejs$/, ''));

                    fs.readFile(srcPath, 'utf8', function(e, text) {
                        if (e) {
                            return next(e);
                        }
                        var outputText = _.template(text)(content);
                        trace('Writing ' + outputText + ' to ' + dstPath);
                        fs.writeFile(dstPath, outputText, () => {
                            if (--len === 0) {
                                next();
                            }
                        });
                    });
                });
        },
        // Copy the remaining resource files
        function(next) {
            fs.readdir(resDir, function(e, files) {
                files = _.difference(files, Object.keys(specialFiles))
                    .filter(name => name[0] !== '.');  // no hidden files

                // Copy the remaining to the root/www/js dir
                files
                    .forEach(file => {
                        var src = path.join(resDir, file),
                            dst = path.join(content.cordovaRoot, 'www', 'js', file);
                        if (file.indexOf('.ejs') > -1) {  // ejs file
                            let rawText = fs.readFileSync(src, 'utf8'),
                                outputText = _.template(rawText)(content);
                            dst = dst.replace(/\.ejs$/, '');
                            fs.writeFileSync(dst, outputText);
                        } else {  // regular file
                            fs.copySync(src, dst);
                        }
                    });
                next(null);
            });
        },
        // Copy the js files from src/client
        function(next) {
            var dstDir = path.join(content.cordovaRoot, 'www', 'js');
            CLIENT_JS.forEach(file => fs.copySync(file, path.join(dstDir, path.basename(file))));
            next(null);
        }
    ], callback);
};

module.exports = MobileManager;
