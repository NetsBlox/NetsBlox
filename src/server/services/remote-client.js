const {SendMessage, SendMessageToRoom, SendMessageToRole} = require('./messages');
const {Dealer} = require('zeromq');
const sender = new Dealer();
sender.connect('tcp://127.0.0.1:1235');

class QueuedSender {
    constructor() {
        this.sending = false;
        this.waiting = [];
    }

    trySend(data) {
        if (this.sending) {
            this.waiting.push(data);
        } else {
            this.send(data);
        }
    }

    async send(data) {
        this.sending = true;
        await sender.send(data);
        if (this.waiting.length) {
            this.send(this.waiting.shift());
        }
        this.sending = false;
    }
}

const channel = new QueuedSender();
class RemoteClient {
    constructor(projectId, roleId, clientId, username) {
        this.projectId = projectId;
        this.clientId = clientId;
        this.roleId = roleId;
        this.username = username;
    }

    async sendMessage(type, contents={}) {
        await channel.trySend(new SendMessage(this.clientId, type, contents));
    }

    async sendMessageToRole(roleId, type, contents={}) {
        await channel.trySend(new SendMessageToRole(this.projectId, roleId, type, contents));
    }

    async sendMessageToRoom(type, contents={}) {
        await channel.trySend(new SendMessageToRoom(this.projectId, type, contents));
    }
}

module.exports = RemoteClient;
