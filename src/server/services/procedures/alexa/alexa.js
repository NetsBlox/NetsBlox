/**
 * The Alexa service provides capabilities for building your own services on the Amazon Echo.
 *
 * @service
 * @alpha
 */
const Alexa = {};
const GetTokenStore = require('./tokens');
const GetStorage = require('./storage');
const AlexaSMAPI = require('ask-smapi-sdk');
const clientID = process.env.ALEXA_CLIENT_ID;
const clientSecret = process.env.ALEXA_CLIENT_SECRET;
const SERVER_URL = 'https://alexa.netsblox.org';  // FIXME: this shouldn't be hard-coded

const ensureLoggedIn = function(caller) {
    if (!caller.username) {
        throw new Error('Login required.');
    }
};

const getAPIClient = async function(caller) {
    ensureLoggedIn(caller);
    const collection = GetTokenStore();
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

/**
 * Gets a list of the user's vendor IDs
 *
 * @return {Array} list of the vendor IDs
 */
Alexa.getVendorList = async function () {
    const smapiClient = await getAPIClient(this.caller);
    const response = await smapiClient.getVendorListV1();

    return response.vendors[0].id;
};

/**
 * Gets the list of the user's skills
 *
 * @param {String} vendorId The vendor ID of the user
 *
 * @return {Array} list of the skills
 */
Alexa.listSkills = async function(vendorId) {
    const smapiClient = await getAPIClient(this.caller);
    const response = await smapiClient.listSkillsForVendorV1(vendorId);

    return response.skills;
};

/**
 * Gets the info of a skill.
 *
 * @param {String} skillId the skill ID of the skill
 * @param {String} stage the stage of the skill, for most users will be "development"
 *
 * @return {Array} the skill information
 */
Alexa.getSkillInfo = async function(skillId, stage) {
    const smapiClient = await getAPIClient(this.caller);

    const response = await smapiClient.getSkillManifestV1(skillId, stage);

    return response.manifest;
};

/**
 * A simple helper method available to the user to create an object containing the required manifest
 * information in the correct order.
 *
 * @param {String} summary Summary of the skill request
 * @param {String} description Description of the skill
 * @param {Array<String>} examplePhrases
 * @param {Array<String>} keywords
 * @param {String} name
 *
 * @return {Array} the required manifest information
 */
Alexa.createManifest = async function(summary, description, examplePhrases, keywords, name) {
    ensureLoggedIn(this.caller);
    return [summary, description, examplePhrases, keywords, name];
};

const createManifestObject = function(summary, description, examplePhrases, keywords, name, vendorId) {
    let skillRequest =
        {
            'vendorId': vendorId,
            'manifest': {
                'publishingInformation': {
                    'locales': {
                        'en-US': {
                            'summary': summary,
                            'examplePhrases': examplePhrases,
                            'keywords': keywords,
                            'name': name,
                            'description': description
                        }
                    },
                    'isAvailableWorldwide': true,
                    'testingInstructions': 'CUSTOM',
                    'category': '',
                    'distributionCountries': [
                        'US',
                    ]
                },
                'apis': {
                    'custom': {
                        'endpoint' : {
                            'uri' : `${SERVER_URL}/services/routes/alexa`
                        }
                    }
                },
                'manifestVersion': '1.0',
                'privacyAndCompliance': {
                    'allowsPurchases': false,
                    'usesPersonalInfo': false,
                    'isChildDirected': false,
                    'isExportCompliant': true,
                    'containsAds': false,
                    'locales': {
                        'en-US': {
                            'privacyPolicyUrl': `${SERVER_URL}/privacy.html`,
                            'termsOfUseUrl': `${SERVER_URL}/tos.html`
                        }
                    }
                },
            }
        };

    return skillRequest;
};

/**
 * Allows the user to call the Alexa SMAPI and update the skill manifest of a skill
 * given the manifest object created by createManifest.
 *
 * @param {String} skillId the skill ID of the skill whose manifest we want to update
 * @param {String} stage the stage of the skill, for most users will be 'development'
 * @param {Array} manifest the object returned by createManifest
 * @param {String} vendorId vendor ID of the user
 *
 * @return {Array} The response of the API call
 */
Alexa.updateSkillManifest = async function(skillId, stage, manifest, vendorId) {
    const smapiClient = await getAPIClient(this.caller);

    const response = await smapiClient.updateSkillManifestV1(skillId, stage,
        createManifestObject(manifest[0], manifest[1], manifest[2], manifest[3], manifest[4], vendorId));

    return response;
};

/**
 * Allows the user to call the Alexa SMAPI and create the skill manifest of a skill
 * given the manifest object created by createManifest.
 *
 * @param {Array} manifest the object returned by createManifest
 * @param {String} vendorId vendor ID of the user
 *
 * @return {String} The response of the API call, containing the newly created skillId
 */
Alexa.createSkill = async function(manifest, vendorId) {
    const smapiClient = await getAPIClient(this.caller);

    const response = await smapiClient.createSkillForVendorV1(
        createManifestObject(manifest[0], manifest[1], manifest[2], manifest[3], manifest[4], vendorId));

    return response.skillId;
};

/**
 * Obtains the interaction model of a skill.
 *
 * @param {String} skillId the skill ID of the skill
 * @param {String} stage the stage of the skill, for most users will be "development"
 *
 * @return {Array} The response of the API call containing the interaction model
 */
Alexa.getInteractionModel = async function (skillId, stage) {
    const smapiClient = await getAPIClient(this.caller);

    const response = await smapiClient.getInteractionModelV1(skillId, stage, 'en-US');

    return response;
};

/**
 * A simple helper method available to the user to create an object containing the required slot
 * information in the correct order.
 *
 * @param {String} intent Summary of the skill request
 * @param {String} name Description of the skill
 * @param {Array<String>} samples Samples of responses containing the slot
 * @param {Array<String>} prompts Alexa prompts to ask the user for the slot
 *
 * @return {Array} the required slot information
 */
Alexa.createSlot = function(intent, name, samples, prompts) {
    ensureLoggedIn(this.caller);
    return [intent, name, samples, prompts];
};

const createSlotsObject = function(intent, name, samples, prompts) {
    let variations = [];
    for (let i of prompts) {
        variations.push(
            {
                'type': 'PlainText',
                'value': i
            }
        );
    }
    let slotInfo =
        {
            'intentSlotInfo' : {
                'name': name,
                'type': 'AMAZON.SearchQuery',
                'samples': samples,
            },
            'slotInfo' : {
                'name': name,
                'type': 'AMAZON.SearchQuery',
                'confirmationRequired': false,
                'elicitationRequired': true,
                'prompts': {
                    'elicitation': 'Elicit.Intent-:' + intent + '.IntentSlot-' + name
                }
            },
            'promptInfo' : {
                'id': 'Elicit.Intent-:' + intent + '.IntentSlot-' + name,
                'variations': variations
            }
        };

    return slotInfo;
};

/**
 * A simple helper method available to the user to create an object containing the required intent information
 * n the correct order.
 *
 * @param {String} name The name of the intent
 * @param {Array} slots Samples of responses containing the slot
 * @param {Array} samples Samples of what the user will say to trigger the intent
 *
 * @return {Array} the required intent information
 */
Alexa.createIntent = function (name, slots, samples) {
    ensureLoggedIn(this.caller);
    return [name, slots, samples];
};

const createIntentsObject = function(name, slots, samples) {
    let slotsObjectsList = [];
    for (let i of slots) {
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

    return slotObjectsReturn;
};

/**
 * Allows the student to create and update the interaction model for a skill.
 *
 * @param {String} skillId The skillId of the skill to be updated
 * @param {String} stage The stage of the skill, for most users will be "development"
 * @param {Array} intents Samples of responses containing the slot
 * @param {String} invocationName The invocation name of the skill. This is what the user will say to Alexa to
 * trigger the skill. Must be at least 2 words long. More information provided in the tutorial
 *
 * @return {Array} API response
 */
Alexa.setInteractionModel = async function (skillId, stage, intents, invocationName) {
    let intentsList = [];
    let slotInfos = [];
    let promptInfos = [];

    for (let i of intents) {
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
            "name": "AMAZON.StartOverIntent",
            "samples": []
        },
        {
            "name": "AMAZON.FallbackIntent",
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

    let j = 6;

    for (let i of slotInfos) {
        intentsSlots.push(
            {
                'name': intentsArray[j].name,
                'confirmationRequired': false,
                'prompts': {},
                'slots': i
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
            'interactionModel': {
                'languageModel': {
                    'invocationName': invocationName,
                    'modelConfiguration': {
                        'fallbackIntentSensitivity': {
                            'level': 'LOW'
                        }
                    },
                    'intents': intentsArray,
                    'types': [],
                },
                'dialog': {
                    'intents': intentsSlots,
                    'delegationStrategy': 'ALWAYS'
                },
                'prompts': promptInfosFormatted
            }
        };

    const smapiClient = await getAPIClient(this.caller);

    const response = await smapiClient.setInteractionModelV1(skillId, stage, 'en-US', interactionModel);

    return response;
};

/**
 * @param{Object} configuration
 * @param{String} configuration.name
 * @param{String} configuration.invocation
 * @param{Array<Any>} configuration.intents FIXME: Add better type here
 */
Alexa.createSkillV2 = async function(configuration) {
    const smapiClient = getAPIClient(this.caller);
    const {vendors} = (await smapiClient.getVendorListV1());
    const vendorId = vendors[0].id;

    const manifest = createManifest(vendorId);
    const {skillId} = await smapiClient.createSkillForVendorV1(manifest);

    // TODO: save the skill in the database
    const interactionModel = {
        languageModel: {
            invocationName: configuration.invocation,
            modelConfiguration: {
                fallbackIntentSensitivity: {
                    level: 'LOW'
                }
            },
            intents: configuration.intents.map(intent => ({
                name: intent.name,
                samples: intent.utterances,  // TODO: Should this match more closely?
                slots: (intent.slots || []).map(slot => ({
                    name: slot.name,
                    type: slot.type,
                    samples: slot.samples,
                    multipleValues: {
                        enabled: slot.multipleValues || false,
                    }
                })),
            })),
            types: [],
        },
    };

    const stage = 'development';
    await smapiClient.setInteractionModelV1(skillId, stage, 'en-US', {interactionModel});

    const {skills} = GetStorage();
    await skills.updateOne({_id: skillId}, {
        $set: {
            config: configuration,
        }
    }, {upsert: true});
    return skillId;
};

const createManifest = (vendorId, name) => ({
    'vendorId': vendorId,
    'manifest': {
        'publishingInformation': {
            'locales': {
                'en-US': {
                    'summary': 'An under-development Alexa Skill created in NetsBlox!',
                    'examplePhrases': ['none yet!'],
                    'keywords': [],
                    'name': name,
                    'description': 'An under-development Alexa Skill created in NetsBlox!'
                }
            },
            'isAvailableWorldwide': true,
            'testingInstructions': 'CUSTOM',
            'category': '',
            'distributionCountries': [
                'US',
            ]
        },
        'apis': {
            'custom': {
                'endpoint' : {
                    'uri' : `${SERVER_URL}/services/routes/alexa`
                }
            }
        },
        'manifestVersion': '1.0',
        'privacyAndCompliance': {
            'allowsPurchases': false,
            'usesPersonalInfo': false,
            'isChildDirected': false,
            'isExportCompliant': true,
            'containsAds': false,
            'locales': {
                'en-US': {
                    'privacyPolicyUrl': `${SERVER_URL}/privacy.html`,
                    'termsOfUseUrl': `${SERVER_URL}/tos.html`
                }
            }
        },
    }
});

Alexa.isSupported = () => {
    const isSupported = !process.env.ALEXA_CLIENT_ID || !process.env.ALEXA_CLIENT_SECRET;
    if (isSupported) {
        console.log('ALEXA_CLIENT_ID and ALEXA_CLIENT_SECRET must be set for Alexa capabilities.');
    }
    return isSupported;
};

module.exports = Alexa;
