const {SendMessage} = require('./messages');
const {Dealer} = require('zeromq');
const sender = new Dealer();
sender.connect('tcp://127.0.0.1:1235');
// TODO: Make a queue?

class RemoteClient {
    constructor(clientId, roleId) {
        this.clientId = clientId;
        this.roleId = roleId;
    }

    async sendMessage(type, contents) {
        await sender.send(new SendMessage(this.clientId, type, contents));
    }

    send(type, contents) {
    }
}

module.exports = RemoteClient;
