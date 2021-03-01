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
        const speechText = 'Welcome to the Alexa NetsBlox Skill, you can say hello!';

        return handlerInput.responseBuilder
            .speak(speechText)
            .reprompt(speechText)
            .withSimpleCard('Hello World', speechText)
            .getResponse();
    }
};

const HelloWorldIntentHandler = {
    canHandle(handlerInput) {
        devLogger.log('Checking if we can handle HelloWorldIntent');
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
        && Alexa.getIntentName(handlerInput.requestEnvelope) === 'HelloWorldIntent';
    },
    async handle(handlerInput) {
        const speechText = 'Hello World!';

        devLogger.log("Handling hello world intent");
        const address = "test@tabithalee";
        const messageType = "Alexa";
        const resolvedAddr = await NetsBloxAddress.new(address);
            //.catch(err => {
                //res.status(400).send(err.message);
            //});

        if (resolvedAddr) {
            devLogger.log("Sending message to " + address);
            const client = new RemoteClient(resolvedAddr.projectId);
            await client.sendMessageToRoom(messageType, speechText);
            // TODO: get a response from the netsblox client?
        }

        return handlerInput.responseBuilder
            .speak(speechText)
            .withSimpleCard('Hello World', speechText)
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
            .speak('Sorry, I can\'t understand the command. Please say again.')
            .reprompt('Sorry, I can\'t understand the command. Please say again.')
            .getResponse();
    },
};

/**
 * Request Interceptor to log the request sent by Alexa
 */
const LogRequestInterceptor = {
    process(handlerInput) {
        // Log Request
        devLogger.log("==== REQUEST ======");
        devLogger.log(JSON.stringify(handlerInput.requestEnvelope, null, 2));
    }
};

skillBuilder.addRequestInterceptors(LogRequestInterceptor);

skillBuilder.addRequestHandlers(
    LaunchRequestHandler,
    HelloWorldIntentHandler,
    HelpIntentHandler,
    CancelAndStopIntentHandler,
    SessionEndedRequestHandler,
    ErrorHandler,
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
        console.log('body:', req.body);
        req.token = {username: 'tabithalee'};  // FIXME: REMOVE
        return next();  // FIXME: REMOVE!

        const authCode = req.get('Authorization');
        if (!authCode) {
            return res.status(400).send('Access denied.');  // TODO: better error message
        }

        const [/*prefix*/, tokenID] = authCode.split(' ');
        const token = await OAuth.getToken(tokenID);
        req.token = token;
        return next();
    }));
    router.post('/', adapter.getRequestHandlers());
    router.get('/whoami', (req, res) => res.send(req.token.username));
    devLogger.log('Mounting Alexa routes on NetsBlox');
    module.exports = router;
}
