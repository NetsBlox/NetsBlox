const OAuthStorage = {};

OAuthStorage.init = function (_logger, db) {
    this.logger = _logger.fork('oauth');
    this.clients = db.collection('oauthClients');
    this.codes = db.collection('oauthCodes');
    this.codes.createIndex({ createdAt: 1 }, { expireAfterSeconds: 60 });
    this.collection = db.collection('oauth');
};

module.exports = OAuthStorage;
