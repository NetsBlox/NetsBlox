const Logger = require('../../logger');
const {OAuthClientNotFound, InvalidRedirectURL, InvalidAuthorizationCode, InvalidOAuthToken} = require('./errors');
const OAuthStorage = require('../../storage/oauth');
const uuid = require('uuid');

class OAuth {
    constructor() {
        this.logger = new Logger('netsblox:oauth');
    }

    async createClient(owner, name) {
        const result = await OAuthStorage.clients.insertOne({
            _id: uuid.v4(),
            owner,
            name
        });
        return result.insertedId;
    }

    async removeClient(requestor, id) {
        // TODO: check permissions
        const result = await OAuthStorage.clients.removeOne({_id: id});
        return result.nRemoved;
    }

    async createToken(authCode, redirectUri) {
        const authData = await this._getAuthData(authCode);
        if (!authData) {
            throw new InvalidAuthorizationCode();
        }

        const {username, clientId} = authData;
        if (authData.redirectUri !== redirectUri) {
            throw new InvalidRedirectURL();
        }

        const result = await OAuthStorage.tokens.insertOne({
            _id: uuid.v4(),
            clientId,
            username,
            createdAt: new Date(),
        });
        return result.insertedId;
    }

    async authorizeClient(username, clientId, redirectUri) {
        await this._verifyClientID(clientId);
        const result = await OAuthStorage.codes.insertOne({
            _id: uuid.v4(),
            clientId,
            username,
            redirectUri,
            createdAt: new Date(),
        });

        return result.insertedId;
    }

    async getToken(id) {
        const token = await OAuthStorage.tokens.findOne({_id: id});
        if (!token) {
            throw new InvalidOAuthToken();
        }
        return token;
    }

    async getClient(id) {
        const client = await OAuthStorage.clients.findOne({_id: id});
        if (!client) {
            throw new OAuthClientNotFound();
        }
        return client;
    }

    async getClients() {
        return await OAuthStorage.clients.find({}).toArray();
    }

    async _verifyClientID(id) {
        const client = await OAuthStorage.clients.findOne({_id: id});
        if (!client) {
            throw new OAuthClientNotFound();
        }
    }

    async _getAuthData(authCode) {
        const authData = await OAuthStorage.codes.findOne({_id: authCode});
        return authData;
    }
}

module.exports = new OAuth();
