const _ = require('lodash');
const {SERVER_URL} = process.env;
const AlexaSMAPI = require('ask-smapi-sdk');
const clientID = process.env.ALEXA_CLIENT_ID;
const clientSecret = process.env.ALEXA_CLIENT_SECRET;
const GetStorage = require('./storage');
const OAuth = require('../../../api/core/oauth');
const OAUTH_CLIENT_NAME = 'Amazon Alexa';

let alexaClientID;
async function registerOAuthClient() {
    const clients = await OAuth.getClients();
    const alexaClient = clients.find(client => client.name === OAUTH_CLIENT_NAME);
    alexaClientID = alexaClient ? alexaClient._id :
        await OAuth.createClient(null, OAUTH_CLIENT_NAME);
}

function clarifyError(error) {
    const {violations=[]} = (error.response || {});
    if (error.message.includes('is invalid') && violations.length) {
        return new Error(error.response.violations.map(violation => violation.message).join('\n'));
    }
    return error;
}

const ensureLoggedIn = function(caller) {
    if (!caller.username) {
        throw new Error('Login required.');
    }
};

const getAPIClient = async function(caller) {
    ensureLoggedIn(caller);
    const collection = GetStorage().tokens;
    const tokens = await collection.findOne({username: caller.username});
    if (!tokens) {
        throw new Error('Amazon Login required. Please login.');
    }

    const {access_token, refresh_token} = tokens;
    const refreshTokenConfig = {
        'clientId' : clientID,
        'clientSecret': clientSecret,
        'refreshToken': refresh_token,
        'accessToken': access_token,
    };

    return new AlexaSMAPI.StandardSmapiClientBuilder()
        .withRefreshTokenConfig(refreshTokenConfig)
        .client();
};

function sleep(duration) {
    return new Promise(resolve => setTimeout(resolve, duration));
}

function getServerURL() {
    return SERVER_URL;
}

function getOAuthClientID() {
    return alexaClientID;
}

function getConfigWithDefaults(configuration) {
    const skillConfigDefaults = {
        description: 'An under-development Alexa Skill created in NetsBlox!',
        examples: ['none yet!'],
        summary: 'An under-development Alexa Skill created in NetsBlox!',
    };

    return _.merge({}, skillConfigDefaults, configuration);
}

async function getSkillData(id) {
    const {skills} = GetStorage();
    const skillData = await skills.findOne({_id: id});
    if (!skillData) {
        throw new Error('Skill not found.');
    }
    return skillData;
}

module.exports = {
    getAPIClient,
    clarifyError,
    sleep,
    getServerURL,
    registerOAuthClient,
    getOAuthClientID,
    getConfigWithDefaults,
    getSkillData,
};
