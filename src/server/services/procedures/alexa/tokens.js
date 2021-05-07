const Storage = require('../../storage');
let collection = null;
const GetTokenStore = function() {
    if (!collection) {
        collection = Storage.create('alexa:tokens').collection;
    }
    return collection;
};
module.exports = GetTokenStore;
