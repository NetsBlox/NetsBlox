const Logger = require('../logger');
const Users = require('../storage/users');
const assert = require('assert');
class APIKeys {
    async init(db, logger) {
        this.collection = db.collection('api-keys');
        this.logger = logger ? logger.fork('api-keys') : new Logger('netsblox:api-keys');
    }

    async get(username, apiKey) {
        const {name} = apiKey;
        const userKey = await this.getUserKey(username, name);
        if (userKey) {
            return apiKey.withValue(userKey.value);
        }

        const groupKey = await this.getGroupKey(username, name);
        if (groupKey) {
            return apiKey.withValue(groupKey.value);
        }
        return apiKey;
    }

    async getUserKey(owner, type) {
        const userKeys = await this.collection.find({owner, type}, {_id: 0}).toArray();
        return this.getLeastSharedKey(userKeys);
    }

    getKeyPriority(key) {
        if (key.isGroupDefault) {
            return Infinity;
        }
        return key.groups.length;
    }

    getLeastSharedKey(keys) {
        keys.sort((key1, key2) => {
            const p1 = this.getKeyPriority(key1);
            const p2 = this.getKeyPriority(key2);
            return p1 < p2 ? -1 : 1;
        });
        return keys.shift();
    }

    async getGroupKey(username, type) {
        const user = await Users.get(username);
        const group = user ? await user.getGroup() : null;
        if (group) {
            const owner = group.getOwner();
            const isGroupDefault = {owner, type, isGroupDefault: true};
            const isKeyForGroup = {type, groups: group.getId()};
            const query = {$or: [isGroupDefault, isKeyForGroup]};
            const keys = await this.collection.find(query, {_id: 0}).toArray();
            return this.getLeastSharedKey(keys);
        }
    }

    async list(username) {
        return this.collection.find({owner: username}, {_id: 0}).toArray();
    }

    async create(owner, type, value, isGroupDefault=false, groups=[]) {
        const filter = {owner, type, isGroupDefault, groups};
        const update = {$set: {value}};
        return this.collection.updateOne(filter, update, {upsert: true});
    }

    async setUsage(owner, value, isGroupDefault, groups) {
        const filter = {owner, value};
        const update = {$set: {isGroupDefault, groups}};
        assert(
            typeof isGroupDefault === 'boolean',
            `isGroupDefault must be a boolean! Received ${isGroupDefault}`
        );
        assert(
            groups instanceof Array,
            `groups must be an Array! Received ${groups}`
        );
        return this.collection.updateOne(filter, update);
    }

    async delete(owner, type, isGroupDefault=false, groups=[]) {
        return this.collection.deleteOne({owner, type, isGroupDefault, groups});
    }

    async all() {
        return this.collection.find({}, {_id: 0}).toArray();
    }
}

module.exports = new APIKeys();
