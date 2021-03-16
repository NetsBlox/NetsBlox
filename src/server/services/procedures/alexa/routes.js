const OAuth = require('../../../api/core/oauth');
const {handleErrors} = require('../../../api/rest/utils');
const NetsBloxAddress = require('../../../netsblox-address');
const Alexa = require('ask-sdk-core');
const express = require('express');
const { ExpressAdapter } = require('ask-sdk-express-adapter');
const devLogger = require('../utils/dev-logger');
const RemoteClient = require('../../remote-client');

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
        const speechText = 'Welcome to the Alexa NetsBlox Skill. Would you like to send a message?';

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
        const projectName = Alexa.getSlotValue(handlerInput.requestEnvelope, "project");
        const content = {
            message: Alexa.getSlotValue(handlerInput.requestEnvelope, "message"),
        };

        devLogger.log("Handling sending message intent");
        const authCode = handlerInput.requestEnvelope.context.System.user.accessToken;

        devLogger.log("token as provided by Alexa: " + authCode);
        const [/*prefix*/, tokenID] = authCode.split(' ');
        //const token = await OAuth.getToken(tokenID);

        //devLogger.log("Resolved: " + JSON.stringify(token));

        //const username = token.username;

        const address = projectName + "@tabithalee";
        const messageType = "Alexa";
        const speechText = "Message '" + content.message + "' sent to " + address;
        const resolvedAddr = await NetsBloxAddress.new(address);
            //.catch(err => {
                //res.status(400).send(err.message);
            //});

        if (resolvedAddr) {
            devLogger.log("Sending message to " + address);
            devLogger.log("Message is " + content.message);
            const client = new RemoteClient(resolvedAddr.projectId);
            await client.sendMessageToRoom(messageType, content);
            devLogger.log("Message sent to " + address);
        }

        return handlerInput.responseBuilder
            .speak(speechText)
            .withSimpleCard('Message sent', speechText)
            .withShouldEndSession(false)
            .getResponse();
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
        const speechText = 'You can say hello to me!';

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
    router.get('/ping', (req, res) => res.send('pong'));
    router.use('/', handleErrors(async (req, res, next) => {
        // The following two lines are a workaround to bypass authentication
        // (only to make development more convenient) and should be removed
        // before this is actually used.
        devLogger.log(`Bypassing authentication and setting user to tabithalee (${req.method})`);
        req.token = {username: 'tabithalee'};  // FIXME: REMOVE
        return next();  // FIXME: REMOVE!

        const authCode = req.get('Authorization');
        devLogger.log("Authorization header: " + authCode);
        if (!authCode) {
            devLogger.log("401 Error");
            return res.status(401).send('Access denied.');  // TODO: better error message
        }

        const [/*prefix*/, tokenID] = authCode.split(' ');
        devLogger.log("token ID: " + tokenID);
        const token = await OAuth.getToken(tokenID);
        // "token" contains:
        //   - username
        //   - client ID (referring to the Alexa app in this case) (clientId)
        //   - creation time (createdAt)
        //   - token ID (_id)
        devLogger.log("oauth token: " + JSON.stringify(token));
        req.token = token;
        return next();
    }));
    router.post('/', adapter.getRequestHandlers());
    router.get('/whoami', (req, res) => res.send(req.token.username));
    devLogger.log('Mounting Alexa routes on NetsBlox');
    module.exports = router;
}
