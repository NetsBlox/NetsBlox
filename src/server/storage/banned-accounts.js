const BannedAccounts = {};

BannedAccounts.init = function (_logger, db) {
    this.logger = _logger.fork('bannedAccounts');
    this.collection = db.collection('bannedAccounts');
};

BannedAccounts.ban = async function(user) {
    user.bannedAt = new Date();
    return await this.collection.insertOne(user);
};

BannedAccounts.isBannedEmail = async function(email) {
    return await this.collection.findOne({email});
};

BannedAccounts.isBannedUsername = async function(username) {
    return await this.collection.findOne({username});
};

module.exports = BannedAccounts;
