const AlexaSkill = require('./skill');

// TODO: refactor the next imports
const OAuth = require('../../../api/core/oauth');
const {handleErrors, setUsername} = require('../../../api/rest/utils');
const {LoginRequired, RequestError} = require('../../../api/core/errors');

const bodyParser = require('body-parser');
const axios = require('axios');
const qs = require('qs');
const {LOGIN_URL} = process.env;
const GetStorage = require('./storage');
const _ = require('lodash');
const fs = require('fs');
const path = require('path');
const AmazonLoginTemplate = _.template(fs.readFileSync(path.join(__dirname, 'login.html.ejs'), 'utf8'));
const express = require('express');
const cookieParser = require('cookie-parser');
const h = require('./helpers');
const logger = require('../utils/logger')('alexa:routes');

const router = express();
const parseCookies = cookieParser();
router.get('/ping', (req, res) => res.send('pong'));
router.get('/login.html', bodyParser.json(), parseCookies, setUsername, handleErrors((req, res) => {
    const username = req.session.username;

    const isLoggedIn = !!username;
    if (!isLoggedIn) {
        if (LOGIN_URL) {
            const baseUrl = h.getServerURL();
            const url = `${baseUrl}/services/routes/alexa/login.html`;
            res.redirect(`${LOGIN_URL}?redirect=${encodeURIComponent(url)}&url=${encodeURIComponent(baseUrl)}`);
            return;
        } else {
            throw new LoginRequired();
        }
    }
    res.send(AmazonLoginTemplate({
        username,
        clientID: h.getClientID(),
        serverURL: h.getServerURL(),
    }));
}));
router.put('/tokens', bodyParser.json(), parseCookies, setUsername,
    handleErrors(async (req, res) => {
        const {username} = req.session;
        const isLoggedIn = !!username;

        if (!isLoggedIn) {
            throw new LoginRequired();
        }

        const amazonResponse = req.body.code;

        if (!amazonResponse) {
            throw new RequestError('Missing authorization code.');
        }

        const options = {
            method: 'post',
            url: 'https://api.amazon.com/auth/o2/token',
            data: qs.stringify({
                grant_type: 'authorization_code',
                code: amazonResponse,
                client_id: process.env.ALEXA_CLIENT_ID,
                client_secret: process.env.ALEXA_CLIENT_SECRET,
                redirect_uri: h.getServerURL() + '/services/routes/alexa/tokens'
            }),
            headers: {
                'content-type': 'application/x-www-form-urlencoded;charset=utf-8'
            }
        };

        let tokens;
        try {
            const response = await axios(options);
            tokens = response.data;
        } catch (err) {
            return res.status(err.statusCode).send(err.message);
        }

        if (!tokens) {
            throw new RequestError('Access token not received from Amazon.');
        }

        const collection = GetStorage().tokens;
        if (!collection) {
            return res.sendStatus(500);
        }

        const query = {
            $set: {
                username,
                access_token: tokens.access_token,
                refresh_token: tokens.refresh_token
            }
        };
        await collection.updateOne({username}, query, {upsert: true});

        return res.sendStatus(200);
    })
);
router.post('/',
    handleErrorsInAlexa(async (req, res) => {
        const reqData = req.body;
        const {accessToken} = reqData.session.user;
        const token = await OAuth.getToken(accessToken);
        const {username} = token;

        const skillId = reqData.session.application.applicationId;

        if (reqData.request.type === 'IntentRequest') {
            const {intent} = reqData.request;
            const skillData = await h.getSkillData(skillId);
            const skill = new AlexaSkill(skillData);
            if (!skill.hasIntent(intent.name)) {
                logger.warn(`Missing "${intent.name}" intent: ${skillId}`);
                return res.json(speak(`Could not find ${intent.name}. Perhaps you need to update the Alexa Skill.`));
            }

            try {
                const responseText = await skill.invokeIntent(intent.name, intent.slots, username);
                return res.json(speak(responseText));
            } catch (err) {
                res.json(speak(`An error occurred in the ${intent.name} handler: ${err.message}`));
            }
        }
    })
);

router.get('/icon/:author/:name/:size(small|large)', async (req, res) => {
    const {author, name, size} = req.params;
    const {skills} = GetStorage();
    const skillData = await skills.findOne({author, 'config.name': name});
    if (!skillData) {
        return res.status(404).send('Skill not found');
    }
    const iconData = skillData.config[size + 'Icon'];
    if (!iconData) {
        return res.status(404).send('Image not found.');
    }

    const imageData = h.getImageFromCostumeXml(iconData);
    return res
        .set('Content-Type', 'image/png')
        .send(imageData);
});
router.get('/whoami', (req, res) => res.send(req.token && req.token.username));

function speak(text) {
    return {
        version: '1.0',
        response: {
            outputSpeech: {
                type: 'PlainText',
                text,
            },
        }
    };
}

function handleErrorsInAlexa(fn) {
    return async function(req, res) {
        try {
            await fn(...arguments);
        } catch (err) {
            if (err instanceof RequestError) {
                return res.json(speak(`An error occurred. ${err.message}`));
            } else {
                logger.error(err);
            }
            throw err;
        }
    };
}

module.exports = router;
