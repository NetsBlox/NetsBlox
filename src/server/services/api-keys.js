const express = require('express');
const Logger = require('../logger');
const Users = require('../storage/users');
const assert = require('assert');
const ObjectId = require('mongodb').ObjectId;
const _ = require('lodash');

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
        return this.collection.find({owner: username}).toArray();
    }

    /**
     * Create a new API key. Overwrite any existing key with the same owner and
     * scope.
     */
    async create(owner, type, value, isGroupDefault=false, groups=[]) {
        const doc = {owner, type, value, isGroupDefault, groups};
        return this.collection.insertOne(doc);
    }

    async setScope(id, isGroupDefault, groups) {
        const filter = {_id: ObjectId(id)};
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

    async delete(id, username) {
        const query = {_id: ObjectId(id)};
        if (username) {
            query.owner = username;
        }
        return this.collection.deleteOne(query);
    }

    async all() {
        return this.collection.find({}).toArray();
    }

    router() {
        const router = express.Router({mergeParams: true});
        const EDITABLE_DOC_KEYS = ['value', 'isGroupDefault', 'groups']

        router.route('/').get(async (req, res) => {
            const {username} = req.session;
            res.json(await this.list(username));
        });

        router.route('/:type').post(async (req, res) => {
            const {type} = req.params;
            const {username} = req.session;
            const {value, isGroupDefault, groups} = req.body;

            if (!value) {
                return res.status(400).send('Missing required field: value');
            }
            const result = await this.create(username, type, value, isGroupDefault, groups);
            res.send(result.insertedId);
        });

        router.route('/').patch(async (req, res) => {
            const {username} = req.session;
            const {id} = req.body;
            if (!id) {
                return res.status(400).send('Missing required field: id');
            }
            const query = {
                _id: ObjectId(id),
                owner: username
            };
            const keys = EDITABLE_DOC_KEYS
                .filter(key => Object.prototype.hasOwnProperty.call(req.body, key));
            const update = {$set: _.pick(req.body, keys)};
            const doc = await this.collection.findOneAndUpdate(
                query,
                update,
                {returnNewDocument: true}
            );
            res.json(doc);
        });

        router.route('/:id').delete(async (req, res) => {
            const {username} = req.session;
            const {id} = req.params;
            const result = await this.delete(id, username);
            res.json(!!result.deletedCount);
        });

        return router;
    }
}

module.exports = new APIKeys();
