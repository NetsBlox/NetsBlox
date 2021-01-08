const Logger = require('../../logger');
const {OAuthClientNotFound, RequestError} = require('./errors');
const {ObjectId} = require('mongodb');
const OAuthStorage = require('../../storage/oauth');

class OAuth {
    constructor() {
        this.logger = new Logger('netsblox:oauth');
    }

    async createClient(owner, name) {
        const id = this._genGuid();
        const client = {id, owner, name};
        const result = await OAuthStorage.clients.updateOne(
            {id},
            {$setOnInsert: client},
            {upsert: true}
        );
        if (result.upsertedCount === 0) {
            throw new RequestError('Unable to create client. Please try again.');
        }
        return id;
    }

    _genGuid(len=20) {
        const chars = new Array(16).fill().map((_, i) => i.toString(16));
        return new Array(len).fill().map(() => this._sample(chars)).join('');
    }

    _sample(opts) {
        return opts[Math.floor(Math.random() * opts.length)];
    }

    async getAuthData(authCode) {
        const authData = await OAuthStorage.codes.findOne({_id: ObjectId(authCode)});
        return authData;
    }

    async createToken(username, clientId) {
        const result = await OAuthStorage.tokens.insertOne({
            clientId,
            username,
            createdAt: new Date(),
        });
        return result.insertedId;
    }

    async authorizeClient(username, clientId, redirectUri) {
        await this._verifyClientID(clientId);
        const result = await OAuthStorage.codes.insertOne({
            clientId,
            username,
            redirectUri,
            createdAt: new Date(),
        });

        return result.insertedId;
    }

    async getClient(id) {
        const client = await OAuthStorage.clients.findOne({id});
        if (!client) {
            throw new OAuthClientNotFound();
        }
        return client;
    }

    async getClients() {
        return await OAuthStorage.clients.find({}).toArray();
    }

    createAccessToken() {
    }

    async _verifyClientID(id, secret) {
        const client = await OAuthStorage.clients.findOne({id, secret});
        if (!client) {
            throw new OAuthClientNotFound();
        }
    }
}

module.exports = new OAuth();
