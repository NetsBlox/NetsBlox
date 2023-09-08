let collections = null;
const getDatabase = function () {
  if (!collections) {
    const Storage = require("../../storage");
    collections = {
      autograders: Storage.createCollection("autograders"),
      tokens: Storage.createCollection("autograderTokens"),
    };
    const one_hour = 60 * 60;
    collections.tokens.createIndex({ createdAt: 1 }, {
      expireAfterSeconds: one_hour,
    });
  }
  return collections;
};

module.exports = getDatabase;
