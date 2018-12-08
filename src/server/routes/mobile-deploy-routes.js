'use strict';

const Logger = require('../logger'),
    logger = new Logger('netsblox:routes:mobile-manager'),

    DEFAULT_NETSBLOX_URL = 'http://netsblox.herokuapp.com/';

module.exports = [
    {
        Method: 'post',
        URL: 'mobile/compile',
        Handler: function(req, res) {
            var self = this,
                project = req.body.projectName,
                username = req.body.username,  // Session is more secure FIXME
                baseURL = req.body.baseURL,  // Why do I need to change this, again? It needs to be resolved if localhost/127.0.0.1
                xml = req.body.xml;

            logger.trace('Request to compile Android app from ' + username + ' for project ' + project);

            // Check if enabled
            if (!self.mobileManager.supported) {
                return res.status(500).send('ERROR: Android app creation not supported.' +
                    ' Please contact your administrator if this is not expected.');
            }

            // Fix the baseURL if localhost or 127.0.0.1
            // This should only happen during development
            if (!baseURL || baseURL.includes('localhost') || baseURL.includes('127.0.0.1')) {
                baseURL = DEFAULT_NETSBLOX_URL;
            }

            if (!username) {
                return res.status(403).send('Username not found. Must be ' +
                    'logged in to compile Android apps');
            }

            return self.storage.users.get(username)
                .then(user => {
                    if (user) {
                        self.mobileManager.emailProjectApk(project, user.email, baseURL, xml);
                        return res.status(200).send('Building the Android app. ' +
                            '\nResults will be emailed to ' + user.email + ' on completion.');
                    } else {
                        logger.error('Could not find user to build android app (user "'+username+'")');
                        return res.status(400).send('ERROR: could not find user "'+username+'"');
                    }
                })
                .catch(e => {
                    logger.error('Server error when looking for user: "'+username+'". Error:', e);
                    return res.status(500).send('ERROR: ' + e);
                });
        }
    }
];
