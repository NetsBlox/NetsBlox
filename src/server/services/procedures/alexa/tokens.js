const Storage = require('../../storage');
let collection;
const GetTokenStore = () => {
    if (!collection) {
        collection = Storage.create('alexa:tokens').collection;
    }
    return collection;
};
module.exports = GetTokenStore;
