// I should probably rename this. This is a wrapper for testing the RPC's
'use strict';

var MockRPC = function(RPC) {
    this._rpc = new RPC();
    this.createMethods(RPC);
};

MockRPC.prototype.createMethods = function(RPC) {
    RPC.getActions().forEach(method => {
        console.log('adding method:', method);
        this.addMethod(method);
    });
};

MockRPC.prototype.addMethod = function(name) {
    this[name] = function(args) {
        var req = new MockRequest(args),
            res = new MockResponse();

        console.log('calling ' + name);
        this._rpc[name](req, res);
        return res;
    };
};

var MockSocket = function(args) {
    this.roleId = args.roleId || 'newRole';

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

module.exports = MockRPC;
