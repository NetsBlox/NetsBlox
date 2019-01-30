const newLogger = require('./logger'),
    jsonQuery = require('json-query'),
    utils = require('./index'),
    MSG_SENDING_DELAY = 250;

class NBService {
    constructor(serviceName) {
        // must be a urlfriendly name
        if (!utils.isValidServiceName(serviceName))
            throw new Error(`service name ${serviceName} must be a combination of characters, numbers, and "-"`);
        this.serviceName = serviceName;

        this._logger = newLogger(this.serviceName);
        this._remainingMsgs = {};
    }

    // private
    // used internally for sending messages
    __sendNext() {
        var msgs = this._remainingMsgs[this.socket.uuid];
        if (msgs && msgs.length) {
            var msg = msgs.shift();

            while (msgs.length && msg.dstId !== this.socket.roleId) {
                msg = msgs.shift();
            }

            // check that the socket is still at the role receiving the messages
            if (msg && msg.dstId === this.socket.roleId) {
                this._logger.trace('sending msg to', this.socket.uuid, this.socket.roleId);
                this.socket.sendMessage(msg.msgType, msg.content);
            }

            if (msgs.length) {
                setTimeout(this.__sendNext.bind(this), MSG_SENDING_DELAY);
            } else {
                delete this._remainingMsgs[this.socket.uuid];
            }
        } else {
            delete this._remainingMsgs[this.socket.uuid];
        }
    }

    /**
     * processes and queries json object or strings
     * @param  {json/string} json  [description]
     * @param  {string} query query string from json-query package
     * @return {json}       returns the value found withing the input json
     */
    __queryJson(json, query){
        try {
            if (typeof(json) === 'string') {
                json = JSON.parse(json);
            }
        } catch (e) {
            this._logger.error('input is not valid json');
        }
        return jsonQuery(query, {data: json}).value;
    }


    // creates snap friendly structure out of an array ofsimple keyValue json object or just single on of them.
    _createSnapStructure(input){
        return utils.jsonToSnapList(input);
    }


    // send messages (throttled)
    _sendMsgsQueue(contents, msgType){
        this._remainingMsgs[this.socket.uuid] = [];
        let msgContents = contents;
        if (msgContents[0]) {
            let msgKeys = Object.keys(msgContents[0]);
            this.response.send(`sending ${msgContents.length} messages with message type: ${msgType} and following fields: ${msgKeys.join(', ')}`); // send back number of msgs
        }else {
            this.response.send(`sending ${msgContents.length} messages with message type: ${msgType}`); // send back number of msgs
        }

        msgContents.forEach(content=>{
            let msg = {
                dstId: this.socket.roleId,
                msgType,
                content
            };
            this._remainingMsgs[this.socket.uuid].push(msg);
        });
        this._logger.trace(`initializing sending of ${msgContents.length} messages`);
        this.__sendNext();
    }

    // sends an image to the user
    _sendImageBuffer(imageBuffer){
        utils.sendImageBuffer(this.response, imageBuffer);
        this._logger.trace('sent the image');
    }

    // stops sending of the messages
    _stopMsgs(){
        let msgCount;
        if (this._remainingMsgs[this.socket.uuid]) {
            msgCount = this._remainingMsgs[this.socket.uuid].length;
            delete this._remainingMsgs[this.socket.uuid];
            this._logger.trace('stopped sending messages for uuid:',this.socket.uuid, this.socket.roleId);
        }else {
            msgCount = 0;
            this._logger.trace('there are no messages in the queue to stop.');
        }
        return msgCount;
    }
}

module.exports = NBService;
