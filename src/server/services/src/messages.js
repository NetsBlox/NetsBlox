const Messages = {};

class Message {
    constructor(target, msgType, content) {
        this.target = target;
        this.content = {
            type: 'message',
            msgType,
            content,
        };
    }
}

class SendMessage extends Message {
    constructor(projectId, roleId, address, type, contents) {
        const target = {address: {address}};
        super(target, type, contents);
    }
}

class SendMessageToClient extends Message {
    constructor(projectId, roleId, clientId, type, contents) {
        const target = {client: {projectId, roleId, clientId}};
        super(target, type, contents);
    }
}

class SendMessageToRoom extends Message {
    constructor(projectId, type, contents) {
        const target = {room: {projectId}};
        super(target, type, contents);
    }
}

class SendMessageToRole extends Message {
    constructor(projectId, roleId, type, contents) {
        const target = {role: {projectId, roleId}};
        super(target, type, contents);
    }
}

Messages.parse = Message.parse;
Messages.SendMessage = SendMessage;
Messages.SendMessageToClient = SendMessageToClient;
Messages.SendMessageToRoom = SendMessageToRoom;
Messages.SendMessageToRole = SendMessageToRole;
module.exports = Messages;
