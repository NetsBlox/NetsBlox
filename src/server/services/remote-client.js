const {SendMessage, SendMessageToRoom} = require('./messages');
const {Dealer} = require('zeromq');
const sender = new Dealer();
sender.connect('tcp://127.0.0.1:1235');
// TODO: Make a queue?

class RemoteClient {
    constructor(projectId, roleId, clientId) {
        this.projectId = projectId;
        this.clientId = clientId;
        this.roleId = roleId;
    }

    async sendMessage(type, contents={}) {
        await sender.send(new SendMessage(this.clientId, type, contents));
    }

    async sendMessageToRole(roleId, type, contents={}) {
    }

    async sendMessageToRoom(type, contents={}) {
        await sender.send(new SendMessageToRoom(this.projectId, type, contents));
    }

    send(type, contents) {
        throw new Error('send not implemented for RemoteClient');
    }
}

module.exports = RemoteClient;
