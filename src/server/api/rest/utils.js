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

Utils.setUsername = setUsername;

module.exports = Utils;
