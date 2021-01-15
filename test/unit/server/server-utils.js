const testUtils = require('../../assets/utils');
describe(testUtils.suiteName(__filename), function() {
    const utils = require('../../../src/server/server-utils');
    const _ = require('lodash');
    const assert = require('assert');

    [
        [640, 335, 1.33],
        [335, 640, 1.33],
        [335, 640, .83],
        [304, 640, 9.83],
        [800, 640, 4.83],
        [335, 40, 1.83],
        [100, 640, .23]
    ].forEach(tuple => {
        var [w, h, r] = tuple;

        describe(`${w}x${h} (${r})`, function() {
            var pad, newWidth, newHeight, newRatio;

            before(function() {
                pad = utils.computeAspectRatioPadding(w, h, r);
                newWidth = w+pad.left+pad.right;
                newHeight = h+pad.top+pad.bottom;
                newRatio = newWidth/newHeight;
            });

            it(`should compute correct ratio`, function() {
                assert(Math.abs(newRatio - r) < 0.1);
            });

            ['top', 'bottom', 'left', 'right'].forEach(side => {
                it(`should have non-negative ${side} pad`, function() {
                    assert(pad[side] >= 0, `${side} has pad of ${pad[side]}`);
                });
            });
        });
    });

    describe('xml', function() {
        it('should be able to parse action id', function () {
            const test = '<project collabStartIndex="10">';
            assert.equal(utils.xml.actionId(test), 10);
        });
    });

    describe('client IDs', function() {
        it('should ensure client IDs do not collide', function() {
            const ids = [
                utils.getNewClientId(),
                utils.getNewClientId(),
                utils.getNewClientId(),
                utils.getNewClientId()
            ];
            assert.equal(_.uniq(ids).length, ids.length);
        });
    });
});
