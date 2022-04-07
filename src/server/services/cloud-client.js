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
        // TODO: make a request to `/network/id/${projectId}`
    }

    async getClientState(clientId) {
        const url = `${this.cloudUrl}/network/${clientId}/state`;
        const {username, state} = await this.get(url);
    }

    async getServiceSettings(clientId) {  // TODO: or should this use username?
        // TODO
    }

    async userExists(username) {
        const user = await this.viewUser(username).catch(nop);
        return !!user;
    }

    async viewUser(username) {
        const url = `/users/${username}`;
    }

    async fetch(url) {
        const headers = {
            'X-Authorization': config.NetsBloxCloudID + ':' + config.NetsBloxCloudSecret,
        };
        const response = await axios.get(url, {headers});
    }
}

const config = require('./config');
module.exports = new NetsBloxCloud(config.NetsBloxCloud, config.NetsBloxCloudID, config.NetsBloxCloudSecret);
