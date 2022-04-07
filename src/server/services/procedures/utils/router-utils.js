const cookieParser = require('cookie-parser');
const bodyParser = require('body-parser');
const cloud = require('../../cloud-client');
const axios = require('axios');

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
        (req, res, next) => tryLogIn(req, res, next, true),
    ];
}

async function tryLogin(req, res, next) {
    const cookie = req.cookies.netsblox;
    // How should we choose which to login with? Maybe use 2 methods?
    // TODO: add client secret, too
    const {clientId} = req.query;
    if (cookie) {
        return setUsernameFromCookie(req, res, next);
    } else if (clientId) {
        const {username, state} = await cloud.getClientState(clientId);
        req.username = username;
        req.clientState = state;
    }
    next();
}

async function setUsernameFromCookie(req, res, next) {
    const cookie = req.cookies.netsblox;
    const username = await cloud.whoami(cookie);
    req.username = username;
    next();
}

function ensureLoggedIn(req, res, next) {
    if (!req.username) {
        res.status(401).send('Login required');
    }
}

module.exports = {
    urlencoded, json, allDefaults, ensureLoggedIn, setUsernameFromCookie
};
