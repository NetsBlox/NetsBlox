// test if the services are being extracted/identified correctly.
describe('examples', function() {
    const assert = require('assert');
    const ROOT_DIR = '../../../';
    const EXAMPLES = require(ROOT_DIR + 'src/server/examples');

    describe('testing if services are being detected and populated correctly', function() {

        it('test Earthquakes examples', function() {
            assert(EXAMPLES.Earthquakes.services.includes('Earthquakes'));
            assert(EXAMPLES.Earthquakes.services.includes('GoogleMaps'));
        });

        it('test Story examples', function(){
            assert(EXAMPLES.Story.services.includes('NPlayer'));
        });

        it('test Weather examples', function(){
            assert(EXAMPLES.Weather.services.includes('Weather'));
        });

        it('test Movies examples', function(){
            assert(EXAMPLES.Movies.services.includes('MovieDB'));
        });

        it('test AirQuality examples', function(){
            assert(EXAMPLES.AirQuality.services.includes('GoogleMaps'));
            assert(EXAMPLES.AirQuality.services.includes('Geolocation'));
        });

        it('test Quizzer examples', function(){
            assert(EXAMPLES.Quizzer.services.includes('KeyValueStore'));
        });

    });

    describe('Service usage', () => {
        function isLowerCase(letter) {
            return letter === letter.toLowerCase();
        }

        Object.entries(EXAMPLES).forEach(entry => {
            const [name, content] = entry;
            it(`should not use old service names in ${name}`, function() {
                const names = content.services.filter(name => isLowerCase(name));
                assert(
                    names.length === 0,
                    `Found old service names: ${names.join(', ')}`
                );
            });
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
