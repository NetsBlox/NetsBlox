const Logger = require('../../logger');
const {OAuthClientNotFound, InvalidRedirectURL, InvalidAuthorizationCode} = require('./errors');
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
        const authData = await OAuthStorage.codes.findOne({_id: getObjectId(authCode, InvalidAuthorizationCode)});
        return authData;
    }

    async createToken(authCode, redirectUri) {
        const authData = await this.getAuthData(authCode);
        if (!authData) {
            throw new InvalidAuthorizationCode();
        }

        const {username, clientId} = authData;
        if (authData.redirectUri !== redirectUri) {
            throw new InvalidRedirectURL();
        }

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
        const client = await OAuthStorage.clients.findOne({_id: getObjectId(id)});
        if (!client) {
            throw new OAuthClientNotFound();
        }
        return client;
    }

    async getClients() {
        return await OAuthStorage.clients.find({}).toArray();
    }

    async _verifyClientID(id) {
        const client = await OAuthStorage.clients.findOne({_id: getObjectId(id)});
        if (!client) {
            throw new OAuthClientNotFound();
        }
    }
}

function getObjectId(id, ErrorClass=OAuthClientNotFound) {
    try {
        return ObjectId(id);
    } catch (err) {
        throw new ErrorClass();
    }
}

module.exports = new OAuth();
