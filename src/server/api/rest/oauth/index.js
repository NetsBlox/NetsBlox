const OAuth = require('../../core/oauth');
const {RequestError, LoginRequired, InvalidRedirectURL} = require('../../core/errors');
const OAuthRouter = require('express').Router();
const {handleErrors, setUsername} = require('../utils');
const {SERVER_PROTOCOL, LOGIN_URL} = process.env;
const _ = require('lodash');
const fs = require('fs');
const path = require('path');
const AuthorizeTemplate = _.template(fs.readFileSync(path.join(__dirname, 'index.html.ejs'), 'utf8'));


// TODO: Add endpoint for authorizing the application
// TODO: If not logged in, redirect to the login endpoint?
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
        console.log('originalUrl:', req.originalUrl);
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
        console.log('---> CODE');
        // TODO: Add support for denying the request
        // TODO: Do I need to validate the client?
        // TODO: return an auth code
        const {username} = req.session;
        const isLoggedIn = !!username;
        if (!isLoggedIn) {
            throw new LoginRequired();
        }

        const redirectUri = req.query.redirect_uri;
        if (!redirectUri) {  // TODO: validate further?
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
        const authCode = await OAuth.authorizeClient(username, clientId);

        // TODO: add client secret?
        res.redirect(`${redirectUri}?code=${authCode}`);
    }))
    .options((req, res) => res.end());

OAuthRouter.route('/token')
    .post(handleErrors(async (req, res) => {
        const authCode = req.body.code;
        if (!authCode)  throw new RequestError(); // TODO
        // TODO: verify auth code
        // TODO: create access token
        res.json({
            access_token: token,
            expires_in: 60 * 60 * 24,  // TODO: should this be in the request?
        });
    }))
    .options((req, res) => res.end());

//OAuthRouter.route('/secure')
    //.post(handleErrors(async (req, res) => {
        //// TODO: check the access tokens
        //const projectId = req.body.projectId;
        //const {username, password} = req.body.projectId;
        //// TODO: login and set the session cookies
    //}));

module.exports = OAuthRouter;
