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

    describe('Array', function() {
        it('should throw error w/ numeric input', () => {
            let rawInput = '181',
                type = 'Array';

            assert.throws(() => typesParser[type](rawInput));
        });

        it('should throw error w/ string input', () => {
            let rawInput = 'cat',
                type = 'Array';

            assert.throws(() => typesParser[type](rawInput));
        });

        it('should throw invalid nested types', () => {
            assert.throws(() => typesParser.Array(['text'], ['Number']));
        });

        it('should support nested types', () => {
            typesParser.Array([1, 2], ['Number']);
        });
    });

    describe('Object', function() {
        it('should throw error if input has a pair of size 0', () => {
            let rawInput = [[], ['a', 234],['name', 'Hamid'], ['connections', ['b','c','d']]];
            let type = 'Object';
            assert.throws(() => typesParser[type](rawInput), /It should be a list of/);
        });

        it('should throw error if input has a pair of length more than 2', () => {
            let rawInput = [['a', 234],['name', 'Hamid', 'Z'], ['connections', ['b','c','d']]];
            let type = 'Object';
            assert.throws(() => typesParser[type](rawInput), /It should be a list of/);
        });

        it('should not throw if input has a pair of length 1', () => {
            let rawInput = [['a', 234],['name', 'Hamid'], ['connections', ['b','c','d']], ['children']];
            let type = 'Object';
            assert(typesParser[type](rawInput));
        });

        it('should parse structured data to json', () => {
            let rawInput = [['a', 234],['name', 'Hamid'], ['connections', ['b','c','d']], ['children']];
            let parsedInput = typesParser['Object'](rawInput);
            assert.deepStrictEqual(parsedInput.name, 'Hamid');
        });

    });

    describe('Latitude', function() {
        const type = 'Latitude';

        it('should throw on latitudes less than -90', () => {
            let rawInput = '-91';
            assert.throws(() => typesParser[type](rawInput), /Latitude/);
        });

        it('should throw on latitudes more than 90', () => {
            let rawInput = '91';
            assert.throws(() => typesParser[type](rawInput), /Latitude/);
        });

    });

    describe('Longitude', function() {
        const type = 'Longitude';

        it('should throw on longitude less than -180', () => {
            let rawInput = '-181';
            assert.throws(() => typesParser[type](rawInput), /Longitude/);
        });

        it('should throw on longitude more than 180', () => {
            let rawInput = '181';
            assert.throws(() => typesParser[type](rawInput), /Longitude/);
        });

    });

    describe('BoundedNumber', function() {
        const type = 'BoundedNumber';

        it('should include minimum value', () => {
            let rawInput = '10';
            typesParser[type](rawInput, [10, 180]);
        });

        it('should not throw if within range', () => {
            let rawInput = '-151';
            typesParser[type](rawInput, [-180, 180]);
        });

        it('should return Number (not string)', () => {
            const input = '10';
            const value = typesParser[type](input, [0, 21]);
            assert.strictEqual(typeof value, 'number');
        });

        it('should throw if less than min', () => {
            let rawInput = '-181';
            assert.throws(() => typesParser[type](rawInput, [-180, 180]), /-180/);
        });

        it('should throw if more than max', () => {
            let rawInput = '181';
            assert.throws(() => typesParser[type](rawInput, ['-180', '180']), /180/);
        });

        it('should throw if below minimum (w/o max)', () => {
            let rawInput = '-181';
            assert.throws(() => typesParser[type](rawInput, ['-180']), /180/);
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

        it('should include minimum length', () => {
            let rawInput = 'a';
            typesParser[type](rawInput, [1, 180]);
        });

        it('should not throw if within range', () => {
            let rawInput = 'abc';
            typesParser[type](rawInput, [2, 180]);
        });

        it('should throw if less than min', () => {
            let rawInput = 'a';
            assert.throws(() => typesParser[type](rawInput, [4, 180]), /4/);
        });

        it('should throw if more than max', () => {
            let rawInput = 'abcdefg';
            assert.throws(() => typesParser[type](rawInput, [2, 4]), /4/);
        });

        it('should throw if below minimum (w/o max)', () => {
            let rawInput = 'abc';
            assert.throws(() => typesParser[type](rawInput, [5]), /5/);
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

    describe('defineType', function() {
        before(() => InputTypes.defineType('NewType', input => Math.pow(+input, 2)));

        it('should not be able to define the same type twice', function() {
            assert.throws(() => InputTypes.defineType('NewType', input => input));
        });
    });
});
