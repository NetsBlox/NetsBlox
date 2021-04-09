const _ = require('lodash');

const Alexa = {};

const AlexaSMAPI = require('ask-smapi-sdk');

var spawnSync = require('child_process').spawnSync;

const devLogger = require('../utils/dev-logger');

var clientID = process.env.ALEXA_CLIENT_ID,
    clientSecret = process.env.ALEXA_CLIENT_SECRET,
    refreshToken = process.env.ALEXA_REFRESH_TOKEN,
    accessToken = process.env.ALEXA_ACCESS_TOKEN,
    vendorID = process.env.ALEXA_VENDOR_ID;

//temp
var refreshTokenConfig = {
    "clientId" : clientID,
    "clientSecret": clientSecret,
    "refreshToken": refreshToken,
    "accessToken": accessToken,
};

//creates SMAPI client
var smapiClient = new AlexaSMAPI.StandardSmapiClientBuilder()
    .withRefreshTokenConfig(refreshTokenConfig)
    .client();


const validateList = list => {
    if (!Array.isArray(list)) {
        throw new Error('"data" must be a list of lists.');
    }
};

const ensureLoggedIn = function(caller) {
    if (!caller.username) {
        throw new Error('Login required.');
    }
};

//update tokens
Alexa.getTokens = function() {
    refreshToken = process.env.ALEXA_REFRESH_TOKEN;
    accessToken = process.env.ALEXA_ACCESS_TOKEN;

    refreshTokenConfig.refreshToken = refreshToken;
    refreshTokenConfig.accessToken = accessToken;

    devLogger.log(refreshTokenConfig.refreshToken);
    devLogger.log(refreshTokenConfig.accessToken);

    smapiClient = new AlexaSMAPI.StandardSmapiClientBuilder()
        .withRefreshTokenConfig(refreshTokenConfig)
        .client();

    return refreshTokenConfig;
};

Alexa.getVendorList = async function () {
    const response = await smapiClient.getVendorListV1();
    devLogger.log(JSON.stringify(response));

    return response;
};

//basic listSkills RPC
Alexa.listSkills = async function() {
    const response = await smapiClient.listSkillsForVendorV1(vendorID);
    devLogger.log(JSON.stringify(response));

    return response.skills;
};

//gets skill Info
Alexa.getSkillInfo = async function(skillId, stage) {
    const response = await smapiClient.getSkillManifestV1(skillId, stage);
    devLogger.log(JSON.stringify(response));

    return response;
};


//untested createSkill RPC
Alexa.createSkill = function(summary, description, examplePhrases, keywords, name) {
    validateList(examplePhrases);
    validateList(keywords);
    var skillRequest =
        {
            "vendorId": vendorID,
            "manifest": {
                "publishingInformation": {
                    "locales": {
                        "en-US": {
                            "summary": summary,
                            "examplePhrases": examplePhrases,
                            "keywords": keywords,
                            "name": name,
                            "description": description
                        }
                    },
                    "isAvailableWorldwide": false,
                    "testingInstructions": "CUSTOM",
                    "category": "",
                    "distributionCountries": [
                        "US",
                    ]
                },
                "apis": {
                    "custom": {}
                },
                "manifestVersion": "1.0",
                "privacyAndCompliance": {
                    "allowsPurchases": false,
                    "usesPersonalInfo": false,
                    "isChildDirected": false,
                    "isExportCompliant": true,
                    "containsAds": false,
                    "locales": {
                        "en-US": {
                            "privacyPolicyUrl": "https://editor.netsblox.org/privacy.html",
                            "termsOfUseUrl": "https://editor.netsblox.org/tos.html"
                        }
                    }
                },
            }
        };

    devLogger.log(JSON.stringify(skillRequest));
    const response = smapiClient.createSkillForVendorV1(skillRequest);
    devLogger.log(JSON.stringify(response));

    return response;
};

//get interaction model of skill
Alexa.getInteractionModel = function (skillId, stage) {
    const response = smapiClient.getInteractionModelV1(skillId, stage, 'en-US');
    devLogger.log(JSON.stringify(response));

    return response;
};


/**
 * Return the caller info as detected by the server.
 * This was added to test the github action and is hopefully useful! :)
 */
Alexa.callerInfo = function() {
    return _.omit(this.caller, ['response', 'request', 'socket', 'apiKey']);
};

//further RPCs for testing only
Alexa.getVendorId = function () {
    return vendorID;
};

Alexa.getAskVersion = function() {
    const result = spawnSync('ask', ['--version']);

    return result.stdout;
};

module.exports = Alexa;
