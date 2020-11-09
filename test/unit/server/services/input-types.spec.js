describe('RPC Input Types', function() {
    const typesParser = require('../../../../src/server/services/input-types').parse;
    const assert = require('assert');

    describe('String', function() {
        it('should convert to a string', () => {
            let rawInput = 0;
            let parsedInput = typesParser.String(rawInput);
            assert.equal(typeof parsedInput, 'string');
        });
    });

    describe('Any', function() {
        it('should leave as a string', () => {
            let rawInput = '4.253';
            let parsedInput = typesParser.Any(rawInput);
            assert.equal(parsedInput, rawInput);
        });
    });

    describe('Number', function() {
        it('should parse into JS numbers', () => {
            let rawInput = '4.253';
            let parsedInput = typesParser.Number(rawInput);
            assert.deepEqual(parsedInput, 4.253);
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
            assert.throws(() => typesParser.Array(['text'], 'Number'));
        });

        it('should support nested types', () => {
            typesParser.Array([1, 2], 'Number');
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
            assert.deepEqual(parsedInput.name, 'Hamid');
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
            typesParser[type](rawInput, 10, 180);
        });

        it('should not throw if within range', () => {
            let rawInput = '-151';
            typesParser[type](rawInput, -180, 180);
        });

        it('should return Number (not string)', () => {
            const input = '10';
            const value = typesParser[type](input, 0, 21);
            assert.equal(typeof value, 'number');
        });

        it('should throw if less than min', () => {
            let rawInput = '-181';
            assert.throws(() => typesParser[type](rawInput, -180, 180), /-180/);
        });

        it('should throw if more than max', () => {
            let rawInput = '181';
            assert.throws(() => typesParser[type](rawInput, '-180', '180'), /180/);
        });

        it('should throw if below minimum (w/o max)', () => {
            let rawInput = '-181';
            assert.throws(() => typesParser[type](rawInput, '-180'), /180/);
        });

        it('should not print NaN in error if below minimum (w/o max)', () => {
            let rawInput = '-181';
            try {
                typesParser[type](rawInput, '-180');
            } catch (err) {
                assert(!err.message.includes('NaN'));
            }
        });

        it('should accept if above minimum (w/o max)', () => {
            const rawInput = '10';
            typesParser[type](rawInput, '9');
        });
    });

    describe('BoundedString', function() {
        const type = 'BoundedString';

        it('should include minimum length', () => {
            let rawInput = 'a';
            typesParser[type](rawInput, 1, 180);
        });

        it('should not throw if within range', () => {
            let rawInput = 'abc';
            typesParser[type](rawInput, 2, 180);
        });

        it('should throw if less than min', () => {
            let rawInput = 'a';
            assert.throws(() => typesParser[type](rawInput, 4, 180), /4/);
        });

        it('should throw if more than max', () => {
            let rawInput = 'abcdefg';
            assert.throws(() => typesParser[type](rawInput, 2, 4), /4/);
        });

        it('should throw if below minimum (w/o max)', () => {
            let rawInput = 'abc';
            assert.throws(() => typesParser[type](rawInput, 5), /5/);
        });

        it('should accept if above minimum (w/o max)', () => {
            const rawInput = 'abcdefg';
            typesParser[type](rawInput, 5);
        });
    });
});
