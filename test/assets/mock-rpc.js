// I should probably rename this. This is a wrapper for testing the RPC's
'use strict';

// RPCs now contain the methods 
var Constants = require('../../src/common/constants'),
    getArgsFor = require('../../src/server/server-utils').getArgumentsFor,
    MockResponse = require('./mock-response'),
    _ = require('lodash');

var MockRPC = function(RPC, raw) {
    this._methods = [];
    this._rpc = typeof RPC === 'function' ? new RPC() : raw ? RPC : _.cloneDeep(RPC);
    this.createMethods(RPC);

    this.socket = new MockSocket();
    this.response = new MockResponse();
    this._rpc.socket = this.socket;
    this._rpc.response = this.response;
    this.rpcName = this._rpc.rpcName;
};

MockRPC.prototype.setRequester = function(uuid, username) {
    this.socket = new MockSocket();
    this._rpc.socket = this.socket;
    this.socket.uuid = uuid;
    this.socket.username = username;
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
    throw new Error(`${fnName} is not supported by the RPC!`);
};

MockRPC.prototype.addMethod = function(name) {
    this[name] = function() {
        const ctx = Object.create(this._rpc);
        ctx.socket = this.socket;
        ctx.response = this.response;
        return this._rpc[name].apply(ctx, arguments);
    };
};

var MockSocket = function() {
    this.reset();
};

MockSocket.prototype.send = function(msg) {
    this._messages.push(msg);
};

MockSocket.prototype.message = function(index) {
    if (index < 0) {
        return this._messages[this._messages+index];
    } else {
        return this._messages[index];
    }
};

MockSocket.prototype.messages = function() {
    return this._messages.slice();
};

MockSocket.prototype.reset = function() {
    this.role = 'newRole';
    this.uuid = 'someSocketUuid';

    this._messages = [];
    this._room = {
        sockets: () => []
    };
};

module.exports = MockRPC;
