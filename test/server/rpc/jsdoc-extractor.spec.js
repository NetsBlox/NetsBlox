const assert = require('assert'),
    utils = require('../../assets/utils.js'),
    jp = utils.reqSrc('rpc/jsdoc-extractor.js');

describe('jsdoc-extractor', () => {

    let comment = `
    /**
     * this is the description
     * next line of description
     * @param {string} address target address
     * @param {number} limit the results limit
     * @param {Object} options
     * @returns {string}
     * @name associatedFnName
     */
    `;

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


    describe('parsing', () => {

        let metadata = jp._parseSource(comment)[0];

        it('should parse jsdoc comments', () => {
            assert.deepEqual(metadata.parsed.tags[1].name, 'limit');
        }); 

        it('should simplify the metadata', () => {
            let simpleMetadata = jp._simplify(metadata.parsed);
            assert.deepEqual(simpleMetadata, {
                description: metadata.parsed.description,
                args: [
                    {
                        name: 'address',
                        type: 'string',
                        description: 'target address'
                    },
                    {
                        name: 'limit',
                        type: 'number',
                        description: 'the results limit'
                    },
                    {
                        name: 'options',
                        type: 'Object',
                        description: null
                    }
                ],
                returns: {type: 'string', description: null}
            });
        });
    });

});
