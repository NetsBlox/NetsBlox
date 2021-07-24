const utils = require('../../../assets/utils');

describe(utils.suiteName(__filename), function() {
    const InputTypes = require('../../../../src/server/services/input-types');
    const typesParser = InputTypes.parse;
    const assert = require('assert');

    describe('String', function() {
        it('should convert to a string', () => {
            let rawInput = 0;
            let parsedInput = typesParser.String(rawInput);
            assert.strictEqual(typeof parsedInput, 'string');
        });
    });

    describe('Any', function() {
        it('should leave as a string', () => {
            let rawInput = '4.253';
            let parsedInput = typesParser.Any(rawInput);
            assert.strictEqual(parsedInput, rawInput);
        });
    });

    describe('Number', function() {
        it('should parse into JS numbers', () => {
            let rawInput = '4.253';
            let parsedInput = typesParser.Number(rawInput);
            assert.deepStrictEqual(parsedInput, 4.253);
        });
    });

    describe('Integer', function() {
        it('should parse into JS numbers', () => {
            let rawInput = '54';
            let parsedInput = typesParser.Integer(rawInput);
            assert.deepStrictEqual(parsedInput, 54);

            rawInput = '-4';
            parsedInput = typesParser.Integer(rawInput);
            assert.deepStrictEqual(parsedInput, -4);
        });
        it('should not allow fractional values', async () => {
            await utils.shouldThrow(() => typesParser.Integer('7.5'));
        });
        it('should not allow non-numbers', async () => {
            await utils.shouldThrow(() => typesParser.Integer('hello'));
        });
    });
    describe('BoundedInteger', function() {
        const params = [7, 21]; // min, max
        it('should not allow fractional values', async () => {
            await utils.shouldThrow(() => typesParser.BoundedInteger('7.5', params));
        });
        it('should not allow non-numbers', async () => {
            await utils.shouldThrow(() => typesParser.BoundedInteger('hello', params));
        });
        it('should allow numbers equal to min and max', () => {
            let rawInput = '7';
            let parsedInput = typesParser.BoundedInteger(rawInput, params);
            assert.deepStrictEqual(parsedInput, 7);

            rawInput = '21';
            parsedInput = typesParser.BoundedInteger(rawInput, params);
            assert.deepStrictEqual(parsedInput, 21);
        });
        it('should not allow numbers below min', async () => {
            await utils.shouldThrow(() => typesParser.BoundedInteger('6', params));
            await utils.shouldThrow(() => typesParser.BoundedInteger('-3', params));
        });
        it('should not allow numbers above max', async () => {
            await utils.shouldThrow(() => typesParser.BoundedInteger('22', params));
            await utils.shouldThrow(() => typesParser.BoundedInteger('87', params));
        });
    });

    describe('Array', function() {
        it('should throw error w/ numeric input', async () => {
            let rawInput = '181',
                type = 'Array';

            await utils.shouldThrow(
                () => typesParser[type](rawInput),
            );
        });

        it('should throw error w/ string input', async () => {
            let rawInput = 'cat',
                type = 'Array';

            await utils.shouldThrow(() => typesParser[type](rawInput));
        });

        it('should throw invalid nested types', async () => {
            await utils.shouldThrow(() => typesParser.Array(['text'], ['Number']));
        });

        it('should support nested types', () => {
            typesParser.Array([1, 2], ['Number']);
        });
        it('should support complex nested types', () => {
            typesParser.Array([1, 2], [{ name: 'BoundedNumber', params: [1, 2] }]);
        });

        it('should enforce bounded lengths', async () => {
            await utils.shouldThrow(() => typesParser.Array([], [undefined, 2]));
            await utils.shouldThrow(() => typesParser.Array([1], [undefined, 2]));
            typesParser.Array([1, 2], [undefined, 2]);
            typesParser.Array([1, 2, 3], [undefined, 2]);

            await utils.shouldThrow(() => typesParser.Array([1, 2, 3, 4, 5, 6], [undefined, undefined, 4]));
            await utils.shouldThrow(() => typesParser.Array([1, 2, 3, 4, 5], [undefined, undefined, 4]));
            typesParser.Array([1, 2, 3, 4], [undefined, undefined, 4]);
            typesParser.Array([1, 2, 3], [undefined, undefined, 4]);

            await utils.shouldThrow(() => typesParser.Array([], [undefined, 3, 4]));
            await utils.shouldThrow(() => typesParser.Array([1], [undefined, 3, 4]));
            await utils.shouldThrow(() => typesParser.Array([1, 2], [undefined, 3, 4]));
            await utils.shouldThrow(() => typesParser.Array([1, 2, 3, 4, 5], [undefined, 3, 4]));
            typesParser.Array([1, 2, 3, 4], [undefined, 3, 4]);
            typesParser.Array([1, 2, 3], [undefined, 3, 4]);
        });
    });

    describe('Object', function() {
        it('should throw error if input has a pair of size 0', async () => {
            let rawInput = [[], ['a', 234],['name', 'Hamid'], ['connections', ['b','c','d']]];
            let type = 'Object';
            const err = await utils.shouldThrow(() => typesParser[type](rawInput));
            assert(/It should be a list of/.test(err.message));
        });

        it('should throw error if input has a pair of length more than 2', async () => {
            let rawInput = [['a', 234],['name', 'Hamid', 'Z'], ['connections', ['b','c','d']]];
            let type = 'Object';
            const err = await utils.shouldThrow(() => typesParser[type](rawInput));
            assert(/It should be a list of/.test(err.message));
        });

        it('should not throw if input has a pair of length 1', () => {
            let rawInput = [['a', 234],['name', 'Hamid'], ['connections', ['b','c','d']], ['children']];
            let type = 'Object';
            assert(typesParser[type](rawInput));
        });

        it('should parse structured data to json', async () => {
            let rawInput = [['a', 234],['name', 'Hamid'], ['connections', ['b','c','d']], ['children']];
            let parsedInput = await typesParser.Object(rawInput);
            assert.deepStrictEqual(parsedInput.name, 'Hamid');
        });

        describe('duck typing', function() {
            function param(name, type, optional=false) {
                return {
                    name,
                    optional,
                    type: {
                        name: type
                    }
                };
            }

            it('should not support additional fields', async function() {
                const input = [['name', 'Donald Duck'], ['age', 50]];
                const err = await utils.shouldThrow(
                    () => typesParser.Object(input, [param('name', 'String')]),
                );
                assert(/extra fields/.test(err.message));
            });

            it('should support optional fields', async function() {
                const input = [];
                const parsedInput = await typesParser.Object(input, [param('name', 'String', true)]);
                assert.deepEqual(parsedInput, {});
            });

            it('should treat null values as unset', async function() {
                const input = [['name', null]];
                const parsedInput = await typesParser.Object(input, [param('name', 'String', true)]);
                assert.deepEqual(parsedInput, {});
            });

            it('should treat undefined values as unset', async function() {
                const input = [['name', undefined]];
                const parsedInput = await typesParser.Object(input, [param('name', 'String', true)]);
                assert.deepEqual(parsedInput, {});
            });

            it('should parse fields', async function() {
                const input = [['age', '50']];
                const parsedInput = await typesParser.Object(input, [param('age', 'Number')]);
                assert.deepEqual(parsedInput.age, 50);
            });

            it('should support required fields', async function() {
                const input = [['name', 'Donald Duck']];
                const err = await utils.shouldThrow(
                    () => typesParser.Object(input, [param('name', 'String'), param('age', 'Number')]),
                );
                assert(/must contain/.test(err.message));
            });

            it('should be optional if no params', function() {
                const input = [['name', 'Donald Duck']];
                typesParser.Object(input, []);
            });
        });
    });

    describe('Latitude', function() {
        const type = 'Latitude';

        it('should throw on latitudes less than -90', async () => {
            let rawInput = '-91';
            const err = await utils.shouldThrow(() => typesParser[type](rawInput));
            assert(/Latitude/.test(err.message));
        });

        it('should throw on latitudes more than 90', async () => {
            let rawInput = '91';
            const err = await utils.shouldThrow(() => typesParser[type](rawInput));
            assert(/Latitude/.test(err.message));
        });

    });

    describe('Longitude', function() {
        const type = 'Longitude';

        it('should throw on longitude less than -180', async () => {
            let rawInput = '-181';
            const err = await utils.shouldThrow(() => typesParser[type](rawInput));
            assert(/Longitude/.test(err.message));
        });

        it('should throw on longitude more than 180', async () => {
            let rawInput = '181';
            const err = await utils.shouldThrow(() => typesParser[type](rawInput));
            assert(/Longitude/.test(err.message));
        });

    });

    describe('BoundedNumber', function() {
        const type = 'BoundedNumber';

        it('should include minimum value', async () => {
            let rawInput = '10';
            await typesParser[type](rawInput, [10, 180]);
        });

        it('should not throw if within range', async () => {
            let rawInput = '-151';
            await typesParser[type](rawInput, [-180, 180]);
        });

        it('should return Number (not string)', async () => {
            const input = '10';
            const value = await typesParser[type](input, [0, 21]);
            assert.strictEqual(typeof value, 'number');
        });

        it('should throw if less than min', async () => {
            let rawInput = '-181';
            const err = await utils.shouldThrow(() => typesParser[type](rawInput, [-180, 180]));
            assert(/-180/.test(err.message));
        });

        it('should throw if more than max', async () => {
            let rawInput = '181';
            const err = await utils.shouldThrow(() => typesParser[type](rawInput, ['-180', '180']));
            assert(/180/.test(err.message));
        });

        it('should throw if below minimum (w/o max)', async () => {
            let rawInput = '-181';
            const err = await utils.shouldThrow(() => typesParser[type](rawInput, ['-180']));
            assert(/180/.test(err.message));
        });

        it('should not print NaN in error if below minimum (w/o max)', () => {
            let rawInput = '-181';
            try {
                typesParser[type](rawInput, ['-180']);
            } catch (err) {
                assert(!err.message.includes('NaN'));
            }
        });

        it('should accept if above minimum (w/o max)', () => {
            const rawInput = '10';
            typesParser[type](rawInput, ['9']);
        });
    });

    describe('BoundedString', function() {
        const type = 'BoundedString';

        it('should include minimum length', async () => {
            let rawInput = 'a';
            await typesParser[type](rawInput, [1, 180]);
        });

        it('should not throw if within range', async () => {
            let rawInput = 'abc';
            await typesParser[type](rawInput, [2, 180]);
        });

        it('should throw if less than min', async () => {
            let rawInput = 'a';
            const err = await utils.shouldThrow(() => typesParser[type](rawInput, [4, 180]));
            assert(/4/.test(err.message));
        });

        it('should throw if more than max', async () => {
            let rawInput = 'abcdefg';
            const err = await utils.shouldThrow(() => typesParser[type](rawInput, [2, 4]));
            assert(/4/.test(err.message));
        });

        it('should throw if below minimum (w/o max)', async () => {
            let rawInput = 'abc';
            const err = await utils.shouldThrow(() => typesParser[type](rawInput, [5]));
            assert(/5/.test(err.message));
        });

        it('should accept if above minimum (w/o max)', () => {
            const rawInput = 'abcdefg';
            typesParser[type](rawInput, [5]);
        });
    });

    describe('Enum', function() {
        const type = 'Enum';

        it('should take an array of variants and return variant', () => {
            const vars = ['dog', 'Cat', 'puPPy', 'KITTEN'];
            assert.deepEqual(typesParser[type]('dog', vars), 'dog');
            assert.deepEqual(typesParser[type]('dOg', vars), 'dog');
            assert.deepEqual(typesParser[type]('Cat', vars), 'Cat');
            assert.deepEqual(typesParser[type]('cat', vars), 'Cat');
            assert.deepEqual(typesParser[type]('puPPy', vars), 'puPPy');
            assert.deepEqual(typesParser[type]('pupPY', vars), 'puPPy');
            assert.deepEqual(typesParser[type]('KITTEN', vars), 'KITTEN');
            assert.deepEqual(typesParser[type]('kitten', vars), 'KITTEN');
        });
        it('should take an object of variant key value pairs and return mapped value', () => {
            const vars = { dog: 5, Cat: -6, puPPy: 3, KITTEN: ['hello', 'world'] };
            assert.deepEqual(typesParser[type]('dog', vars), 5);
            assert.deepEqual(typesParser[type]('dOG', vars), 5);
            assert.deepEqual(typesParser[type]('Cat', vars), -6);
            assert.deepEqual(typesParser[type]('CAT', vars), -6);
            assert.deepEqual(typesParser[type]('puPPy', vars), 3);
            assert.deepEqual(typesParser[type]('puppy', vars), 3);
            assert.deepEqual(typesParser[type]('KITTEN', vars), ['hello', 'world']);
            assert.deepEqual(typesParser[type]('kitteN', vars), ['hello', 'world']);
        });
    });

    describe('Boolean', function() {
        const type = 'Boolean';

        it('should accept true and false (actual bool values)', () => {
            assert.strictEqual(typesParser[type](true), true);
            assert.strictEqual(typesParser[type](false), false);
        });
        it('should accept true and false (case insensitive)', () => {
            assert.strictEqual(typesParser[type]('true'), true);
            assert.strictEqual(typesParser[type]('TrUe'), true);
            assert.strictEqual(typesParser[type]('false'), false);
            assert.strictEqual(typesParser[type]('faLSe'), false);
        });
    });

    describe('SerializedFunction', function() {
        it('should throw an error if doesnt compile', async function() {
            await utils.shouldThrow(() => typesParser.SerializedFunction('thisIsNotXml'));
        });

        it('should return an xml string', async function() {
            const reportStopping = '<context id="1"><inputs></inputs><variables></variables><script><block collabId="item_204" s="doReport"><l>Stopping!</l></block></script><receiver><sprite name="Sprite" collabId="item_-1" idx="1" x="-450.67597895992844" y="-174.19822319735795" heading="90" scale="1" rotation="1" draggable="true" costume="1" color="80,80,80" pen="tip" id="6"><costumes><list struct="atomic" id="7"></list></costumes><sounds><list struct="atomic" id="8"></list></sounds><variables></variables><blocks></blocks><scripts></scripts></sprite></receiver><origin><ref id="6"></ref></origin><context id="11"><inputs></inputs><variables></variables><receiver><ref id="6"></ref></receiver><origin><ref id="6"></ref></origin></context></context>';
            const xml = await typesParser.SerializedFunction(reportStopping);
            assert.equal(typeof xml, 'string');
        });
    });

    describe('defineType', function() {
        before(() => InputTypes.defineType('NewType', input => Math.pow(+input, 2)));

        it('should not be able to define the same type twice', async function() {
            await utils.shouldThrow(() => InputTypes.defineType('NewType', input => input));
        });
    });
});
