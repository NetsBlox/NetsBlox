const utils = require('../../../../assets/utils');

describe(utils.suiteName(__filename), function() {
    utils.verifyRPCInterfaces('ThisXDoesNotExist', [
        ['getPerson', []],
        ['getCat', []],
        ['getHorse', []],
        ['getArtwork', []],
        ['getWaifu', []],
        ['getFursona', []],
        ['getPony', []],
        ['getHomeInterior', []],
        ['getCongressPerson', []],
    ]);
});
