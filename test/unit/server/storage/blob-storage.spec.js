const utils = require('../../../assets/utils');

describe.skip(utils.suiteName(__filename), function() {
    const blob = require('../../../../src/server/storage/blob'),
        assert = require('assert'),
        path = require('path'),
        sha = require('../../../../src/common/sha512').hex_sha512,
        BLOB_DIR = path.join(__dirname, '..', '..', '..', '..', 'test-blob-storage'),
        rm_rf = require('rimraf');

    before(function() {
        blob.configure(BLOB_DIR);
    });

    after(function() {
        rm_rf.sync(BLOB_DIR);
    });

    it('should store file using hash for id', function(done) {
        blob.store('hello world')
            .then(id => {
                assert.equal(id, sha('hello world'));
            })
            .nodeify(done);
    });

    it('should retrieve the stored data using provided id', function(done) {
        var content = 'abc def';
        blob.store(content)
            .then(id => {
                return blob.get(id);
            })
            .then(data => assert.equal(data, content))
            .nodeify(done);
    });
});
