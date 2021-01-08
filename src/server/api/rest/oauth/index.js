const OAuth = require('../../core/oauth');
const {LoginRequired, InvalidRedirectURL} = require('../../core/errors');
const OAuthRouter = require('express').Router();
const {handleErrors, setUsername} = require('../utils');
const {SERVER_PROTOCOL, LOGIN_URL} = process.env;
const _ = require('lodash');
const fs = require('fs');
const path = require('path');
const AuthorizeTemplate = _.template(fs.readFileSync(path.join(__dirname, 'index.html.ejs'), 'utf8'));


// TODO: Add endpoint for authorizing the application
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

        const {error} = req.query;
        if (error) {
            const desc = req.query.error_description ?
                `&error_description=${req.query.error_description}` : '';
            res.redirect(`${redirectUri}?error=${error}${desc}`);
            return;
        }

        const clientId = req.query.client_id;
        const authCode = await OAuth.authorizeClient(username, clientId, redirectUri);

        res.redirect(`${redirectUri}?code=${authCode}`);
    }))
    .options((req, res) => res.end());

OAuthRouter.route('/token')
    .post(handleErrors(async (req, res) => {
        const authCode = req.body.code;
        if (!authCode)  {
            const error = 'invalid_request';
            const error_description = 'No authorization code';
            return res.status(400).json({error, error_description});
        }

        if (!req.body.redirect_uri) {
            const error = 'invalid_grant';
            const error_description = 'Invalid redirect URI';
            return res.status(400).json({error, error_description});
        }

        if (req.body.grant_type !== 'authorization_code') {
            const error = 'invalid_grant';
            return res.status(400).json({error});
        }

        const authData = await OAuth.getAuthData(authCode);
        if (!authData) {
            const error = 'invalid_client';
            const error_description = 'Invalid authorization code';
            return res.status(401).json({error, error_description});
        }

        const {username, clientId, redirectUri} = authData;
        if (redirectUri !== req.body.redirect_uri) {
            const error = 'invalid_grant';
            const error_description = 'Invalid redirect URI';
            return res.status(400).json({error, error_description});
        }

        const token = await OAuth.createToken(username, clientId);
        res.set('Cache-Control', 'no-store');
        res.set('Pragma', 'no-cache');
        res.json({
            access_token: token,
        });
    }))
    .options((req, res) => res.end());

module.exports = OAuthRouter;
