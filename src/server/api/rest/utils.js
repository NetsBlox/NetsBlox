const {RequestError} = require('../core/errors');
const Utils = {};
const {setUsername} = require('../../routes/middleware');

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

module.exports = Utils;
