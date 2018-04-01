describe('Storage', function() {
    const utils = require('../../../assets/utils');
    const Storage = utils.reqSrc('storage/storage');
    const assert = require('assert');

    describe('mongoURI', function() {
        [
            ['localhost', 'admin'],
            ['mongodb://localhost/', 'admin'],
            ['127.0.0.1:2031/dbName', 'dbName'],
            ['127.0.0.1:2031/', 'admin'],
            ['someURL-mongo.org:2031/dbName', 'dbName'],
            ['someURL-mongo.org:2031/dbName-', 'dbName-'],
        ].forEach(pair => {
            const [uri, db] = pair;
            it(`should correctly parse db name from ${uri}`, () => {
                assert.equal(Storage.getDatabaseFromURI(uri), db);
            });
        });
    });
});
