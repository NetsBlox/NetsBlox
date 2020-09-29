describe('this-x-does-not-exist', function() {
    const utils = require('../../../../assets/utils');

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
