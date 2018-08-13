// Dictionary of all middleware functions for netsblox routes.
var server,
    sessionSecret = process.env.SESSION_SECRET || 'DoNotUseThisInProduction',
    COOKIE_ID = 'netsblox-cookie',
    jwt = require('jsonwebtoken'),
    NetworkTopology = require('../network-topology'),
    logger;
const Q = require('q');
const Users = require('../storage/users');

var hasSocket = function(req, res, next) {
    var socketId = (req.body && req.body.socketId) ||
        (req.params && req.params.socketId) ||
        (req.query && req.query.socketId);

    if (socketId) {
        if (NetworkTopology.getSocket(socketId)) {
            return next();
        }
        logger.error(`No socket found for ${socketId} (${req.get('User-Agent')})`);
        return res.status(400)
            .send('ERROR: Not fully connected to server. Please refresh or try a different browser');
    }
    logger.error(`No socketId found! (${req.get('User-Agent')})`);
    res.status(400).send('ERROR: Bad Request: missing socket id');  // FIXME: better error message
};

var noCache = function(req, res, next) {
    res.set('Cache-Control', 'no-cache');
    return next();
};

// Access control and auth
var trySetUser = function(req, res, cb, skipRefresh) {
    tryLogIn(req, res, (err, loggedIn) => {
        if (loggedIn) {
            setUser(req, res, () => cb(null, true));
        } else {
            cb(null, false);
        }
    }, skipRefresh);
};

function tryLogIn (req, res, cb, skipRefresh) {
    var cookie = req.cookies[COOKIE_ID];

    req.session = req.session || new Session(res);
    if (cookie) {
        // verify the cookie is valid
        logger.trace('validating cookie');
        jwt.verify(cookie, sessionSecret, (err, token) => {
            if (err) {
                logger.error(`Error verifying jwt: ${err}`);
                return cb(err);
            }

            req.session.username = token.username;
            if (!skipRefresh) {
                refreshCookie(res, token);
            }
            req.loggedIn = true;
            return cb(null, true);
        });
    } else {
        req.loggedIn = false;
        return cb(null, false);
    }
}

function login(req, res) {
    const hash = req.body.__h;
    const isUsingCookie = !req.body.__u;
    const {clientId} = req.body;
    let loggedIn = false;
    let username = req.body.__u;

    if (req.loggedIn) return Promise.resolve();

    return Q.nfcall(tryLogIn, req, res)
        .then(() => {
            loggedIn = req.loggedIn;
            username = username || req.session.username;

            if (!username) {
                logger.log('"passive" login failed - no session found!');
                throw new Error('No session found');
                //if (req.body.silent) {
                    //return res.sendStatus(204);
                //} else {
                    //return res.sendStatus(403);
                //}
            }
            logger.log(`Logging in as ${username}`);

            return Users.get(username);
        })
        .then(user => {

            if (!user) {  // incorrect username
                logger.log(`Could not find user "${username}"`);
                throw new Error(`Could not find user "${username}"`);
            }

            if (!loggedIn) {  // login, if needed
                const correctPassword = user.hash === hash;
                if (!correctPassword) {
                    logger.log(`Incorrect password attempt for ${user.username}`);
                    throw new Error('Incorrect password');
                }
                logger.log(`"${user.username}" has logged in.`);
            }

            req.session.user = user;
            user.recordLogin();

            if (!isUsingCookie) {  // save the cookie, if needed
                saveLogin(res, user, req.body.remember);
            }

            const socket = NetworkTopology.getSocket(clientId);
            if (socket) {
                socket.username = username;
            }

            req.loggedIn = true;
            req.session = req.session || new Session(res);
            req.session.username = user.username;
            req.session.user = user;
        });

}

var isLoggedIn = function(req, res, next) {
    logger.trace(`checking if logged in ${Object.keys(req.cookies)}`);
    tryLogIn(req, res, (err, success) => {
        if (err) {
            return next(err);
        }

        if (success) {
            return next();
        } else {
            logger.error(`User is not logged in! (${req.get('User-Agent')})`);
            return res.status(400)
                .send('ERROR: You must be logged in to use this feature');
        }
    });
};

var saveLogin = function(res, user, remember) {
    var cookie = {  // TODO: Add an id
        id: user.id || user._id,
        username: user.username,
        email: user.email,
    };
    if (typeof remember === 'boolean') {
        cookie.remember = remember;
    }
    refreshCookie(res, cookie);
};

var refreshCookie = function(res, cookie) {
    var token = jwt.sign(cookie, sessionSecret),
        options = {
            httpOnly: true
        },
        date;

    if (process.env.HOST !== undefined) options.domain = process.env.HOST;
    if (cookie.remember) {
        date = new Date();
        date.setDate(date.getDate() + 14);  // valid for 2 weeks
        logger.trace(`cookie expires: ${date}`);
        options.expires = date;
    }

    logger.trace(`Saving cookie ${JSON.stringify(cookie)}`);
    res.cookie(COOKIE_ID, token, options);
};

var Session = function(res) {
    this._res = res;
};

Session.prototype.destroy = function() {
    // TODO: Change this to a blacklist
    const options = {
        httpOnly: true,
        expires: new Date(0)
    };

    if (process.env.HOST !== undefined) options.domain = process.env.HOST;

    this._res.cookie(COOKIE_ID, '', options);
};

// Helpers
var loadUser = function(username, res, next) {
    // Load the user and handle errors
    server.storage.users.get(username)
        .then(user => {
            if (!user) {
                logger.error(`user not found: "${username}"`);
                return res.status(400).send('ERROR: user not found');
            }
            next(user);
        })
        .catch(e => {
            logger.error(`Could not retrieve "${username}": ${e}`);
            return res.status(500).send('ERROR: ' + e);
        });
};

var setUser = function(req, res, next) {
    loadUser(req.session.username, res, user => {
        req.session.user = user;
        next();
    });
};

var setUsername = function(req, res, cb) {
    let result = null;
    if (arguments.length === 2) {
        let deferred = Q.defer();
        cb = deferred.resolve;
        result = deferred.promise;
    }
    tryLogIn(req, res, cb, true);
    return result;
};

module.exports = {
    hasSocket,
    noCache,
    isLoggedIn,
    tryLogIn,
    login,
    trySetUser,
    saveLogin,
    loadUser,
    setUser,
    setUsername,

    // additional
    init: _server => {
        server = _server;
        logger = server._logger.fork('middleware');
    },
    COOKIE_ID
};
