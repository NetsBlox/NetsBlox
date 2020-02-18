const Logger = require('../logger');
class APIKeys {
    async init(db, logger) {
        this.collection = db.collection('api-keys');
        this.logger = logger ? logger.fork('api-keys') : new Logger('netsblox:api-keys');
    }

    async get(username, apiKey) {
        const {name} = apiKey;
        console.log('getting key:', {name, username});
        const userKey = await this.collection.findOne({name, username});
        console.log('found key:', userKey);
        if (userKey) {
            return apiKey.withValue(userKey.value);
        }
        // TODO: Check for apiKeys for the group?
        return apiKey;
    }

    async list(username) {
        return this.collection.find({username}, {_id: 0}).toArray();
    }

    async create(username, name, value) {
        const filter = {username, name};
        const update = {$set: {value}};
        return this.collection.updateOne(filter, update, {upsert: true});
    }

    async delete(username, name) {
        return this.collection.deleteOne({username, name});
    }

    async all() {
        return this.collection.find({}, {_id: 0}).toArray();
    }
}

module.exports = new APIKeys();
