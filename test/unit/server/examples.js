const assert = require('assert');
// test if the services are being extracted/identified correctly.
describe('examples', function() {
    const ROOT_DIR = '../../../',
        EXAMPLES = require(ROOT_DIR + 'src/server/examples');

    describe('testing if services are being detected and populated correctly', function() {

        it('test Earthquakes examples', function() {
            assert(EXAMPLES.Earthquakes.services.includes('earthquakes'));
            assert(EXAMPLES.Earthquakes.services.includes('staticmap'));
        });

        it('test Story examples', function(){
            assert(EXAMPLES.Story.services.includes('NPlayer'));
        });

        it('test Weather examples', function(){
            assert(EXAMPLES.Weather.services.includes('weather'));
        });

        it('test Movies examples', function(){
            assert(EXAMPLES.Movies.services.includes('MovieDB'));
        });

        it('test AirQuality examples', function(){
            assert(EXAMPLES.AirQuality.services.includes('staticmap'));
            assert(EXAMPLES.AirQuality.services.includes('geolocation'));
        });

        it('test Quizzer examples', function(){
            assert(EXAMPLES.Quizzer.services.includes('kv-store'));
        });

    });

    describe('project source creation', () => {
        it('should get the source code for roles', () => {
            const src = EXAMPLES.Battleship.toString();
            assert(src.includes('</room>'));
            assert(src.includes('player 1'));
            assert(src.includes('player 2'));
            assert(src.includes('Battleship'));
        });
    });

    describe('xml format', () => {
        Object.keys(EXAMPLES).forEach(example => {
            it(`should contain single room for ${example}`, function() {
                const str = EXAMPLES[example].toString();
                const roomElementCount = str.split('</room>').length-1;
                assert.equal(roomElementCount, 1);
            });
        });
    });

});
