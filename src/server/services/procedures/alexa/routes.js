const OAuth = require('../../../api/core/oauth');
const request = require('request');
const {handleErrors, setUsername} = require('../../../api/rest/utils');
const {LoginRequired} = require('../../../api/core/errors');
const {SERVER_PROTOCOL, LOGIN_URL} = process.env;
const GetTokenStore = require('./tokens');
const _ = require('lodash');
const fs = require('fs');
const path = require('path');
const AmazonLoginTemplate = _.template(fs.readFileSync(path.join(__dirname, 'login.html.ejs'), 'utf8'));
const NetsBloxAddress = require('../../../netsblox-address');
const Alexa = require('ask-sdk-core');
const express = require('express');
const { ExpressAdapter } = require('ask-sdk-express-adapter');
const devLogger = require('../utils/dev-logger');
const RemoteClient = require('../../remote-client');
const cookieParser = require('cookie-parser');
const skillBuilder = Alexa.SkillBuilders.custom();

/**
 * Throws if user is not logged in.
 */
const ensureLoggedIn = function(caller) {
    if (!caller.username) {
        throw new Error('Login required.');
    }
};

const LaunchRequestHandler = {
    canHandle(handlerInput) {
        devLogger.log('Checking if we can handle LaunchRequest');
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'LaunchRequest';
    },
    handle(handlerInput) {
        const speechText = 'Welcome to the Alexa NetsBlox Skill. What would you like to do?';

        return handlerInput.responseBuilder
            .speak(speechText)
            .reprompt(speechText)
            .withSimpleCard('Skill launched', speechText)
            .withShouldEndSession(false)
            .getResponse();
    }
};

const SendMessageIntentHandler = {
    canHandle(handlerInput) {
        devLogger.log('Checking if we can handle SendMessageIntent');
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
        && Alexa.getIntentName(handlerInput.requestEnvelope) === 'SendMessageIntent';
    },
    async handle(handlerInput) {
        const accessToken = handlerInput.requestEnvelope.context.System.user.accessToken;
        if (accessToken === undefined) {
            return handlerInput.responseBuilder
                .speak('Please log into your Netsblox account.')
                .withLinkAccountCard()
                .getResponse();
        } else {
            const projectName = Alexa.getSlotValue(handlerInput.requestEnvelope, "project");
            const content = {
                message: Alexa.getSlotValue(handlerInput.requestEnvelope, "message"),
            };

            devLogger.log("Handling sending message intent");

            const token = await OAuth.getToken(accessToken);
            const username = token.username;

            let address = projectName + "@" + username;

            //don't worry about roles for now
            /*const role = Alexa.getSlotValue(handlerInput.requestEnvelope, "role");
            if (role.localeCompare('all') !== 0) {
                address = role + "@" + address;
            }*/

            devLogger.log(address);

            const messageType = "Alexa";
            const speechText = "Sent message '" + content.message + "' to " + projectName;

            const resolvedAddr = await NetsBloxAddress.new(address);

            if (resolvedAddr) {
                const client = new RemoteClient(resolvedAddr.projectId);
                await client.sendMessageToRoom(messageType, content);
            } else {
                return handlerInput.responseBuilder
                    .speak('This project does not exist. ')
                    .withSimpleCard('Message failed', speechText)
                    .withShouldEndSession(false)
                    .getResponse();
            }

            devLogger.log(speechText);

            const reprompt = "What else would you like to do?";

            return handlerInput.responseBuilder
                .speak(speechText)
                .reprompt(reprompt)
                .withSimpleCard('Message sent', speechText)
                .withShouldEndSession(false)
                .getResponse();
        }
    }
};

const HelpIntentHandler = {
    canHandle(handlerInput) {
        devLogger.log('Checking if we can handle HelpIntent');
        return Alexa.getRequestType(handlerInput.requestEnvelope)  === 'IntentRequest'
        && Alexa.getRequestType(handlerInput.requestEnvelope)  === 'AMAZON.HelpIntent';
    },
    handle(handlerInput) {
        devLogger.log('handling HelpIntent...');
        const speechText = 'This skill is a tool to send messages from Alexa to your Netsblox projects. ' +
            'Make sure you are connected to your Netsblox account, then say "Send a message!';

        return handlerInput.responseBuilder
            .speak(speechText)
            .reprompt(speechText)
            .withSimpleCard('Hello World', speechText)
            .getResponse();
    }
};

const CancelAndStopIntentHandler = {
    canHandle(handlerInput) {
        devLogger.log('Checking if we can handle CancelIntent');
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest' &&
            (Alexa.getIntentName(handlerInput.requestEnvelope) === 'AMAZON.CancelIntent' ||
                Alexa.getIntentName(handlerInput.requestEnvelope) === 'AMAZON.StopIntent');
    },
    handle(handlerInput) {
        devLogger.log('handling CancelIntent...');
        const speechText = 'Goodbye!';

        return handlerInput.responseBuilder
            .speak(speechText)
            .withSimpleCard('Hello World', speechText)
            .withShouldEndSession(true)
            .getResponse();
    }
};

const SessionEndedRequestHandler = {
    canHandle(handlerInput) {
        devLogger.log('Checking if we can handle SessionEnded');
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'SessionEndedRequest';
    },
    handle(handlerInput) {
        devLogger.log('handling SessionEnded');
        // Log the reason why the session was ended
        const reason = handlerInput.requestEnvelope.request.reason;
        devLogger.log("==== SESSION ENDED WITH REASON ======");
        devLogger.log(reason);
        return handlerInput.responseBuilder.getResponse();
    }
};

const ErrorHandler = {
    canHandle() {
        devLogger.log('Checking if we can handle error');
        return true;
    },
    handle(handlerInput, error) {
        devLogger.log('handling error');
        devLogger.log(`Error handled: ${error.message}`);

        return handlerInput.responseBuilder
            .speak('Sorry, I can\'t understand the command.')
            .reprompt('How would you like to interact with NetsBlox?')
            .getResponse();
    },
};

const FallbackHandler = {
    canHandle(handlerInput) {
        const request = handlerInput.requestEnvelope.request;
        return request.type === 'IntentRequest'
            && request.intent.name === 'AMAZON.FallbackIntent';
    },
    handle(handlerInput) {
        return handlerInput.responseBuilder
            .speak('Sorry, I can\'t understand the command.')
            .reprompt('How would you like to interact with NetsBlox?')
            .getResponse();
    },
};

/**
 * Request Interceptor to log the request sent by Alexa
 */
const LogRequestInterceptor = {
    async process(handlerInput) {
        // Log Request
        devLogger.log("==== REQUEST ======");
        devLogger.log(JSON.stringify(handlerInput.requestEnvelope, null, 2));
        const {accessToken} = handlerInput.requestEnvelope.session.user;
        const token = await OAuth.getToken(accessToken);
        devLogger.log("Resolved username: " + token.username);
    }
};


skillBuilder.addRequestInterceptors(LogRequestInterceptor);

skillBuilder.addRequestHandlers(
    LaunchRequestHandler,
    SendMessageIntentHandler,
    HelpIntentHandler,
    CancelAndStopIntentHandler,
    SessionEndedRequestHandler,
    ErrorHandler,
    FallbackHandler,
);

const skill = skillBuilder.create();
const adapter = new ExpressAdapter(skill, true, true);
const port = process.env.PORT || 4675;
let amazonResponse;

if (require.main === module) {
    const app = express();
    app.use(handleErrors(async (req, res, next) => {
        const [/*prefix*/, tokenID] = req.get('Authorization').split(' ');
        const token = await OAuth.getToken(tokenID);
        req.token = token;
        next();
    }));
    app.get('/test', (req, res) => res.send('working'));
    app.get('/whoami', (req, res) => res.send(req.token.username));
    app.use('/', adapter.getRequestHandlers());
    app.listen(port, function() {
        devLogger.log("Alexa: dev endpoint listening on port " + port);
    });
} else {
    const router = express();
    const parseCookies = cookieParser();
    router.get('/ping', (req, res) => res.send('pong'));
    router.get('/login.html', parseCookies, setUsername, handleErrors((req, res) => {
        //const {username} = req.session;
        const username = 'tabithalee';
        devLogger.log('login (to amazon) w/ (netsblox) username: ' + username);
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
        console.log('>>> sending HTML:', AmazonLoginTemplate({username, env: process.env}));
        res.send(AmazonLoginTemplate({username, env: process.env}));
    }));
    router.post('/login.html/tokens', parseCookies, setUsername, handleErrors(async (req, res) => {
        const {username} = req.session;
        const isLoggedIn = !!username;
        if (!isLoggedIn) {
            throw new LoginRequired();
        }

        const amazonResponse = req.body;
        if (amazonResponse) {
            const options = {
                url: "https://api.amazon.com/auth/o2/token",
                code: amazonResponse,
                client_id: process.env.ALEXA_CLIENT_ID,
                client_secret: process.env.ALEXA_CLIENT_SECRET
            };

            const tokens = request.post(options, (err, res, body) => {
                if (err) {
                    devLogger.log(err);
                    return;
                }
                devLogger.log(body);
                return body;
            });

            if (tokens) {
                const accessToken = tokens.access_token;
                const refreshToken = tokens.refresh_token;
                const collection = GetTokenStore();
                await collection.updateOne({username, accessToken, refreshToken}, {upsert: true});
            }
        }
        return res.sendStatus(200);
    }));
    router.post('/', adapter.getRequestHandlers());
    router.get('/whoami', (req, res) => res.send(req.token.username));
    devLogger.log('Mounting Alexa routes on NetsBlox');
    module.exports = router;
}


