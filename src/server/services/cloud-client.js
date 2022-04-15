const _ = require('lodash');
const fetch = require('node-fetch');

// Client for NetsBlox Cloud
class NetsBloxCloud {
    constructor(cloudUrl, id, secret) {
        this.cloudUrl = cloudUrl;
        this.id = id;
        this.secret = secret;
    }

    async whoami(cookie) {
        // TODO: look up the username using the cookie
    }

    async getRoomState(projectId) {
        const url = `/network/id/${projectId}`;
        return await this.get(url);
    }

    async getClientInfo(clientId) {
        const url = `/network/${clientId}/state`;
        return await this.get(url);
    }

    async getServiceSettings(username) {
        const url = `/services/settings/user/${username}/${this.id}/all`;
        const settings = await this.get(url);
        return _.mapValues(settings, value => {
            if (value) {
                if (value.map) return value.map(JSON.parse);
                return JSON.parse(value);
            }
            return value;
        });
    }

    async userExists(username) {
        const user = await this.viewUser(username).catch(nop);
        return !!user;
    }

    async viewUser(username) {
        const url = `/users/${username}`;
        return await this.get(url);
    }

    async sendMessage(message) {
        const url = `/network/messages/`;
        console.log('sending', message);
        const response = await this.post(url, message);
        return response.status > 199 && response.status < 400;
    }

    async post(urlPath, body) {
        const headers = {'Content-Type': 'application/json'};
        body = JSON.stringify(body);
        return await this.fetch(urlPath, {method: 'post', body, headers});
    }

    async get(urlPath) {
        const response = await this.fetch(urlPath);
        return await response.json();
    }

    async fetch(urlPath, options={}) {
        const url = `${this.cloudUrl}${urlPath}`;
        const headers = options.headers || {};
        // TODO: make this a Bearer token?
        headers['X-Authorization'] = this.id + ':' + this.secret;

        options.headers = headers;
        return await fetch(url, options);
    }
}

const config = require('./config');
module.exports = new NetsBloxCloud(config.NetsBloxCloud, config.NetsBloxCloudID, config.NetsBloxCloudSecret);
