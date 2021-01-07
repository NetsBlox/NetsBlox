const OAuthStorage = {};

OAuthStorage.init = function (_logger, db) {
    this.logger = _logger.fork('oauth');
    this.clients = db.collection('oauthClients');
    this.collection = db.collection('oauth');
};

module.exports = OAuthStorage;
