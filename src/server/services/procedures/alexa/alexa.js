/**
 * The Alexa service provides capabilities for building your own Alexa skills!
 *
 * An Alexa skill consists of some general information (such as the name to use
 * for invocation) as well as a list of supported intents. An intent is a command
 * or question to which the skill can respond. Intents consist of a name, list of
 * utterances, and any required slots. Utterances are examples of how the user might
 * phrase questions or commands. Slots are used to define placeholders for concepts
 * like names, cities, etc.
 *
 * When Alexa determines that a request was made to a given intent, the slots are
 * resolved to their corresponding values and then passed to the "handler" for the
 * intent.
 *
 * @service
 * @alpha
 */
const Alexa = {};
const AlexaSkill = require('./skill');
const GetStorage = require('./storage');
const registerTypes = require('./types');
const h = require('./helpers');
const schemas = require('./schemas');
registerTypes();

Alexa.initialize = async function() {
    await h.registerOAuthClient();
};

/**
 * Create an Alexa Skill from a configuration.
 *
 * @param{Object} configuration
 * @param{String} configuration.name The name of the skill
 * @param{String} configuration.invocation The name to use to invoke the skill (eg, "tell <invocation> to <intent>")
 * @param{Array<Intent>} configuration.intents Intents (ie, commands) supported by the skill.
 * @param{String=} configuration.description
 * @param{SkillCategory=} configuration.category
 * @param{Array<String>=} configuration.keywords
 * @param{String=} configuration.summary
 * @param{Array<String>=} configuration.examples
 * @returns{String} ID
 */
Alexa.createSkill = async function(configuration) {
    const smapiClient = await h.getAPIClient(this.caller);
    configuration = h.getConfigWithDefaults(configuration);
    const stage = 'development';

    const {vendors} = (await smapiClient.getVendorListV1());
    const vendorId = vendors[0].id;

    const manifest = schemas.manifest(this.caller.username, configuration);
    const interactionModel = schemas.interactionModel(configuration);
    const accountLinkingRequest = schemas.accountLinking();

    let skillId;
    try {
        skillId = (await smapiClient.createSkillForVendorV1({vendorId, manifest}, vendorId)).skillId;
        await h.retryWhile(
            () => smapiClient.setInteractionModelV1(skillId, stage, 'en-US', {interactionModel}),
            err => err.statusCode === 404,
        );
        await smapiClient.updateAccountLinkingInfoV1(skillId, stage, {accountLinkingRequest});
    } catch (err) {
        throw h.clarifyError(err);
    }

    const {skills} = GetStorage();
    await skills.updateOne({_id: skillId}, {
        $set: {
            config: configuration,
            context: this.caller,
            author: this.caller.username,
            createdAt: new Date()
        }
    }, {upsert: true});

    return skillId;
};

/**
 * Invoke the skill with the given utterance using the closest intent.
 *
 * @param{String} ID Alexa Skill ID to send utterance to
 * @param{String} utterance Text to send to skill
 * @returns{String} ID
 */
Alexa.invokeSkill = async function(id, utterance) {
    const stage = 'development';
    const locale = 'en-US';
    const skillData = await h.getSkillData(id);
    const skill = new AlexaSkill(skillData);

    const smapiClient = await h.getAPIClient(this.caller);
    try {
        const {selectedIntent} = await smapiClient.profileNluV1({utterance}, id, stage, locale);
        const {name, slots} = selectedIntent;

        return await skill.invokeIntent(name, slots);
    } catch (err) {
        throw h.clarifyError(err);
    }
};

/**
 * Delete the given Alexa Skill (created within NetsBlox).
 *
 * @param{String} ID ID of the Alexa skill to delete
 */
Alexa.deleteSkill = async function(id) {
    const {skills} = GetStorage();
    const skillData = await h.getSkillData(id);
    if (skillData.author !== this.caller.username) {
        throw new Error('Unauthorized: Skills can only be deleted by the author.');
    }

    const smapiClient = await h.getAPIClient(this.caller);
    try {
        await smapiClient.deleteSkillV1(skillData._id);
        await skills.deleteOne({_id: skillData._id});
    } catch (err) {
        if (err.statusCode === 404) {
            await skills.deleteOne({_id: skillData._id});
        } else {
            throw err;
        }
    }
};

/**
 * List the IDs of all the Alexa Skills created in NetsBlox for the given user.
 *
 * @returns{Array<String>} IDs
 */
Alexa.listSkills = async function() {
    const {skills} = GetStorage();
    const skillConfigs = await skills.find({author: this.caller.username}).toArray();
    return skillConfigs.map(skill => skill._id);
};

/**
 * Get the configuration of the given Alexa Skill.
 *
 * @param{String} ID
 */
Alexa.getSkill = async function(id) {
    const {config} = await h.getSkillData(id);
    return config;
};

/**
 * Update skill configuration with the given ID.
 *
 * @param{String} ID ID of the skill to update
 * @param{Object} configuration
 * @param{String} configuration.name The name of the skill
 * @param{String} configuration.invocation The name to use to invoke the skill (eg, "tell <invocation> to <intent>")
 * @param{Array<Intent>} configuration.intents Intents (ie, commands) supported by the skill.
 * @param{String=} configuration.description
 * @param{SkillCategory=} configuration.category
 * @param{Array<String>=} configuration.keywords
 * @param{String=} configuration.summary
 * @param{Array<String>=} configuration.examples
 */
Alexa.updateSkill = async function(id, configuration) {
    const smapiClient = await h.getAPIClient(this.caller);
    configuration = h.getConfigWithDefaults(configuration);

    const {vendors} = (await smapiClient.getVendorListV1());
    const vendorId = vendors[0].id;

    const manifest = schemas.manifest(vendorId, configuration);
    const interactionModel = schemas.interactionModel(configuration);
    try {
        const stage = 'development';
        await smapiClient.updateSkillManifestV1(id, stage, {manifest});
        await smapiClient.setInteractionModelV1(id, stage, 'en-US', {interactionModel});
    } catch (err) {
        throw h.clarifyError(err);
    }

    const {skills} = GetStorage();
    await skills.updateOne({_id: id}, {
        $set: {
            config: configuration,
            context: this.caller,
            author: this.caller.username,
            updatedAt: new Date()
        }
    }, {upsert: true});
};

Alexa.isSupported = () => {
    const envVars = ['ALEXA_CLIENT_ID', 'ALEXA_CLIENT_SECRET', 'SERVER_URL'];
    const missingVars = envVars.filter(varName => !process.env[varName]);
    const isSupported = missingVars.length === 0;
    if (!isSupported) {
        console.log(`Alexa service is disabled because the following environment variables are not set: ${missingVars.join(', ')}`);
    }
    return isSupported;
};

module.exports = Alexa;
