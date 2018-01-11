// Extend snap2js for netsblox blocks and execution on the server
const Q = require('q');
const snap2js = require('snap2js');
const backend = require('snap2js/src/backend');
const helpers = require('snap2js/src/backend-helpers');
const Logger = require('../logger');
const logger = new Logger('netsblox:rpc:blocks2js');

const context = snap2js.newContext();
const blocks2js = Object.create(snap2js);
const DEFAULT_MSG_TYPE = {name: 'message', fields: ['msg']};

// Add support for the new block types
backend.doSocketMessage = function(node) {
    let args = node.inputs.map(input => this.generateCode(input));

    args.unshift(node.type);
    return helpers.callStatementWithArgs.apply(null, args);
};

delete backend.reportJSFunction;
blocks2js.setBackend(backend);

context.doSocketMessage = function() {
    const messageTypes = this.project.stage.messageTypes;
    let args = Array.prototype.slice.call(arguments, 0);
    let msgTypeName = args.shift();

    args.pop();  // remove the execution context
    let dstId = args.pop();

    const msgType = messageTypes.find(type => type.name === msgTypeName) || DEFAULT_MSG_TYPE;
    const message = {
        type: 'message',
        dstId: dstId,
        msgType: msgType.name,
        content: {}
    };

    msgType.fields.forEach((name, i) => message.content[name] = args[i]);

    this.project.ctx.socket.onMessage(message);
};

context.getJSFromRPCStruct = function(service, name) {
    const args = Array.prototype.slice.call(arguments, 2);
    args.pop();

    logger.trace(`about to call ${service} ${name} with ${JSON.stringify(args)}`);

    // Call the rpc...
    // Update the context so it doesn't share a response as the original
    // Create a new context for this
    const RPCManager = require('./rpc-manager');
    const rpc = RPCManager.getRPCInstance(service, this.project.ctx.socket.uuid);

    const subCtx = Object.create(rpc);
    subCtx.response = new ServerResponse();
    // Same socket for now... Maybe this is what we want?

    return Q(RPCManager.callRPC(name, subCtx, args))
        .then(() => subCtx.response.promise)
        .catch(err => {
            logger.error(`rpc invocation failed: ${err}`);
            throw err;
        });
};

// Make this a promise?
function ServerResponse() {
    this.deferred = Q.defer();
    this.promise = this.deferred.promise;
    this._status = null;
    this.responseText = '';
    this.result = null;
}

ServerResponse.prototype.status = function(code) {
    this._status = code;
    return this;
};

ServerResponse.prototype.send = function(text) {
    this.responseText = text;
    this.deferred.resolve(text);
    return this;
};

ServerResponse.prototype.json = function(json) {
    this.result = json;
    this.deferred.resolve(json);
    return this;
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
    state.stage.messageTypes = state.stage.messageTypes || [];
    state.initCode += 'project.stage.messageTypes = [];\n' +
        state.stage.messageTypes
            .map(type => `project.stage.messageTypes.push(${JSON.stringify(type)})`).join(';\n');
    return snap2js.generateCodeFromState.call(this, state);
};

module.exports = blocks2js;
