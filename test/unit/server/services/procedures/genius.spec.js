const utils = require('../../../../assets/utils');

describe(utils.suiteName(__filename), function() {
    utils.verifyRPCInterfaces('Genius', [
        ['searchSongs', ['query']],
        ['getSong', ['ID']],
        ['getArtist', ['ID']],
        ['getSongsByArtist', ['ID']],
        ['getSongLyrics', ['ID']],
    ]);
});
