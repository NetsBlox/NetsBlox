// I should probably rename this. This is a wrapper for testing services
'use strict';

const Constants = require('../../src/common/constants');
const getArgsFor = require('../../src/server/server-utils').getArgumentsFor;
const MockResponse = require('./mock-response');
const _ = require('lodash');
const utils = require('./utils');
const NetworkTopology = utils.reqSrc('network-topology');
const Logger = utils.reqSrc('logger');
let logger;

class MockRPC {
    constructor (Service) {
        this._methods = [];
        this._service = typeof Service === 'function' ?
            new Service() : _.cloneDeep(Service);
        this.createMethods(Service);

        logger = new Logger('netsblox:test:services');
        this.getNewSocket();
        this.response = new MockResponse();
        this.request = new MockRequest();

        this.serviceName = this._service.serviceName;
    }

    getNewSocket () {
        this.socket = new MockClient();
        this.unwrap().socket = this.socket;
        NetworkTopology.onConnect(this.socket);
    }

    setRequester (uuid, username) {
        this.getNewSocket();

        this.socket.uuid = uuid || this.socket.uuid;
        if (this.socket.uuid[0] !== '_') {
            this.socket.uuid = '_' + this.socket.uuid;
        }

        this.socket.username = username;
        this.socket.loggedIn = !!username;
    }

    createMethods (Service) {
        var fnObj = typeof Service === 'function' ? Service.prototype : Service,
            publicFns = Object.keys(fnObj)
                .filter(name => name[0] !== '_')
                .filter(name => !Constants.RPC.RESERVED_FN_NAMES.includes(name));

        publicFns.forEach(method => {
            this._methods.push(method);
            this.addMethod(method);
        });
    }

    getArgumentsFor (fnName) {
        if (this._methods.includes(fnName)) {
            return getArgsFor(this._service[fnName]);
        }
        throw new Error(`${fnName} is not supported by the Service!`);
    }

    addMethod (name) {
        this[name] = function() {
            const ctx = Object.create(this._service);
            ctx.socket = this.socket;
            ctx.response = this.response;
            ctx.request = this.request;
            ctx.caller = {
                roleId: this.socket.roleId,
                clientId: this.socket.uuid,
                username: this.socket.username,
                projectId: this.socket.projectId || 'testProject'
            };
            ctx.apiKey = this.apiKey;
            const args = JSON.stringify(Array.prototype.slice.call(arguments));
            const id = ctx.caller.clientId || 'new client';
            logger.trace(`${id} is calling ${name}(${args.substring(1, args.length-1)})`);
            return this._service[name].apply(ctx, arguments);
        };
    }

    unwrap () {
        return this._service;
    }
}

class MockRequest {
    constructor () {
        this._events = {};
    }

    abort () {
        if (this._events.close) {
            this._events.close();
        }
    }

    on (event, fn) {
        if (event === 'close') {
            this._events.close = fn;
        } else {
            throw new Error('Unrecognized event listener:', event);
        }
    }
}

class MockClient {
    constructor() {
        this.roleId = 'myRole-' + Date.now();
        this.uuid = 'uuid-' + Date.now();
    }
}

MockClient.prototype.sendMessage =
MockClient.prototype.sendMessageToRoom = function() {
};

module.exports = MockRPC;
