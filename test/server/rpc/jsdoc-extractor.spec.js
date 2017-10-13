const assert = require('assert'),
    utils = require('../../assets/utils.js'),
    jp = utils.reqSrc('rpc/jsdoc-extractor.js');

describe('jsdoc-extractor', () => {

    describe('fnFinder', () => {
        let testText = `let doStuff = a => a*2;
    function doStuff(){}
    GoogleMap.doStuff = function
    GoogleMap.doStuff = (asdf) =>`;

        let testLines = testText.split('\n');

        it('should support multiline', () => {
            assert.deepEqual(jp._findFn(testLines[2]), 'doStuff');
        });

        it('should find let fn = ()', () => {
            let line = 'let reverseGeocode = (lat, lon, response, query)=>{';
            assert.deepEqual(jp._findFn(line), 'reverseGeocode');
        });

        it('should find let fn = arg => ', () => {
            let line = 'let reverseGeocode = arg=>{';
            assert.deepEqual(jp._findFn(line), 'reverseGeocode');
        });

        it('should find obj.obj = function', () => {
            let line = '    GeoLocationRPC.geolocate = function (address) {';
            assert.deepEqual(jp._findFn(line), 'geolocate');
        });
    });

});
