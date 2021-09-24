const utils = require('../../../../../assets/utils');

describe(utils.suiteName(__filename), function() {
    utils.verifyRPCInterfaces('Alexa', [
        ['listSkills'],
        ['invokeSkill', ['ID', 'utterance']],
        ['createSkill', ['configuration']],
        ['deleteSkill', ['ID']],
        ['getSkill', ['ID']],
        ['updateSkill', ['ID', 'configuration']],
        ['getSlotTypes'],
        ['getSkillCategories'],
    ]);
});
