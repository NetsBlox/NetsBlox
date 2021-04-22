const utils = require('../../../assets/utils.js');

describe(utils.suiteName(__filename), function() {
    const assert = require('assert'),
        jp = utils.reqSrc('services/jsdoc-extractor.js');


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
    let doStuff = (lat, lon, response, query)=>{
    let doStuff = (lat, lon, response, query)=>
    let doStuff = arg=>{
        GeoLocationRPC.doStuff = async function (address) {
        GeoLocationRPC.doStuff = async function (address)
      doStuff: function (address) {
      doStuff: async function (address) {
      doStuff: async function(address) {
      doStuff : async function(address) {
      doStuff : async function(address)
    Googlemap.prototype.doStuff = function
    GeoLocationRPC.doStuff = function (address) {
    GeoLocationRPC.doStuff = function (address)
    GoogleMap.doStuff = function
    GoogleMap.doStuff = (asdf) =>`;
        let testLines = testText.split('\n');

        it('should support multiline', () => {
            assert.deepEqual(jp._findFn(testLines), 'doStuff');
        });

        testLines.forEach(line => {
            it(`should find fn in "${line}"`, () => {
                assert.deepEqual(jp._findFn(line), 'doStuff');
            });
        });

    });


    describe('parsing', () => {

        let metadata = jp._parseSource(comment).rpcs[0];

        it('should parse jsdoc comments', () => {
            assert.deepEqual(metadata.parsed.tags[1].name, 'limit');
        });

        it('should simplify the metadata', () => {
            const arg = (name, type, description) => ({
                name,
                optional: false,
                type: {
                    name: type,
                    params: []
                },
                description,
            });
            let simpleMetadata = jp._simplify(metadata.parsed);

            assert.deepEqual(simpleMetadata, {
                name: 'doStuff',
                description: metadata.parsed.description,
                deprecated: false,
                args: [
                    arg('address', 'String', 'target address'),
                    arg('limit', 'Number', 'the results limit'),
                    arg('options', 'Object', null),
                ],
                categories: [],
                returns: {type: {name: 'String', params: []}, description: null}
            });
        });

        it('should detect deprecated methods', () => {
            const oldComment = `
            /**
             * this is the description
             * next line of description
             * @deprecated
             * @param {Number} limit the results limit
             * @name doStuff
             */
            `;
            let metadata = jp._parseSource(oldComment).rpcs[0];
            let simpleMetadata = jp._simplify(metadata.parsed);
            assert(simpleMetadata.deprecated);
        });

        describe('parameterized types', function() {
            let parsed = null;
            before(function() {
                const parameterized = `
                /**
                 * this is the description
                 * @param {BoundedNumber<10, 20>} number number (between 10-20)
                 * @param {BoundedNumber<-10, 20>} negnumber number (between -10,20)
                 * @param {BoundedNumber<10.334, 20>} decnumber number (between 10.334,20)
                 * @param {BoundedNumber<String, 20>} mixed
                 * @param {BoundedNumber<10, 20>=} IAmOptional
                 * @name doSomething
                 */
                `;
                const metadata = jp._parseSource(parameterized).rpcs[0];
                parsed = jp._simplify(metadata.parsed);
            });

            it('should parse name', () => {
                const argType = parsed.args[0].type;
                assert.equal(argType.name, 'BoundedNumber');
            });

            it('should parse parameters', () => {
                const argType = parsed.args[0].type;
                assert.deepEqual(argType.params, [10, 20]);
            });

            it('should parse negative numbers for params', () => {
                const argType = parsed.args[1].type;
                assert.deepEqual(argType.params, [-10, 20]);
            });

            it('should parse decimal params', () => {
                const argType = parsed.args[2].type;
                assert.deepEqual(argType.params, [10.334, 20]);
            });

            it('should support optional param types', () => {
                const arg = parsed.args[4];
                assert(arg.optional);
                assert.deepEqual(arg.type.params, [10, 20]);
            });

            it('should support nested param types', () => {
                const comment = `
                /**
                 * this is the description
                 * @param {Array<Array<BoundedNumber<1, 5>>>} numberLists
                 * @name testNestedParams
                 */
                `;
                const metadata = jp._parseSource(comment).rpcs[0];
                const argMetadata = jp._simplify(metadata.parsed).args[0];
                const nestedType = argMetadata.type.params[0];
                assert.equal(
                    nestedType && nestedType.name,
                    'Array',
                    `Expected to find nested Array type but found: ${nestedType}`
                );
            });
        });

        describe('duck typing', function() {
            let parsed;
            before(() => {
                const duckTypes = `
                /**
                 * this is the description
                 * @param {Object} duck some duck-typed object (aka anonymous struct)
                 * @param {String} duck.name name of the given duck
                 * @param {Number} duck.age age of the given duck
                 * @name doSomething
                 */
                `;
                const metadata = jp._parseSource(duckTypes).rpcs[0];
                parsed = jp._simplify(metadata.parsed);
                console.log(parsed.args);
            });

            it('should parse field names', () => {
                const [duckArg] = parsed.args;
                const fieldNames = duckArg.type.params.map(field => field.name);
                assert.deepEqual(fieldNames, ['name', 'age']);
            });

            it('should parse field types', () => {
                const [duckArg] = parsed.args;
                const fieldTypes = duckArg.type.params.map(field => field.type.name);
                assert.deepEqual(fieldTypes, ['String', 'Number']);
            });
        });

        describe('categories', function() {
            it('should parse category', () => {
                const comment = `
                /**
                 * this is the description
                 * @category TestCategory
                 * @param {Array<Array<BoundedNumber<1, 5>>>} numberLists
                 * @name testNestedParams
                 */
                `;
                const metadata = jp._simplify(jp._parseSource(comment).rpcs[0].parsed);
                const [category] = metadata.categories;
                assert.equal(
                    category,
                    'TestCategory',
                );
            });

            it('should parse multiple categories', () => {
                const comment = `
                /**
                 * this is the description
                 * @category Category0
                 * @category Category1;Category2;Category3
                 * @param {Array<Array<BoundedNumber<1, 5>>>} numberLists
                 * @name testNestedParams
                 */
                `;
                const metadata = jp._simplify(jp._parseSource(comment).rpcs[0].parsed);
                const categories = metadata.categories;
                assert.equal(categories.length, 2);
                assert.equal(categories[0].length, 1);
                assert.equal(categories[1].length, 3);

                categories.flat().forEach((name, i) => assert.equal(name, `Category${i}`));
            });
        });
    });

    describe('Docs', () => {

        describe('getDocFor', () => {
            it('should return a copy', () => {
                let Docs = jp.Docs;
                let sampleDocs = {rpcs: [{name: 'serviceName', description: 'original description'}]};
                let targetDoc = Docs.prototype.getDocFor.call(sampleDocs, 'serviceName');
                targetDoc.description = 'mutated description';
                let secondGet = Docs.prototype.getDocFor.call(sampleDocs, 'serviceName');
                assert.deepEqual(secondGet.description, 'original description');
            });
        });
    });

});
