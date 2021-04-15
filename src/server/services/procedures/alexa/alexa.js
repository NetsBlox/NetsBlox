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

Alexa.createManifest = async function(summary, description, examplePhrases, keywords, name) {
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
    const response = await smapiClient.createSkillForVendorV1(manifest);
    devLogger.log(JSON.stringify(response));

    return response;
};

Alexa.updateSkillManifest = async function(skillId, stage, manifest) {
    const response = await smapiClient.updateSkillManifestV1(skillId, stage, manifest);
    devLogger.log(JSON.stringify(response));

    return response;
};

//untested createSkill RPC
Alexa.createSkill = async function(manifest) {
    devLogger.log(JSON.stringify(manifest));
    const response = await smapiClient.createSkillForVendorV1(manifest);
    devLogger.log(JSON.stringify(response));

    return response;
};

//get interaction model of skill
Alexa.getInteractionModel = async function (skillId, stage) {
    const response = await smapiClient.getInteractionModelV1(skillId, stage, 'en-US');
    devLogger.log(JSON.stringify(response));

    return response;
};

Alexa.createSlot = function(intent, name, samples, prompts) {
    validateList(prompts);
    var slotInfo =
        {
            "intentSlotInfo" : {
                "name": name,
                "type": "AMAZON.SearchQuery",
                "samples": samples,
            },
            "slotInfo" : {
                "name": name,
                "type": "AMAZON.SearchQuery",
                "confirmationRequired": false,
                "elicitationRequired": true,
                "prompts": {
                    "elicitation": "Elicit.Intent-:" + intent + ".IntentSlot-" + name
                }
            },
            "promptInfo" : {
                "id": "Elicit.Intent-:" + intent + ".IntentSlot-" + name,
                "variations": []
            }
        };

    for (let i in prompts) {
        slotInfo.push.promptInfo.variations(
            {
                "type": "PlainText",
                "value": i
            }
        );
    }
    devLogger.log(JSON.stringify(slotInfo));

    return slotInfo;
};

Alexa.createIntent = function (name, slots, samples) {
    validateList(samples);

    var intent =
        {
            "name": name,
            "slots": [],
            "samples": samples
        };

    for (let i in slots) {
        intent.slots.push(i.intentSlotInfo);
    }
    devLogger.log(JSON.stringify(intent));

    return intent;
};

Alexa.createInteractionModel = async function (skillId, stage, intents) {
    var intentsArray = [];
    var dialogArray =
        {
            "intents" : [],
            "prompts" : [],
        };
    for (let i of intents) {
        for (let j of i.slots) {
            dialogArray.intents.push(
                {
                    "name": "GetTravelTime",
                    "confirmationRequired": false,
                    "prompts": {},
                    "slots": j.slotInfo
                }
            );
            dialogArray.prompts.push(j.promptInfo);
        }
        intentsArray.push(
            {
                "name": i.name,
                "slots": i.slots,
                "samples": i.samples
            }
        );
    }

    var interactionModel =
        {
            "interactionModel": {
                "languageModel": {
                    "invocationName": name,
                    "modelConfiguration": {
                        "fallbackIntentSensitivity": {
                            "level": "LOW"
                        }
                    },
                    "intents": intentsArray,
                },
                "dialog": {
                    "intents": dialogArray.intents,
                    "delegationStrategy": "ALWAYS"
                },
                "prompts": dialogArray.prompts
            }
        };

    devLogger.log(JSON.stringify(interactionModel));

    const response = await smapiClient.setInteractionModelV1(skillId, stage, 'en-US', interactionModel);
    devLogger.log(response);

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
