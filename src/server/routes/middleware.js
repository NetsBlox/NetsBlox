// Dictionary of all middleware functions for netsblox routes.
var server,
    sessionSecret = process.env.SESSION_SECRET || 'DoNotUseThisInProduction',
    Groups = require('../storage/groups'),
    COOKIE_ID = 'netsblox-cookie',
    jwt = require('jsonwebtoken'),
    SocketManager = require('../socket-manager'),
    logger;
const Q = require('q');

var hasSocket = function(req, res, next) {
    var socketId = (req.body && req.body.socketId) ||
        (req.params && req.params.socketId) ||
        (req.query && req.query.socketId);

    if (socketId) {
        if (SocketManager.getSocket(socketId)) {
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

var tryLogIn = function(req, res, cb, skipRefresh) {
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
            return cb(null, true);
        });
    } else {
        return cb(null, false);
    }
};

var isLoggedIn = function(req, res, next) {
    logger.trace(`checking if logged in ${Object.keys(req.cookies)}`);
    if (req.method === 'OPTIONS') return next();
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

// ====== group helper middlewares =======

// check group write access
let isGroupOwner = function(req, res, next) {
    if (req.method === 'OPTIONS') return next();
    let groupId = req.params.id;
    Groups.get(groupId)
        .then( group => {
            let owner = group.getOwner();
            if (owner === req.session.username) {
                next();
            } else {
                res.status(401).send('Unauthorized write attempt');
            }
        })
        .catch(err => {
            logger.error(err);
            res.status(404).send(`Group not found: ${groupId}`);
        });
};

// checks if the targeted groupuser exists
let isValidMember = async function(req, res, next) {
    let userId = req.params.userId;
    if (!userId) return res.status(404).send('missing user (userId)');
    let user = await server.storage.users.getById(userId);
    if (!user) return res.status(404).send(`cant find user with user id ${userId}`);
    next();
};

// checks to see if the user had activity on the server (eg has a project)
// requires a validmember
let memberIsNew = async function(req, res, next) {
    // TODO add optional bypass
    let issues = [];
    let userId = req.params.userId;
    let user = await server.storage.users.getById(userId);
    // condition #1: must have no saved or transient project
    let projects = await user.getAllRawProjects();
    if (projects.length !== 0) issues.push('user has projects');

    // condition #2: account age
    let age = (new Date().getTime() - user.createdAt.getTime()) / 60000 ; // in minutes
    const AGE_LIMIT_MINUTES = 60 * 24 * 7; // a week
    if (age > AGE_LIMIT_MINUTES) issues.push('you cannot change an old account');

    if (issues.length > 0) {
        let msg = issues.join('& ');
        return res.status(403).send(msg);
    }
    next();
};

// requires a validMember
let canManageMember = async function(req, res, next) {
    const groupId = req.params.id,
        userId = req.params.userId;
    let user = await server.storage.users.getById(userId);
    if (!user.groupId || user.groupId !== groupId) {
        res.status(403).send('unauthorized to make changes to this user');
    } else {
        next();
    }
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
    trySetUser,
    saveLogin,
    loadUser,
    setUser,
    setUsername,
    isGroupOwner,
    isValidMember,
    memberIsNew,
    canManageMember,

    // additional
    init: _server => {
        server = _server;
        logger = server._logger.fork('middleware');
    },
    COOKIE_ID
};
