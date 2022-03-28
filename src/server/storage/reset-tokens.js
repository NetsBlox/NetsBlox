const ResetTokens = {};
const uuid = require('uuid');

ResetTokens.init = function (_logger, db) {
    this.logger = _logger.fork('resetTokens');
    this.collection = db.collection('resetTokens');
    const oneHour = 60 * 60;
    this.collection.createIndex({ createdAt: 1 }, {expireAfterSeconds: oneHour });
};

ResetTokens.new = async function(username) {
    const token = {
        username,
        createdAt: new Date(),
        value: uuid.v4(),
    };

    const result = await this.collection.updateOne({username}, {$set: token}, {upsert: true});
    if (result.upsertedCount === 0) {
        throw new Error('Reset request already issued.');
    }
    return token;
};

ResetTokens.isValidToken = async function(username, value) {
    return await this.collection.findOneAndDelete({username, value});
};

ResetTokens.getResetURL = async function(token) {
    return token.value;
};

module.exports = ResetTokens;
