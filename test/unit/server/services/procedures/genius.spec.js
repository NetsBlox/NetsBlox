const utils = require('../../../../assets/utils');

describe(utils.suiteName(__filename), function() {
    const Genius = utils.reqSrc('services/procedures/genius/genius');
    const assert = require('assert');

    utils.verifyRPCInterfaces('Genius', [
        ['searchSongs', ['query']],
        ['getSong', ['ID']],
        ['getArtist', ['ID']],
        ['getSongsByArtist', ['ID']],
        ['getSongLyrics', ['ID']],
    ]);

    describe('Genius._parseLyrics', function() {
        it('should preserve line breaks', function() {
            const lyrics = Genius._parseLyrics('<div class="lyrics"><span>hello</span><br/><span>world</span></div>');
            assert.equal(lyrics.split('\n').length, 2);
        });
    });
});
