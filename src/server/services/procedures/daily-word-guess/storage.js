const Storage = require('../../storage');
let collections = null;

function GetStorage() {
    if (!collections) {
        collections = {
            usedWords: Storage.create('daily-word-guess:usedWords').collection,
        };
    }
    return collections;
}

module.exports = GetStorage;
