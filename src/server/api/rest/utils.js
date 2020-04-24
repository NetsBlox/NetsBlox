const {RequestError} = require('../core/errors');
const Utils = {};
const {isLoggedIn} = require('../../routes/middleware');

Utils.handleErrors = fn => {
    return async (req, res) => {
        try {
            await fn(req, res);
        } catch (err) {
            const statusCode = err instanceof RequestError ? 400 : 500;
            res.status(statusCode).send(`ERROR: ${err.message}`);
        }
    };
};

Utils.ensureLoggedIn = isLoggedIn;

module.exports = Utils;
