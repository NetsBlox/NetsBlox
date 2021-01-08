const Logger = require('../../logger');
const {OAuthClientNotFound} = require('./errors');
const {ObjectId} = require('mongodb');
const OAuthStorage = require('../../storage/oauth');

class OAuth {
    constructor() {
        this.logger = new Logger('netsblox:oauth');
    }

    async createClient(owner, name) {
        const result = await OAuthStorage.clients.insertOne(
            {owner, name},
        );
        return result.insertedId;
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
        const client = await OAuthStorage.clients.findOne({_id: ObjectId(id)});
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
