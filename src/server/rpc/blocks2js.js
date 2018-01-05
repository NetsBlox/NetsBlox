// Extend snap2js for netsblox blocks and execution on the server
const snap2js = require('snap2js');
const backend = require('snap2js/src/backend');
const helpers = require('snap2js/src/backend-helpers');

const context = snap2js.newContext();
const blocks2js = Object.create(snap2js);

// Add support for the new block types
backend.doSocketMessage = function(node) {
    let args = node.inputs.map(input => this.generateCode(input));

    args.unshift(node.type);
    return helpers.callStatementWithArgs.apply(null, args);
};

blocks2js.setBackend(backend);

context.doSocketMessage = function() {
    const messageTypes = this.project.stage.messageTypes;
    let args = Array.prototype.slice.call(arguments, 0);
    let msgTypeName = args.shift();

    args.pop();  // remove the execution context
    let dstId = args.pop();

    const msgType = messageTypes.find(type => type.name === msgTypeName);
    const content = {};
    msgType.fields.forEach((name, i) => content[name] = args[i]);

    const message = {
        type: 'message',
        dstId: dstId,
        msgType: msgType.name,
        content: content
    };

    // Get the field names. Need to look up the message types from the stage...
    // TODO

    // How can I get a reference to the current socket?...
    console.log('sending', message);
    this.project.socket.send(message);
};

blocks2js.addContext('netsblox', context);
blocks2js.newContext = type => snap2js.newContext.call(blocks2js, type || 'netsblox');

blocks2js.parseMessageTypes = function(model) {
    let types = model.children;
    return types.map(type => {
        const fields = type.childNamed('fields').children.map(child => child.contents);
        return {
            name: type.childNamed('name').contents,
            fields: fields
        };
    });
};

blocks2js.parseStage = function(model) {
    let stage = snap2js.parseStage(model);
    stage.messageTypes = blocks2js.parseMessageTypes(model.childNamed('messageTypes'));
    return stage;
};

blocks2js.generateCodeFromState = function(state) {
    console.log(state);
    state.initCode += 'project.stage.messageTypes = [];\n' +
        state.stage.messageTypes
            .map(type => `project.stage.messageTypes.push(${JSON.stringify(type)})`).join(';\n');
    return snap2js.generateCodeFromState.call(this, state);
};

module.exports = blocks2js;
