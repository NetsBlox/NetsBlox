const OAuth = require('../../core/oauth');
const {LoginRequired, InvalidRedirectURL, OAuthFlowError} = require('../../core/errors');
const {NoAuthorizationCode, InvalidGrantType} = require('../../core/errors');
const OAuthRouter = require('express').Router();
const {handleErrors, setUsername} = require('../utils');
const {SERVER_PROTOCOL, LOGIN_URL} = process.env;
const _ = require('lodash');
const fs = require('fs');
const path = require('path');
const AuthorizeTemplate = _.template(fs.readFileSync(path.join(__dirname, 'index.html.ejs'), 'utf8'));

const DEFAULT_SCOPES = [
    'List your projects',
    'Send messages to your projects',
];

OAuthRouter.route('/netsblox_logo.png')
    .get((req, res) => res.sendFile(path.join(__dirname, 'netsblox_logo.png')));

OAuthRouter.route('/auth.js')
    .get((req, res) => res.sendFile(path.join(__dirname, 'auth.js')));

OAuthRouter.route('/')
    .get(setUsername, handleErrors(async (req, res) => {
        const {username} = req.session;
        const isLoggedIn = !!username;
        if (!isLoggedIn) {
            if (LOGIN_URL) {
                const baseUrl = (SERVER_PROTOCOL || req.protocol) + '://' + req.get('Host');
                const url = baseUrl + req.originalUrl;
                res.redirect(`${LOGIN_URL}?redirect=${encodeURIComponent(url)}&url=${encodeURIComponent(baseUrl)}`);
                return;
            } else {
                throw new LoginRequired();
            }
        }
        const clientId = req.query.client_id;
        const client = await OAuth.getClient(clientId);
        res.send(AuthorizeTemplate({username, client, scopes: DEFAULT_SCOPES}));
    }));

OAuthRouter.route('/code')
    .post(setUsername, handleErrors(async (req, res) => {
        const {username} = req.session;
        const isLoggedIn = !!username;
        if (!isLoggedIn) {
            throw new LoginRequired();
        }

        const redirectUri = req.query.redirect_uri;
        if (!redirectUri) {
            throw new InvalidRedirectURL();
        }

        const {error, state} = req.query;
        if (error) {
            const desc = req.query.error_description ?
                `&error_description=${req.query.error_description}` : '';
            res.redirect(`${redirectUri}?error=${error}${desc}`);
            return;
        }

        const clientId = req.query.client_id;
        const authCode = await OAuth.authorizeClient(username, clientId, redirectUri);

        res.redirect(`${redirectUri}?code=${authCode}&state=${state}`);
    }))
    .options((req, res) => res.end());

OAuthRouter.route('/token')
    .post(handleErrors(handleOAuthErrors(async (req, res) => {
        validateTokenRequest(req);

        const authCode = req.body.code;
        const token = await OAuth.createToken(authCode, req.body.redirect_uri);
        res.set('Cache-Control', 'no-store');
        res.set('Pragma', 'no-cache');
        res.json({
            access_token: token,
        });
    })))
    .options((req, res) => res.end());

// The following endpoint is primarily used for debugging
OAuthRouter.route('/whoami')
    .get(handleErrors(async (req, res) => {
        const [/*prefix*/, tokenID] = req.get('Authorization').split(' ');
        const token = await OAuth.getToken(tokenID);
        res.send(token.username);
    }));

function validateTokenRequest(req) {
    if (!req.body.code)  {
        throw new NoAuthorizationCode();
    }

    if (!req.body.redirect_uri) {
        throw new InvalidRedirectURL();
    }

    if (req.body.grant_type !== 'authorization_code') {
        throw new InvalidGrantType();
    }
}

function handleOAuthErrors(fn) {
    return async (req, res) => {
        try {
            await fn(req, res);
        } catch (err) {
            if (err instanceof OAuthFlowError) {
                res.status(err.status);
                const body = {
                    error: err.errorName,
                };
                if (err.desc) {
                    body.error_description = err.desc;
                }
                res.json(body);
            } else {
                throw err;
            }
        }
    };
}

module.exports = OAuthRouter;
