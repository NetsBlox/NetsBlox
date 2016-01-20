// The RPC Manager manages the contexts of rooms handles rpcs
//
// It will need to load RPC's from the RPC directory and then mantain a separate
// RPC context for each room.

'use strict';

var fs = require('fs'),
    path = require('path'),
    express = require('express'),
    PROCEDURES_DIR = path.join(__dirname,'procedures');

/**
 * RPCManager
 *
 * @constructor
 */
var RPCManager = function(logger, socketManager) {
    this._logger = logger.fork('RPCManager');
    this.rpcs = RPCManager.loadRPCs();
    this.router = this.createRouter();

    // The RPCManager contains groups with the same ids as those owned by the 
    // communication manager. In this object, they contain the RPC's owned by
    // the active table.
    this.socketManager = socketManager;
};

/**
 * Load all supported procedures from the local /procedures directory
 *
 * @return {Array<ProcedureConstructor>}
 */
RPCManager.loadRPCs = function() {
    // Load the rpcs from the __dirname+'/procedures' directory
    return fs.readdirSync(PROCEDURES_DIR)
        .map(function(name) {
            return path.join(PROCEDURES_DIR, name, name+'.js');
        })
        .filter(fs.existsSync.bind(fs))
        .map(function(fullPath) {
            var RPCConstructor = require(fullPath);
            return RPCConstructor;
        });
};

RPCManager.prototype.createRouter = function() {
    var router = express.Router({mergeParams: true});

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
    // socket -> active table -> rpc contexts
    socket = this.socketManager.sockets[uuid];
    if (!socket || !socket._table) {
        return null;
    }
    rpcs = socket._table.rpcs;

    // If the RPC hasn't been created for the given room, create one 
    if (!rpcs[RPC.getPath()]) {
        this._logger.info('Creating new RPC (' + RPC.getPath() +
            ') for ' + socket._table.uuid);
        rpcs[RPC.getPath()] = new RPC();
    }
    return rpcs[RPC.getPath()];

};

RPCManager.prototype.handleRPCRequest = function(RPC, req, res) {
    var action,
        uuid = req.query.uuid,
        rpc;

    action = req.params.action;
    this._logger.info('Received request to '+RPC.getPath()+' for '+action+' (from '+uuid+')');

    // Then pass the call through
    if (RPC.getActions().indexOf(action) !== -1) {
        rpc = this.getRPCInstance(RPC, uuid);
        if (rpc === null) {  // Could not create/find rpc (rpc is stateful and group is unknown)
            this._logger.log('Could not find group for user "'+req.query.uuid+'"');
            return res.status(401).send('ERROR: user not found. who are you?');
        }
        console.log('About to call '+RPC.getPath()+'=>'+action);

        // Add the netsblox socket for triggering network messages from an RPC
        req.netsbloxSocket = this.socketManager.sockets[uuid];

        return rpc[action](req, res);
    } else {
        this._logger.log('Invalid action requested for '+RPC.getPath()+': '+action);
        return res.status(400).send('unrecognized action');
    }
};

module.exports = RPCManager;
