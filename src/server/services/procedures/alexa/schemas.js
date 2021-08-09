/*
 * This file contains logic for generating various schemas required for defining Alexa
 * skills.
 *
 * More information can be found at https://developer.amazon.com/en-US/docs/alexa/smapi/object-schemas.html
 */
const schemas = {};
const h = require('./helpers');
const iconsEnabled = false;

schemas.manifest = (author, config) => {
    const manifest = {
        publishingInformation: {
            locales: {
                'en-US': {
                    summary: config.summary,
                    examplePhrases: config.examples,
                    keywords: config.keywords,
                    name: config.name,
                    description: config.description,
                }
            },
            isAvailableWorldwide: true,
            testingInstructions: 'CUSTOM',
            category: config.category,
            distributionCountries: [
                'US',
            ]
        },
        apis: {
            custom: {
                endpoint : {
                    uri : `${h.getServerURL()}/services/routes/alexa`,
                    sslCertificateType: 'Trusted',
                }
            }
        },
        manifestVersion: '1.0',
        privacyAndCompliance: {
            allowsPurchases: false,
            usesPersonalInfo: false,
            isChildDirected: false,
            isExportCompliant: true,
            containsAds: false,
            locales: {
                'en-US': {
                    privacyPolicyUrl: `${h.getServerURL()}/privacy.html`,
                    termsOfUseUrl: `${h.getServerURL()}/tos.html`
                }
            }
        },
    };

    if (iconsEnabled) {
        const baseURL = h.getServerURL() + `/services/routes/alexa/icon/${encodeURIComponent(author)}/${encodeURIComponent(config.name)}`;
        if (config.smallIcon) {
            manifest.publishingInformation.locales['en-US'].smallIconUri = `${baseURL}/small`;
        }
        if (config.largeIcon) {
            manifest.publishingInformation.locales['en-US'].largeIconUri = `${baseURL}/large`;
        }
    }
    return manifest;
};

schemas.accountLinking = () => ({
    type: 'AUTH_CODE',
    skipOnEnablement: false,
    authorizationUrl: `${h.getServerURL()}/api/v2/oauth/`,
    accessTokenUrl: `${h.getServerURL()}/api/v2/oauth/token`,
    clientId: h.getOAuthClientID(),
    clientSecret: 'unused',
    accessTokenScheme: 'HTTP_BASIC',
});

schemas.interactionModel = config => {
    ensureHasStopIntent(config);
    return {
        languageModel: {
            invocationName: config.invocation,
            intents: config.intents.map(intent => ({
                name: intent.name,
                samples: intent.utterances || [],
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
            // TODO: The following option is only available if fallback intent is defined
            //modelConfiguration: {
                //fallbackIntentSensitivity: {
                    //level: 'LOW'
                //}
            //},
        },
    };
};

const DEFAULT_STOP_INTENT = {
    name: 'AMAZON.StopIntent',
    handler: '<context id="1"><inputs></inputs><variables></variables><script><block s="doReport"><l>OK</l></block></script><receiver><sprite name="Sprite" idx="1" x="-450.67597895992844" y="-174.01013542306316" heading="90" scale="1" rotation="1" draggable="true" costume="1" color="80,80,80" pen="tip" id="6"><costumes><list struct="atomic" id="7"></list></costumes><sounds><list struct="atomic" id="8"></list></sounds><variables></variables><blocks></blocks><scripts></scripts></sprite></receiver><origin><ref id="6"></ref></origin><context id="11"><inputs></inputs><variables></variables><receiver><ref id="6"></ref></receiver><origin><ref id="6"></ref></origin></context></context>',
};

function ensureHasStopIntent(config) {
    const stopIntent = config.intents.find(intent => intent.name === DEFAULT_STOP_INTENT.name);
    if (!stopIntent) {
        config.intents.push(DEFAULT_STOP_INTENT);
    }
}

module.exports = schemas;
