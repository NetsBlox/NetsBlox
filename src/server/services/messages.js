const Messages = {};

class Message {
    constructor() {
        this._type = this.constructor.name;
        this._data = Array.prototype.slice.call(arguments);
    }

    getType() {
        return this._type;
    }

    static parse(msg) {
        const {_type, _data} = JSON.parse(msg);
        return new Messages[_type](..._data);
    }

    toString() {
        return JSON.stringify(this);
    }
}

class ServiceMetadata extends Message {
    constructor(metadata, compatibility) {
        super(...arguments);
        this.metadata = metadata;
        this.compatibility = compatibility;
    }
}

class CallRPC extends Message {
    constructor() {
        super(...arguments);
    }
}

class RPCResult extends Message {
    constructor() {
        super(...arguments);
    }
}

class SendMessage extends Message {
    constructor(clientId, type, contents) {
        super(...arguments);
        this.clientId = clientId;
        this.type = type;
        this.contents = contents;
    }
}

class SendMessageToRoom extends Message {
    constructor(projectId, type, contents) {
        super(...arguments);
        this.projectId = projectId;
        this.type = type;
        this.contents = contents;
    }
}

Messages.parse = Message.parse;
Messages.SendMessage = SendMessage;
Messages.SendMessageToRoom = SendMessageToRoom;
Messages.ServiceMetadata = ServiceMetadata;
Messages.CallRPC = CallRPC;
Messages.RPCResult = RPCResult;
module.exports = Messages;
