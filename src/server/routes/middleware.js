// Dictionary of all middleware functions for netsblox routes.
const Filter = require('bad-words');
const axios = require('axios');
const profaneChecker = new Filter();
var server,
    sessionSecret = process.env.SESSION_SECRET || 'DoNotUseThisInProduction',
    Groups = require('../storage/groups'),
    COOKIE_ID = 'netsblox-cookie',
    jwt = require('jsonwebtoken'),
    NetworkTopology = require('../network-topology'),
    logger;
const Q = require('q');
const Users = require('../storage/users');
const Storage = require('../storage/storage');
const BannedAccounts = require('../storage/banned-accounts');
const Strategies = require('../api/core/strategies');
const mailer = require('../mailer');
const WELCOME_HTML = (nbUser, snapUser) =>
`<h1>Welcome to NetsBlox!</h1>

There was a recent NetsBlox login using your Snap! account, ${snapUser}. A NetsBlox account, ${nbUser}, has been created for you so you can save your projects and use all the features NetsBlox has to offer including collaboration, cloud variables, and more :)

Basically, logging in with your Snap! account will log you into NetsBlox as ${nbUser} so you don't need to remember yet another username and password.

<h2>FAQ</h2>
${snapUser !== nbUser ? `<h3>Why did I get a new username?</h3>\nA NetsBlox account is required for saving NetsBlox projects (as well as other things) and ${snapUser} was already taken.\n\n` : ''}<h3>What is a "linked account"?</h3>
A linked account enables the user to login using the given account. If I have linked my Snap! account, I can use "Login with Snap!" to login to my NetsBlox account.

<h3>What does it mean to "unlink Snap! account"?</h3>
This means that I can no longer use "Login with Snap!" to login to my NetsBlox account. If I use "Login with Snap!" after unlinking the account, it will make a new NetsBlox account and link it to the Snap! account.

<h3>How can I login if I unlink the account?</h3>
You can always login using your NetsBlox password. If you have not set up a password, you can use "Reset Password" from the NetsBlox editor.

<h3>What if I change my password in NetsBlox? Will my password change in Snap!?</h3>
No. NetsBlox accounts (even those with a linked Snap! account) still can login using their own password. Resetting or changing a password in NetsBlox will change the NetsBlox password. If you would like to change the password for your Snap! account, please do so from the Snap! website.
`.replace(/\n/g, '<br/>');

var hasSocket = function(req, res, next) {
    var socketId = (req.body && req.body.socketId) ||
        (req.params && req.params.socketId) ||
        (req.query && req.query.socketId);

    if (socketId) {
        if (NetworkTopology.getClient(socketId)) {
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
        logger.trace('validating cookie');
        jwt.verify(cookie, sessionSecret, async (err, token) => {
            if (err) {
                logger.error(`Error verifying jwt: ${err}`);
                return cb(err);
            }
            const {username} = token;
            const isBanned = await BannedAccounts.isBannedUsername(username);
            if (isBanned) {
                return cb(new Error('Account has been banned.'));
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

async function login(req, res) {
    const pwdOrHash = req.body.__h;
    const isUsingCookie = !req.body.__u;
    const {clientId} = req.body;
    let loggedIn = false;
    let username = req.body.__u;

    if (req.loggedIn) return Promise.resolve();

    await Q.nfcall(tryLogIn, req, res);
    loggedIn = req.loggedIn;
    username = username || req.session.username;

    if (!username) {
        logger.log('"passive" login failed - no session found!');
        throw new Error('No session found');
    }
    logger.log(`Logging in as ${username}`);

    const {strategy} = req.query;
    let user = null;
    if (!loggedIn) {
        if (!strategy) {
            user = await Users.get(username);
            if (!user) {  // incorrect username
                logger.log(`Could not find user "${username}"`);
                throw new Error(`Could not find user "${username}"`);
            }

            const correctPassword = user.hash === pwdOrHash;
            if (!correctPassword) {
                logger.log(`Failed authentication attempt for ${user.username} (${strategy})`);
                throw new Error('Incorrect password');
            }
        } else {
            const authStrategy = Strategies.find(strategy);
            await authStrategy.authenticate(username, pwdOrHash);
            user = await Users.findWithStrategy(username, strategy);

            if (!user) {
                const email = await authStrategy.getEmail(username, pwdOrHash);
                user = Users.new(username, email);
                user.linkedAccounts.push({username, type: strategy});
                let saved = false;
                let count = 0;
                const strategySuffix = strategy.toLowerCase()
                    .replace(/[^a-zA-Z]/g, '');
                while (!saved) {
                    const userData = user._saveable();
                    const result = await Users.collection.updateOne(
                        user.getStorageId(),
                        {$setOnInsert: userData},
                        {upsert: true},
                    );
                    saved = result.upsertedCount === 1;
                    if (!saved) {
                        count++;
                        if (count > 1) {
                            user.username = `${username}${count}_${strategySuffix}`;
                        } else {
                            user.username = `${username}_${strategySuffix}`;
                        }
                    }
                }

                try {
                    await mailer.sendMail({
                        to: user.email,
                        subject: 'Welcome to NetsBlox!',
                        html: WELCOME_HTML(user.username, username)
                    });
                } catch (err) {
                    logger.error(`Unable to send welcome email: ${err}`);
                }
            }
        }
    }

    user = user || await Users.get(username);
    logger.log(`"${user.username}" has logged in.`);
    req.session.user = user;
    user.recordLogin();

    if (!isUsingCookie) {  // save the cookie, if needed
        saveLogin(res, user, req.body.remember);
    }

    const client = NetworkTopology.getClient(clientId);
    if (client) {
        client.setUsername(username);
    }

    req.loggedIn = true;
    req.session = req.session || new Session(res);
    req.session.username = user.username;
    req.session.user = user;
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

function getCookieOptions() {
    const options = {
        httpOnly: true,
    };

    if (process.env.HOST !== undefined) {
        options.domain = process.env.HOST;
    }
    if (process.env.SERVER_PROTOCOL === 'https') {
        options.sameSite = 'None';
        options.secure = true;
    }

    return options;
}

var refreshCookie = function(res, cookie) {
    var token = jwt.sign(cookie, sessionSecret),
        options = getCookieOptions(),
        date;

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
    const options = getCookieOptions();
    options.expires = new Date(0);

    if (process.env.HOST !== undefined) options.domain = process.env.HOST;

    this._res.cookie(COOKIE_ID, '', options);
};

// Helpers
var loadUser = function(username, res, next) {
    // Load the user and handle errors
    Storage.users.get(username)
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
    let user = await Storage.users.getById(userId);
    if (!user) return res.status(404).send(`cant find user with user id ${userId}`);
    next();
};

// checks to see if the user had activity on the server (eg has a project)
// requires a validmember
let memberIsNew = async function(req, res, next) {
    const userId = req.params.userId;
    const user = await Storage.users.getById(userId);

    const rejections = await user.isNewWithRejections();

    if (rejections.length > 0) {
        return res.status(403).json(rejections);
    }
    next();
};

// requires a validMember
let canManageMember = async function(req, res, next) {
    const groupId = req.params.id,
        userId = req.params.userId;
    let user = await Storage.users.getById(userId);
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

function isProfane(text) {
    const normalized = text.toLowerCase();
    return profaneChecker.isProfane(normalized) ||
        profaneChecker.list.find(badWord => normalized.includes(badWord.toLowerCase()));
}

let torExitIPs = [];
async function updateTorIPs() {
    const url = 'https://check.torproject.org/torbulkexitlist';
    const resp = await axios({url});
    const ips = resp.data.split('\n');
    return torExitIPs = ips;
}
const day = 1000*60*60*24;
updateTorIPs();
setInterval(updateTorIPs, 1*day);
function isTorIP(ip) {
    return torExitIPs.includes(ip);
}

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
    isGroupOwner,
    isValidMember,
    memberIsNew,
    canManageMember,
    isProfane,
    isTorIP,

    // additional
    init: _server => {
        server = _server;
        logger = server._logger.fork('middleware');
    }, COOKIE_ID
};
