const InputTypes = require('../../input-types');
const OAuth = require('../../../api/core/oauth');
const bodyParser = require('body-parser');
const axios = require('axios');
const qs = require('qs');
const {handleErrors, setUsername} = require('../../../api/rest/utils');
const {LoginRequired, RequestError} = require('../../../api/core/errors');
const {SERVER_PROTOCOL, LOGIN_URL} = process.env;
const GetTokenStore = require('./tokens');
const GetStorage = require('./storage');
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

async function getSkillConfig(skillId) {
    const {skills} = GetStorage();
    return await skills.findOne({_id: skillId});
}

const LaunchRequestHandler = {
    canHandle(handlerInput) {
        devLogger.log('Checking if we can handle LaunchRequest');
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'LaunchRequest';
    },
    handle(handlerInput) {
        // TODO: Look up the name from the database
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

            const messageType = "Alexa";
            const speechText = "Sent message '" + content.message + "' to " + projectName;

            try {
                const resolvedAddr = await NetsBloxAddress.new(address);
                const client = new RemoteClient(resolvedAddr.projectId);
                await client.sendMessageToRoom(messageType, content);
            } catch (e) {
                return handlerInput.responseBuilder
                    .speak('This project does not exist. ')
                    .withSimpleCard('Message failed', speechText)
                    .withShouldEndSession(false)
                    .getResponse();
            }

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


//skillBuilder.addRequestInterceptors(LogRequestInterceptor);

const NetsBloxSkillHandler = {
    async canHandle(handlerInput) {
        devLogger.log('checking if we can handle request w/ NetsBloxSkillHandler');
        devLogger.log(JSON.stringify(handlerInput.requestEnvelope));
        // TODO: Can this be async?
        const {applicationId} = handlerInput.requestEnvelope.session.application;
        const skillConfig = await getSkillConfig(applicationId);
        if (!skillConfig) {
            return false;
        }

        const intentName = Alexa.getIntentName(handlerInput.requestEnvelope);
        const intentNames = skillConfig.intents.map(intent => intent.name);
        return intentNames.includes(intentName);
    },

    async handle(handlerInput) {
        const {applicationId} = handlerInput.requestEnvelope.session.application;
        const intentName = Alexa.getIntentName(handlerInput.requestEnvelope);
        const skillConfig = await getSkillConfig(applicationId);
        const intent = skillConfig.intents.find(intent => intent.name === intentName);
        const fn = await InputTypes.parse.Function(intent.handler);
        const slotValues = intent.slots
            .map(slot => handlerInput.requestEnvelope.request.intent.slots[slot.name].value);
        let speechText;
        try {
            speechText = await fn(slotValues);
        } catch (err) {
            speechText = `An error occurred: ${err.message}`;
        }

        return handlerInput.responseBuilder
            .speak(speechText)
            .withSimpleCard(skillConfig.name, speechText)
            .withShouldEndSession(true)
            .getResponse();
    },
};

skillBuilder.addRequestHandlers(
    NetsBloxSkillHandler,
);
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
        devLogger.log(`Alexa: dev endpoint listening on port ${port}`);
    });
} else {
    const router = express();
    const parseCookies = cookieParser();
    router.get('/ping', (req, res) => res.send('pong'));
    router.get('/login.html', bodyParser.json(), parseCookies, setUsername, handleErrors((req, res) => {
        devLogger.log('Cookie ' + req.cookies['netsblox-cookie']);
        const username = req.session.username;

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
        res.send(AmazonLoginTemplate({username, env: process.env}));
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
                    redirect_uri: 'https://alexa.netsblox.org/services/routes/alexa/tokens'  // FIXME
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

            const collection = GetTokenStore();
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
        bodyParser.text({type: '*/*'}),
        handleErrorsInAlexa(async (req, res) => {
            const reqData = JSON.parse(req.body);
            const {accessToken} = reqData.session.user;
            const token = await OAuth.getToken(accessToken);
            const {username} = token;

            const skillId = reqData.session.application.applicationId;

            if (reqData.request.type === 'IntentRequest') {
                const {intent} = reqData.request;
                const {skills} = GetStorage();
                const skillData = await skills.findOne({_id: skillId});
                if (!skillData) {
                    throw new RequestError('Skill not found.');
                }

                const intentConfig = skillData.config.intents
                    .find(intentConfig => intentConfig.name === intent.name);

                if (!intentConfig) {
                    return res.json(speak(`Could not find ${intent.name} intent. Perhaps you need to update the Alexa Skill.`));
                }

                const handlerXML = intentConfig.handler;
                const {context} = skillData;
                context.username = username;
                const handler = await InputTypes.parse.Function(handlerXML, null, {caller: context});

                const {slots=[]} = intentConfig;
                const slotNames = slots.map(slot => slot.name);
                const slotData = slotNames.map(name => intent.slots[name]?.value);
                try {
                    const responseText = await handler(...slotData);
                    return res.json(speak(responseText));
                } catch (err) {
                    res.json(speak(`An error occurred in the ${intent.name} handler: ${err.message}`));
                }
            }
        })
    );
    router.get('/whoami', (req, res) => res.send(req.token?.username));
    module.exports = router;
}

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
                res.json(speak(`An error occurred. ${err.message}`));
            }
            throw err;
        }
    };
}
