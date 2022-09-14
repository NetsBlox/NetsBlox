const Storage = require('../../storage');
let collections = null;
function GetStorage() {
    if (!collections) {
        collections = {
            tokens: Storage.create('alexa:tokens').collection,
            skills: Storage.create('alexa:skills').collection,
        };
    }
    return collections;
}

module.exports = GetStorage;
