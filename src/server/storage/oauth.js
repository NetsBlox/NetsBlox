const OAuthStorage = {};

OAuthStorage.init = function (_logger, db) {
    this.logger = _logger.fork('oauth');
    this.clients = db.collection('oauthClients');
    this.codes = db.collection('oauthCodes');
    this.codes.createIndex({ createdAt: 1 }, { expireAfterSeconds: 600 });
    this.tokens = db.collection('oauthTokens');
};

module.exports = OAuthStorage;
