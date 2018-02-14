describe('jsdoc-extractor', () => {

    const assert = require('assert'),
        utils = require('../../../assets/utils.js'),
        jp = utils.reqSrc('rpc/jsdoc-extractor.js');


    let comment = `
    /**
     * this is the description
     * next line of description
     * @param {String} address target address
     * @param {Number} limit the results limit
     * @param {Object} options
     * @name doStuff
     * @returns {String}
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

        it('should know prototype is not the fn name', () => {
            let line = 'Googlemap.prototype.doStuff = function';
            assert.deepEqual(jp._findFn(line), 'doStuff');
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
                name: 'doStuff',
                description: metadata.parsed.description,
                args: [
                    {
                        name: 'address',
                        optional: false,
                        type: 'String',
                        description: 'target address'
                    },
                    {
                        name: 'limit',
                        optional: false,
                        type: 'Number',
                        description: 'the results limit'
                    },
                    {
                        name: 'options',
                        optional: false,
                        type: 'Object',
                        description: null
                    }
                ],
                returns: {type: 'String', description: null}
            });
        });
    });

    describe('Docs', () => {

        describe('getDocFor', () => {
            it('should return a copy', () => {
                let Docs = jp.Docs;
                let sampleDocs = {_docs: [{name: 'rpcName', description: 'original description'}]};
                let targetDoc = Docs.prototype.getDocFor.call(sampleDocs, 'rpcName');
                targetDoc.description = 'mutated description';
                let secondGet = Docs.prototype.getDocFor.call(sampleDocs, 'rpcName');
                assert.deepEqual(secondGet.description, 'original description');
            });
        });
    });

});
