describe.only('api-keys', function() {
    const utils = require('../../../assets/utils');
    const APIKeys = utils.reqSrc('services/api-keys');
    const APIKey = utils.reqSrc('services/procedures/utils/api-key');
    const assert = require('assert');

    before(async () => {
        const db = await utils.reset();
        APIKeys.init(db);
    });

    it('should create API keys', async function() {
        const {username, type, value} = newKey();
        await APIKeys.create(username, type, value);
        const doc = await APIKeys.collection.findOne({owner: username});
        assert(!!doc);
    });

    it('should get API keys', async function() {
        const {username, type, value} = newKey();
        await APIKeys.create(username, type, value);
        const apiKey = APIKey.GoogleMapsKey;
        const key = await APIKeys.get(username, apiKey);
        assert.notEqual(key.value, apiKey.value);
    });

    it('should delete keys', async function() {
        const {username, type, value} = newKey();
        const {insertedId} = await APIKeys.create(username, type, value);
        await APIKeys.delete(insertedId, username);
        const doc = await APIKeys.collection.findOne({owner: username});
        assert(!doc);
    });

    let id = 1;
    function newKey() {
        const username = `user_${id++}`;
        return {
            username,
            type: 'Google Maps',
            value: `value_${id}`
        };
    }
});
