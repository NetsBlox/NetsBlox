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
        return Alexa.getRequestType(handlerInput.requestEnvelope)  === 'IntentRequest'
        && Alexa.getRequestType(handlerInput.requestEnvelope)  === 'AMAZON.HelpIntent';
    },
    handle(handlerInput) {
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
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest' &&
            (Alexa.getIntentName(handlerInput.requestEnvelope) === 'AMAZON.CancelIntent' ||
                Alexa.getIntentName(handlerInput.requestEnvelope) === 'AMAZON.StopIntent');
    },
    handle(handlerInput) {
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
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'SessionEndedRequest';
    },
    handle(handlerInput) {
        // Log the reason why the session was ended
        const reason = handlerInput.requestEnvelope.request.reason;
        devLogger.log("==== SESSION ENDED WITH REASON ======");
        devLogger.log(reason);
        return handlerInput.responseBuilder.getResponse();
    }
};

const ErrorHandler = {
    canHandle() {
        return true;
    },
    handle(handlerInput, error) {
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
    router.use('/services/routes/alexa', handleErrors(async (req, res, next) => {
        const [/*prefix*/, tokenID] = req.get('Authorization').split(' ');
        const token = await OAuth.getToken(tokenID);
        req.token = token;
        return next();
    }));
    router.post('/services/routes/alexa', adapter.getRequestHandlers());
    router.get('/services/routes/alexa/whoami', (req, res) => res.send(req.token.username));
    devLogger.log('Mounting Alexa routes on NetsBlox');
    module.exports = router;
}
