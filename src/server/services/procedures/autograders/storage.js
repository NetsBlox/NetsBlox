let mongoCollection = null;
const getDatabase = function() {
    if (!mongoCollection) {
        const Storage = require('../../storage');
        mongoCollection = Storage.createCollection('autograders');
    }
    return mongoCollection;
};

module.exports = getDatabase;
