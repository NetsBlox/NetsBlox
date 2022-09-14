const Storage = require('../../storage');
let collections = null;

function GetStorage() {
    if (!collections) {
        collections = {
            dailyWords: Storage.create('daily-word-guess:dailyWords').collection,
            games: Storage.create('daily-word-guess:games').collection,
        };

        const day = 60 * 60 * 24;
        collections.games.createIndex(
            {date: 1},
            {
                expireAfterSeconds: 1*day,
            }
        );
    }
    return collections;
}

module.exports = GetStorage;
