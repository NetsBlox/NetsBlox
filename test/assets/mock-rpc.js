// I should probably rename this. This is a wrapper for testing the RPC's
'use strict';

// RPCs now contain the methods 
var Constants = require('../../src/common/constants'),
    getArgsFor = require('../../src/server/server-utils').getArgumentsFor,
    _ = require('lodash');

var MockRPC = function(RPC) {
    this._methods = [];
    this._rpc = typeof RPC === 'function' ? new RPC() : _.cloneDeep(RPC);
    this.createMethods(RPC);

    this.socket = new MockSocket();
    this.response = new MockResponse();
    this._rpc.socket = this.socket;
    this._rpc.response = this.response;

    this.getPath  = () => RPC.getPath();
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
        return this._rpc[name].apply(this._rpc, arguments);
    };
};

var MockSocket = function() {
    this.roleId = 'newRole';
    this.uuid = 'someSocketUuid';

    this._room = {
        sockets: () => []
    };
};

var MockResponse = function() {
    this.code = null;
    this.response = null;
};

MockResponse.prototype.status = function(code) {
    this.code = code;
    return this;
};

MockResponse.prototype.send = function(text) {
    this.response = text;
    return this;
};

MockResponse.prototype.json = MockResponse.prototype.send;

module.exports = MockRPC;
