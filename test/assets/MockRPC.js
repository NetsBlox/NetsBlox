// I should probably rename this. This is a wrapper for testing the RPC's
'use strict';

// RPCs now contain the methods 
var Constants = require('../../src/common/Constants');

var MockRPC = function(RPC) {
    this._rpc = new RPC();

    this.socket = new MockSocket();
    this.response = new MockResponse();
    this._rpc.socket = this.socket;
    this._rpc.response = this.response;

    this.createMethods(RPC);
};

MockRPC.prototype.createMethods = function(RPC) {
    var publicFns = Object.keys(RPC.prototype)
        .filter(name => name[0] !== '_')
        .filter(name => !Constants.RPC.RESERVED_FN_NAMES.includes(name));

    publicFns.forEach(method => {
        this.addMethod(method);
    });
};

MockRPC.prototype.addMethod = function(name) {
    this[name] = function() {
        return this._rpc[name].apply(this._rpc, arguments);
    };
};

var MockSocket = function(args) {
    this.roleId = 'newRole';

    this._room = {
        sockets: () => []
    };
};

var MockRequest = function(args) {
    args = args || {};
    this.query = {};
    for (var key in args) {
        this.query[key] = args[key];
    }

    this.netsbloxSocket = new MockSocket(args);
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
