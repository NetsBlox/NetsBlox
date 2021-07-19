const middleware = require('../../../routes/middleware');
const cookieParser = require('cookie-parser');
const bodyParser = require('body-parser');

function urlencoded(limit='50mb', extended=true) {
    return bodyParser.urlencoded({
        limit,
        extended,
    });
}

function json(limit='50mb') {
    return bodyParser.json({limit});
}

function allDefaults() {
    return [
        urlencoded(),
        json(),
        cookieParser(),
        (req, res, next) => middleware.tryLogIn(req, res, next, true),
    ];
}

module.exports = {
    urlencoded, json, allDefaults,
};
