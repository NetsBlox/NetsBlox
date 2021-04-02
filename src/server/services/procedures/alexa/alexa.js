const _ = require('lodash');

const Alexa = {};

const AlexaSMAPI = require('ask-smapi-sdk');

var spawnSync = require('child_process').spawnSync;

var clientID = process.env.ALEXA_CLIENT_ID,
    clientSecret = process.env.ALEXA_CLIENT_SECRET,
    refreshToken = process.env.ALEXA_REFRESH_TOKEN,
    accessToken = process.env.ALEXA_ACCESS_TOKEN,
    vendorID = process.env.ALEXA_VENDOR_ID;

//temp

const refreshTokenConfig = {
    "clientId" : clientID,
    "clientSecret": clientSecret,
    "refreshToken": refreshToken,
    "accessToken": accessToken,
};

//creates SMAPI client
const smapiClient = new AlexaSMAPI.StandardSmapiClientBuilder()
    .withRefreshTokenConfig(refreshTokenConfig)
    .client();

Alexa.getTokens = function() {
    return refreshTokenConfig;
};

Alexa.getVendorList = function () {
    return smapiClient.getVendorListV1()
        .then((response) => {
            return (JSON.stringify(response));
        })
        .catch((err) => {
            return err.message + JSON.stringify(err.response);
        });
};

Alexa.getVendorId = function () {
    return vendorID;
};

Alexa.getAskVersion = function() {
    var result = spawnSync('ask', ['--version']);

    return result.stdout;
};

//basic listSkills RPC
Alexa.listSkills = function() {
    return smapiClient.listSkillsForVendorV1(vendorID)
        .then((response) => {
            return 'test true';
            //return (JSON.stringify(response));
        })
        .catch((err) => {
            return 'test false';
            //return err.message + JSON.stringify(err.response);
        });
};

//gets skill Info
Alexa.getSkillInfo = function(skillId, stage) {
    return smapiClient.getSkillManifestV1(skillId, stage)
        .then((response) => {
            return (JSON.stringify(response));
        })
        .catch((err) => {
            return err.message + JSON.stringify(err.response);
        });
};

//untested createSkill RPC
Alexa.createSkill = function(description, examplePhrases, keywords, name) {
    var skillRequest =
        {
            "vendorId": vendorID,
            "manifest": {
                "publishingInformation": {
                    "locales": {
                        "en-US": {
                            "summary": description,
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
                }
            }
        };
    return smapiClient.createSkillForVendorV1(skillRequest)
        .then((response) => {
            return (JSON.stringify(response));
        })
        .catch((err) => {
            return err.message + JSON.stringify(err.response);
        });
};

//get interaction model of skill
Alexa.getInteractionModel = function (skillId, stage) {
    return smapiClient.getInteractionModelV1(skillId, stage, 'en-US')
        .then((response) => {
            return (JSON.stringify(response));
        })
        .catch((err) => {
            return err.message + JSON.stringify(err.response);
        });
};


/**
 * Return the caller info as detected by the server.
 * This was added to test the github action and is hopefully useful! :)
 */
Alexa.callerInfo = function() {
    return _.omit(this.caller, ['response', 'request', 'socket', 'apiKey']);
};

module.exports = Alexa;
