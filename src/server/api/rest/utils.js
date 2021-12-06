const {RequestError, LoginRequired} = require('../core/errors');
const Utils = {};
const {setUsername} = require('../../routes/middleware');
const assert = require('assert');
const {SERVER_PROTOCOL, LOGIN_URL} = process.env;

Utils.handleErrors = fn => {
    return async function(req, res) {
        try {
            await fn(...arguments);
        } catch (err) {
            const statusCode = err instanceof RequestError ? 400 : 500;
            res.status(statusCode).send(`ERROR: ${err.message}`);
        }
    };
};

Utils.setUsername = function(req, res) {
    req.session = req.session || new Session(res);
    // TODO: add login logic
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
};

Utils.ensureLoggedIn = async function(req, res) {
    await Utils.setUsername(req);
    // TODO: allow redirects?
    assert(req.session?.username, new LoginRequired());
};

Utils.ensureLoggedInAllowRedirect = async function(req, res) {
    try {
        await Utils.ensureLoggedIn(req)
    } catch (err) {
        if (err instanceof LoginRequired && LOGIN_URL) {
            const baseUrl = (SERVER_PROTOCOL || req.protocol) + '://' + req.get('Host');
            const url = baseUrl + req.originalUrl;
            res.redirect(`${LOGIN_URL}?redirect=${encodeURIComponent(url)}&url=${encodeURIComponent(baseUrl)}`);
            return;
        }
        throw err;
    }
};

module.exports = Utils;
