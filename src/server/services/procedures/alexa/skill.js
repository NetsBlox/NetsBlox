const InputTypes = require('../../input-types');

class AlexaSkill {
    constructor(skillData) {
        this.skillData = skillData;
    }

    hasIntent(name) {
        const intentConfig = this.skillData.config.intents
            .find(intentConfig => intentConfig.name === name);

        return !!intentConfig;
    }

    async invokeIntent(name, slotDict, username=null) {
        const intentConfig = this.skillData.config.intents
            .find(intentConfig => intentConfig.name === name);

        const handlerXML = intentConfig.handler;
        const {context} = this.skillData;
        if (username) {
            context.username = username;
        }

        const handler = await InputTypes.parse.Function(handlerXML, null, {caller: context});

        const {slots=[]} = intentConfig;
        const slotNames = slots.map(slot => slot.name);
        const slotData = slotNames.map(name => slotDict[name]?.value);
        return await handler(...slotData);
    }
}

module.exports = AlexaSkill;
