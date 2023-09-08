let collections = null;
const getDatabase = function () {
  if (!collections) {
    const Storage = require("../../storage");
    collections = {
      autograders: Storage.createCollection("autograders"),
      tokens: Storage.createCollection("autograderTokens"),
    };
    const one_week = 7 * 24 * 60 * 60;
    collections.tokens.createIndex({ createdAt: 1 }, {
      expireAfterSeconds: one_week,
    });
  }
  return collections;
};

module.exports = getDatabase;
