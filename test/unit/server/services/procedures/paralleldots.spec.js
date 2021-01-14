const utils = require('../../../../assets/utils');

describe(utils.suiteName(__filename), function() {
    utils.verifyRPCInterfaces('ParallelDots', [
        ['getSentiment', ['text']],
        ['getSimilarity', ['text1', 'text2']],
        ['getNamedEntities', ['text']],
        ['getKeywords',  ['text'] ],
        ['getTaxonomy', ['text']],
        ['getEmotion', ['text']],
        ['getSarcasmProbability', ['text']],
        ['getIntent', ['text']],
        ['getAbuse', ['text']],
    ]);

});
