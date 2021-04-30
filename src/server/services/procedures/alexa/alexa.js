const Alexa = {};

const AlexaSMAPI = require('ask-smapi-sdk');

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

const createManifestObject = function(summary, description, examplePhrases, keywords, name) {
    let skillRequest =
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
                    "isAvailableWorldwide": true,
                    "testingInstructions": "CUSTOM",
                    "category": "",
                    "distributionCountries": [
                        "US",
                    ]
                },
                "apis": {
                    "custom": {
                        "endpoint" : {
                            "uri" : "https://alexa.netsblox.org/services/routes/alexa"
                        }
                    }
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

    return skillRequest;
};

/**
 * TODO: add some description of the RPC
 *
 * @param {String} summary Summary of the skill request
 * @param {String} description Description of the skill
 * @param {Array<String>} examplePhrases
 * @param {Array<String>} keywords
 * @param {String} name
 */
Alexa.createManifest = async function(summary, description, examplePhrases, keywords, name) {
    return [summary, description, examplePhrases, keywords, name];
};

Alexa.updateSkillManifest = async function(manifest) {
    const response = await smapiClient.createSkillForVendorV1(
        createManifestObject(manifest[0], manifest[1], manifest[2], manifest[3], manifest[4]));
    devLogger.log(JSON.stringify(response));

    return response;
};

//untested createSkill RPC
Alexa.createSkill = async function(manifest) {
    const response = await smapiClient.createSkillForVendorV1(
        createManifestObject(manifest[0], manifest[1], manifest[2], manifest[3], manifest[4]));
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
    return [intent, name, samples, prompts];
};

const createSlotsObject = function(intent, name, samples, prompts) {
    let variations = [];
    for (let i of prompts) {
        variations.push(
            {
                "type": "PlainText",
                "value": i
            }
        );
    }
    let slotInfo =
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
                "variations": variations
            }
        };


    devLogger.log(JSON.stringify(slotInfo));

    return slotInfo;
};

Alexa.createIntent = function (name, slots, samples) {
    return [name, slots, samples];
};

const createIntentsObject = function(name, slots, samples) {
    let slotsObjectsList = [];
    devLogger.log("Slots: ");
    devLogger.log(JSON.stringify(slots));
    for (let i of slots) {
        devLogger.log("Intent: " + i[0] + " Name: " + i[1] + " Samples: " + i[2] + " Prompts " + i[3]);
        slotsObjectsList.push(createSlotsObject(i[0], i[1], i[2], i[3]));
    }

    let intent =
        {
            "name": name,
            "slots": [],
            "samples": samples
        };

    for (let i of slotsObjectsList) {
        intent.slots.push(i.intentSlotInfo);
    }
    devLogger.log("First intents Object: ");
    devLogger.log(JSON.stringify(intent));

    return intent;
};

const createSecondIntentsObject = function(name, slots) {
    let slotsObjectsList = [];
    let slotObjectsReturn = [];

    for (let i of slots) {
        slotsObjectsList.push(createSlotsObject(i[0], i[1], i[2], i[3]));
    }

    for (let i of slotsObjectsList) {
        slotObjectsReturn.push(i.slotInfo);
    }

    devLogger.log("Second intents Object: ");
    devLogger.log(JSON.stringify(slotObjectsReturn));

    return slotObjectsReturn;
};

const createThirdIntentsObject = function(name, slots) {
    let slotsObjectsList = [];
    let slotObjectsReturn = [];

    for (let i of slots) {
        slotsObjectsList.push(createSlotsObject(i[0], i[1], i[2], i[3]));
    }

    for (let i of slotsObjectsList) {
        slotObjectsReturn.push(i.promptInfo);
    }

    devLogger.log("Second intents Object: ");
    devLogger.log(JSON.stringify(slotObjectsReturn));

    return slotObjectsReturn;
};

Alexa.createInteractionModel = async function (skillId, stage, intents, invocationName) {
    let intentsList = [];
    let slotInfos = [];
    let promptInfos = [];

    for (let i of intents) {
        devLogger.log("Interaction model line: ");
        intentsList.push(createIntentsObject(i[0], i[1], i[2]));
        slotInfos.push(createSecondIntentsObject(i[0], i[1]));
        promptInfos.push(createThirdIntentsObject(i[0], i[1]));
    }

    let intentsArray = [
        {
        "name": "AMAZON.CancelIntent",
        "samples": []
        },
        {
            "name": "AMAZON.HelpIntent",
            "samples": []
        },
        {
            "name": "AMAZON.StopIntent",
            "samples": []
        },
        {
            "name": "AMAZON.NavigateHomeIntent",
            "samples": []
        },
        {
            "name": "AMAZON.FallBackIntent",
            "samples": []
        }
    ];

    let intentsSlots = [];

    for (let i of intentsList) {
        intentsArray.push(
            {
                "name": i.name,
                "slots": i.slots,
                "samples": i.samples
            }
        );
    }

    let j = 5;

    for (let i of slotInfos) {
        intentsSlots.push(
            {
                "name": intentsArray[j].name,
                "confirmationRequired": false,
                "prompts": {},
                "slots": i
            }
        );
        j++;
    }

    let promptInfosFormatted = [];

    for (let i of promptInfos) {
        for (let j of i) {
            promptInfosFormatted.push(j);
        }
    }

    const interactionModel =
        {
            "interactionModel": {
                "languageModel": {
                    "invocationName": invocationName,
                    "modelConfiguration": {
                        "fallbackIntentSensitivity": {
                            "level": "LOW"
                        }
                    },
                    "intents": intentsArray,
                    "types": [],
                },
                "dialog": {
                    "intents": intentsSlots,
                    "delegationStrategy": "ALWAYS"
                },
                "prompts": promptInfosFormatted
            }
        };

    devLogger.log("Interaction Model: ");
    devLogger.log(JSON.stringify(interactionModel));

    const response = await smapiClient.setInteractionModelV1(skillId, stage, 'en-US', interactionModel);
    devLogger.log(response);

    return response;
};

//further RPCs for testing only
Alexa.getVendorId = function () {
    return vendorID;
};

module.exports = Alexa;