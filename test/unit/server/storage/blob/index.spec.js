const utils = require('../../../../assets/utils');

describe(utils.suiteName(__filename), function() {
    const sha = require('../../../../../src/common/sha512').hex_sha512;
    const blob = require('../../../../../src/server/storage/blob');
    const assert = require('assert');
    let blobBackend = blob.backend;

    before(function() {
        blob.backend = {};
    });

    after(function() {
        blob.backend = blobBackend;
    });

    describe('get', function() {
        it('should use backend for get', function(done) {
            const requestedId = 'testId';

            blob.backend.get = id => {
                assert.equal(id, requestedId);
                done();
            };
            blob.get(requestedId);
        });
    });

    describe('store', function() {
        it('should use backend for store', function(done) {
            const data = 'testData';

            blob.backend.store = (id, data) => {
                assert.equal(id, sha(data));
                done();
            };
            blob.store(data);
        });
    });
});
