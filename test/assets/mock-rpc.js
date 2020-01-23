// I should probably rename this. This is a wrapper for testing the RPC's
'use strict';

// RPCs now contain the methods
var Constants = require('../../src/common/constants'),
    getArgsFor = require('../../src/server/server-utils').getArgumentsFor,
    MockResponse = require('./mock-response'),
    _ = require('lodash');

const utils = require('./utils');
const NetworkTopology = utils.reqSrc('network-topology');
const Logger = utils.reqSrc('logger');
let logger;

var MockRPC = function(RPC) {
    this._methods = [];
    this._rpc = typeof RPC === 'function' ?
        new RPC() : _.cloneDeep(RPC);
    this.createMethods(RPC);

    logger = new Logger('netsblox:test:services');
    this.getNewSocket();
    this.response = new MockResponse();
    this.request = new MockRequest();

    this.serviceName = this._rpc.serviceName;
};

MockRPC.prototype.getNewSocket = function() {
    this.socket = new MockClient();
    this._rpc.socket = this.socket;
    NetworkTopology.onConnect(this.socket);
};

MockRPC.prototype.setRequester = function(uuid, username) {
    this.getNewSocket();

    this.socket.uuid = uuid || this.socket.uuid;
    if (this.socket.uuid[0] !== '_') {
        this.socket.uuid = '_' + this.socket.uuid;
    }

    this.socket.username = username;
    this.socket.loggedIn = !!username;
};

MockRPC.prototype.createMethods = function(RPC) {
    var fnObj = typeof RPC === 'function' ? RPC.prototype : RPC,
        publicFns = Object.keys(fnObj)
            .filter(name => name[0] !== '_')
            .filter(name => !Constants.RPC.RESERVED_FN_NAMES.includes(name));

    publicFns.forEach(method => {
        this._methods.push(method);
        this.addMethod(method);
    });
};

MockRPC.prototype.getArgumentsFor = function(fnName) {
    if (this._methods.includes(fnName)) {
        return getArgsFor(this._rpc[fnName]);
    }
    throw new Error(`${fnName} is not supported by the Service!`);
};

MockRPC.prototype.addMethod = function(name) {
    this[name] = function() {
        const ctx = Object.create(this._rpc);
        ctx.socket = this.socket;
        ctx.response = this.response;
        ctx.request = this.request;
        ctx.caller = {
            roleId: this.socket.roleId,
            clientId: this.socket.uuid,
            username: this.socket.username,
            projectId: this.socket.projectId || 'testProject'
        };
        const args = JSON.stringify(Array.prototype.slice.call(arguments));
        const id = ctx.caller.clientId || 'new client';
        logger.trace(`${id} is calling ${name}(${args.substring(1, args.length-1)})`);
        return this._rpc[name].apply(ctx, arguments);
    };
};

const MockRequest = function() {
    this._events = {};
};

MockRequest.prototype.abort = function() {
    if (this._events.close) {
        this._events.close();
    }
};

MockRequest.prototype.on = function(event, fn) {
    if (event === 'close') {
        this._events.close = fn;
    } else {
        throw new Error('Unrecognized event listener:', event);
    }
};

const MockClient = function() {
    this.roleId = 'myRole-' + Date.now();
    this.uuid = 'uuid-' + Date.now();
};

MockClient.prototype.sendMessage =
MockClient.prototype.sendMessageToRoom = function() {
};

module.exports = MockRPC;
