// The RPC Manager manages the contexts of rooms handles rpcs
//
// It will need to load RPC's from the RPC directory and then mantain a separate
// RPC context for each room.

'use strict';

var fs = require('fs'),
    path = require('path'),
    _ = require('lodash'),
    express = require('express'),
    Logger = require('../logger'),
    PROCEDURES_DIR = path.join(__dirname,'procedures'),
    SocketManager = require('../socket-manager'),
    utils = require('../server-utils'),

    RESERVED_FN_NAMES = require('../../common/constants').RPC.RESERVED_FN_NAMES;

/**
 * RPCManager
 *
 * @constructor
 */
var RPCManager = function() {
    this._logger = new Logger('netsblox:rpc-manager');
    this.rpcRegistry = {};
    this.rpcs = this.loadRPCs();
    this.router = this.createRouter();

};

/**
 * Load all supported procedures from the local /procedures directory
 *
 * @return {Array<ProcedureConstructor>}
 */
RPCManager.prototype.loadRPCs = function() {
    // Load the rpcs from the __dirname+'/procedures' directory
    return fs.readdirSync(PROCEDURES_DIR)
        .map(name => path.join(PROCEDURES_DIR, name, name+'.js'))
        .filter(fs.existsSync.bind(fs))
        .map(fullPath => require(fullPath))
        .filter(rpc => !!rpc && !_.isEmpty(rpc))
        .map(RPCConstructor => {
            if (RPCConstructor.init) {
                RPCConstructor.init(this._logger);
            }

            // Register the rpc actions, method signatures
            this.registerRPC(RPCConstructor);

            return RPCConstructor;
        });
};

RPCManager.prototype.registerRPC = function(rpc) {
    var fnObj = rpc,
        rpcName = rpc.getPath(),
        fnNames;

    this.rpcRegistry[rpcName] = {};
    if (typeof rpc === 'function') {
        fnObj = rpc.prototype;
    }

    fnNames = Object.keys(fnObj)
        .filter(name => name[0] !== '_')
        .filter(name => !RESERVED_FN_NAMES.includes(name));

    for (var i = fnNames.length; i--;) {
        this.rpcRegistry[rpcName][fnNames[i]] = utils.getArgumentsFor(fnObj[fnNames[i]]);
    }
};

RPCManager.prototype.createRouter = function() {
    var router = express.Router({mergeParams: true});

    // Create the index for the rpcs
    router.route('/').get((req, res) => 
        res.json(this.rpcs.map(rpc => rpc.getPath())));

    this.rpcs
        .forEach(rpc => router.route(rpc.getPath())
            .get((req, res) => res.json(this.rpcRegistry[rpc.getPath()]))
        );

    // For each RPC, create the respective endpoints
    this.rpcs.forEach(this.addRoute.bind(this, router));

    return router;
};

RPCManager.prototype.addRoute = function(router, RPC) {
    this._logger.info('Adding route for '+RPC.getPath());
    router.route(RPC.getPath()+'/:action')
        .get(this.handleRPCRequest.bind(this, RPC));
};

/**
 * This retrieves the RPC instance for the given uuid. If the RPC is stateless
 * then all uuids share a single instance.
 *
 * @param {RPC|Constructor} RPC
 * @param {String} uuid
 * @return {RPC}
 */
RPCManager.prototype.getRPCInstance = function(RPC, uuid) {
    var socket,
        rpcs;

    if (RPC.isStateless) {
        return RPC;
    }

    // Look up the rpc context
    // socket -> active room -> rpc contexts
    socket = SocketManager.getSocket(uuid);
    if (!socket || !socket._room) {
        return null;
    }
    rpcs = socket._room.rpcs;

    // If the RPC hasn't been created for the given room, create one 
    if (!rpcs[RPC.getPath()]) {
        this._logger.info('Creating new RPC (' + RPC.getPath() +
            ') for ' + socket._room.uuid);
        rpcs[RPC.getPath()] = new RPC(socket._room.uuid);
    }
    return rpcs[RPC.getPath()];

};

RPCManager.prototype.handleRPCRequest = function(RPC, req, res) {
    var action,
        uuid = req.query.uuid,
        supportedActions = this.rpcRegistry[RPC.getPath()],
        compatDict = RPC.COMPATIBILITY || {},
        oldFieldNameFor,
        result,
        args,
        rpc;

    action = req.params.action;
    this._logger.info('Received request to '+RPC.getPath()+' for '+action+' (from '+uuid+')');

    // Then pass the call through
    if (supportedActions[action]) {
        rpc = this.getRPCInstance(RPC, uuid);
        if (rpc === null) {  // Could not create/find rpc (rpc is stateful and group is unknown)
            this._logger.log('Could not find group for user "'+req.query.uuid+'"');
            return res.status(401).send('ERROR: user not found. who are you?');
        }
        this._logger.log(`About to call ${RPC.getPath()}=>${action}`);

        // Add the netsblox socket for triggering network messages from an RPC
        rpc.socket = SocketManager.getSocket(uuid);
        rpc.response = res;
        if (!rpc.socket) {
            this._logger.error(`Could not find socket ${uuid} for rpc ` + 
                `${RPC.getPath()}:${action}. Will try to call it anyway...`);
        }

        // Get the arguments
        oldFieldNameFor = compatDict[action] || {};
        args = supportedActions[action].map(argName => {
            var oldName = oldFieldNameFor[argName];
            return req.query.hasOwnProperty(argName) ? req.query[argName] : req.query[oldName];
        });
        result = rpc[action].apply(rpc, args);

        this.sendRPCResult(res, result);
    } else {
        this._logger.log('Invalid action requested for '+RPC.getPath()+': '+action);
        return res.status(400).send('unrecognized action');
    }
};

RPCManager.prototype.sendRPCResult = function(response, result) {
    if (!response.headersSent && result !== null) {  // send the return value
        if (typeof result === 'object') {
            if (typeof result.then === 'function') {
                return result.then(result => this.sendRPCResult(response, result));
            } else {
                return response.json(result);
            }
        } else if (result !== undefined) {
            return response.send(result.toString());
        } else {
            return response.sendStatus(200);
        }
    }
};

RPCManager.prototype.isRPCLoaded = function(rpcPath) {
    return !!this.rpcRegistry[rpcPath] || this.rpcRegistry['/' + rpcPath];
};

module.exports = new RPCManager();
