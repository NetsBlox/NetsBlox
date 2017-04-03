const assert = require('assert');
// test if the services are being extracted/identified correctly. 
describe('testing if services are being detected and populated correctly', function() {
    let EXAMPLES = require('../../src/server/examples');

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

    it('test GoogleTrends examples', function(){
    	assert(EXAMPLES.GoogleTrends.services.includes('GoogleTrends'));
    	assert(EXAMPLES.GoogleTrends.services.includes('staticmap'));
    });

    it('test Quizzer examples', function(){
    	assert(EXAMPLES.Quizzer.services.includes('kv-store'));
    });

});