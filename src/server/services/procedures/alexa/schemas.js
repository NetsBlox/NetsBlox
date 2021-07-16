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

schemas.interactionModel = config => ({
    languageModel: {
        invocationName: config.invocation,
        intents: config.intents.map(intent => ({
            name: intent.name,
            samples: (intent.utterances || []).map(utter => utter.replace(/[^a-zA-Z {}]/g, '')),
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
});

module.exports = schemas;
