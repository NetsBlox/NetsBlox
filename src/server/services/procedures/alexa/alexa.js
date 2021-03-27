const _ = require('lodash');

const Alexa = {};

//const AlexaSMAPI = require('ask-smapi-sdk');

var spawnSync = require('child_process').spawnSync;

var clientID = process.env.ALEXA_CLIENT_ID,
    clientSecret = process.env.ALEXA_CLIENT_SECRET;

//temp
var refreshToken = "";
var vendorID = "";

const refreshTokenConfig = {
    clientID,
    clientSecret,
    refreshToken,
};

/*//creates SMAPI client
const smapiClient = new AlexaSMAPI.StandardSmapiClientBuilder()
    .withRefreshTokenConfig(refreshTokenConfig)
    .client();*/

Alexa.getTokens = function() {
    var result = spawnSync('ask util generate-lwa-tokens',
        ['--client-id ' + clientID, '--client-confirmation '+ clientSecret]);

    var parseTokens = result.stdout;
    return parseTokens;
};

Alexa.getAskVersion = function() {
    var result = spawnSync('ask', ['--version']);

    var data = result.stdout;
    return data;
};
/*
//basic listSkills RPC
Alexa.listSkills = function() {
    smapiClient.listSkillsForVendorV1(vendorID)
        .then((response) => {
            return (JSON.stringify(response));
        })
        .catch((err) => {
            devLogger.log(err.message);
            devLogger.log(JSON.stringify(err.response));
        });
};

//gets skill Info
Alexa.getSkillInfo = function(skillId, stage) {
    smapiClient.getSkillManifestV1(skillId, stage)
        .then((response) => {
            return (JSON.stringify(response));
        })
        .catch((err) => {
            devLogger.log(err.message);
            devLogger.log(JSON.stringify(err.response));
        });
};
*/
/*
Alexa.createSkill = function(description, examplePhrases, keywords, name) {
    var skillManifest =
        {
            'publishingInformation':
            {
                'locales':
                    {
                        'en-US':
                            {
                                'summary': description,
                                'examplePhrases': examplePhrases,
                                'keywords': keywords,
                                'name': name,
                            }
                    }
            }
        };
    var skillRequest = {'vendorId' : process.env.ALEXA_VENDOR_ID, 'manifest' : skillManifest};
    smapiClient.createSkillForVendorV1(skillRequest)
        .then((response) => {
            return (JSON.stringify(response));
        })
        .catch((err) => {
            devLogger(err.message);
            return (JSON.stringify(err.response));
        });
};*/

/**
 * Return the caller info as detected by the server.
 * This was added to test the github action and is hopefully useful! :)
 */
Alexa.callerInfo = function() {
    return _.omit(this.caller, ['response', 'request', 'socket', 'apiKey']);
};

module.exports = Alexa;
