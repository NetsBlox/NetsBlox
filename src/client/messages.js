/*globals modules*/
// Global settings /////////////////////////////////////////////////////

modules.messages = '2015-October-02';


var List;
var ListWatcherMorph;

// Message /////////////////////////////////////////////////////////////
/*
   This is a Message object for NetsBlox. It contains a number of 
   predefined fields
 */

var Message;
var MessageType;

function MessageType(name, fields) {
    this.name = name;
    this.fields = fields;
}

function Message(type) {
    this.type = type;
    this.contents = {};
    this.init();
}

Message.prototype.init = function() {
    for (var i = this.type.fields.length; i--;) {
        this.set(this.type.fields[i], 0);
    }
};

Message.prototype.set = function(field, value) {
    // Should I verify that field is a valid type? FIXME
    this.contents[field] = value;
};

Message.prototype.get = function(field) {
    return this.contents[field];
};

Message.prototype.getFieldNames = function() {
    return this.type.fields.slice();
};

Message.prototype.toString = function() {
    // FIXME: Better representation would be good...
    // Can I reuse the List graphic?
    return this.type.name + ' Message';
};

// MessageFrame
function MessageFrame() {
    this.msgTypes = {};
}

MessageFrame.prototype.addMsgType = function(messageType) {
    this.msgTypes[messageType.name] = messageType;
};

MessageFrame.prototype.getMsgType = function(name) {
    return this.msgTypes[name];
};

MessageFrame.prototype.deleteMsgType = function(name) {
    delete this.msgTypes[name];
};

MessageFrame.prototype.names = function() {
    return Object.keys(this.msgTypes);
};

// TODO: Consider making them scoped... They are currently all global
