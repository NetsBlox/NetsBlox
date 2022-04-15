const {SendMessageToClient, SendMessage, SendMessageToRoom, SendMessageToRole} = require('./messages');
const NetsBloxCloud = require('./cloud-client');

class RemoteClient {
    constructor(projectId, roleId, clientId, username) {
        this.projectId = projectId;
        this.clientId = clientId;
        this.roleId = roleId;
        this.username = username;
    }

    async sendMessage(type, contents={}) {
        return NetsBloxCloud.sendMessage(new SendMessageToClient(
            this.projectId,
            this.roleId,
            this.clientId,
            type,
            contents
        ));
    }

    async sendMessageTo(address, type, contents={}) {
        return NetsBloxCloud.sendMessage(new SendMessage(this.projectId, this.roleId, address, type, contents));
    }

    async sendMessageToRole(roleId, type, contents={}) {
        return NetsBloxCloud.sendMessage(new SendMessageToRole(this.projectId, roleId, type, contents));
    }

    async sendMessageToRoom(type, contents={}) {
        return NetsBloxCloud.sendMessage(new SendMessageToRoom(this.projectId, type, contents));
    }
}

module.exports = RemoteClient;
