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
    JsonToSnapList = require('./procedures/utils').jsonToSnapList ,
    jsdocExtractor = require('./jsdoc-extractor.js'),
    RESERVED_FN_NAMES = require('../../common/constants').RPC.RESERVED_FN_NAMES;

const DEFAULT_COMPATIBILITY = {arguments: {}};
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
        .map(name => [name, path.join(PROCEDURES_DIR, name, name+'.js')])
        .filter(pair => fs.existsSync(pair[1]))
        .map(pair => {
            let service = require(pair[1]);
            service._docs = jsdocExtractor.parse(pair[1]);
            return [pair[0], service];
        })
        .filter(pair => {
            let [name, service] = pair;
            if (typeof service === 'function' || !!service && !_.isEmpty(service)) {
                if(service.isSupported && !service.isSupported()){
                    /* eslint-disable no-console*/
                    console.error(`${name} is not supported in this deployment. Skipping...`);
                    /* eslint-enable no-console*/
                    return false;
                }
                return true;
            }
            return false;
        })
        .map(pair => {
            let [name, RPCConstructor] = pair;
            if (RPCConstructor.init) {
                RPCConstructor.init(this._logger);
            }

            // Register the rpc actions, method signatures
            RPCConstructor.serviceName = RPCConstructor.serviceName ||
                name.split('-').map(w => w[0].toUpperCase() + w.slice(1)).join('');

            RPCConstructor.COMPATIBILITY = RPCConstructor.COMPATIBILITY || {};
            _.merge(RPCConstructor.COMPATIBILITY, DEFAULT_COMPATIBILITY);

            this.registerRPC(RPCConstructor);

            return RPCConstructor;
        });
};

RPCManager.prototype.registerRPC = function(rpc) {
    var fnObj = rpc,
        name = rpc.serviceName,
        fnNames;

    this.rpcRegistry[name] = {};
    if (typeof rpc === 'function') {
        fnObj = rpc.prototype;
    }

    fnNames = Object.keys(fnObj)
        .filter(name => name[0] !== '_')
        .filter(name => !RESERVED_FN_NAMES.includes(name));

    for (var i = fnNames.length; i--;) {
        let args;
        // find the associated doc
        let doc = rpc._docs.find(doc => doc.fnName === fnNames[i]);
        // get the argument names ( starting from doc )
        if (doc) {
            args = doc.parsed.tags
                .filter(tag => tag.title === 'param')
                .map(tag => tag.name);
        }else{
            args = utils.getArgumentsFor(fnObj[fnNames[i]]);
        }
        this.rpcRegistry[name][fnNames[i]] = args;
    }
};

RPCManager.prototype.createRouter = function() {
    var router = express.Router({mergeParams: true});
    const ALL_RPC_NAMES = this.rpcs.map(rpc => rpc.serviceName).sort();

    // Create the index for the rpcs
    router.route('/').get((req, res) => res.send(ALL_RPC_NAMES));

    function tagWithCompatibility(rpc) {
        let methods = this.rpcRegistry[rpc.serviceName];
        methods._compability = rpc.COMPATIBILITY;
        return methods;
    }

    this.rpcs.forEach(rpc => {
        router.route('/' + rpc.serviceName)
            .get((req, res) => res.json(tagWithCompatibility.call(this, rpc)));

        if (rpc.COMPATIBILITY.path) {
            router.route('/' + rpc.COMPATIBILITY.path)
                .get((req, res) => res.json(tagWithCompatibility.call(this, rpc)));
        }
    });

    // For each RPC, create the respective endpoints
    this.rpcs.forEach(this.addRoute.bind(this, router));

    return router;
};

RPCManager.prototype.addRoute = function(router, RPC) {
    this._logger.info('Adding route for '+RPC.serviceName);
    router.route('/' + RPC.serviceName + '/:action')
        .get(this.handleRPCRequest.bind(this, RPC));

    if (RPC.COMPATIBILITY.path) {
        router.route('/' + RPC.COMPATIBILITY.path + '/:action')
            .get(this.handleRPCRequest.bind(this, RPC));
    }
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

    if (typeof RPC !== 'function') {  // stateless rpc
        return RPC;
    }

    // Look up the rpc context
    // socket -> active room -> rpc contexts
    socket = SocketManager.getSocket(uuid);
    if (!socket || !socket._room) {
        return null;
    }
    const room = socket._room;
    rpcs = room.rpcs;

    // If the RPC hasn't been created for the given room, create one
    if (!rpcs[RPC.serviceName]) {
        this._logger.info(`Creating new RPC (${RPC.serviceName}) for ${room.uuid}`);
        rpcs[RPC.serviceName] = new RPC(room.uuid);
    }

    return rpcs[RPC.serviceName];

};

RPCManager.prototype.handleRPCRequest = function(RPC, req, res) {
    var action,
        uuid = req.query.uuid,
        supportedActions = this.rpcRegistry[RPC.serviceName],
        oldFieldNameFor,
        result,
        args,
        rpc;

    action = req.params.action;
    this._logger.info(`Received request to ${RPC.serviceName} for ${action} (from ${uuid})`);

    // Then pass the call through
    if (supportedActions[action]) {
        rpc = this.getRPCInstance(RPC, uuid);
        if (rpc === null) {  // Could not create/find rpc (rpc is stateful and group is unknown)
            this._logger.log('Could not find group for user "'+req.query.uuid+'"');
            return res.status(401).send('ERROR: user not found. who are you?');
        }

        // Add the netsblox socket for triggering network messages from an RPC
        let ctx = Object.create(rpc);
        ctx.socket = SocketManager.getSocket(uuid);
        ctx.response = res;
        if (!ctx.socket) {
            this._logger.error(`Could not find socket ${uuid} for rpc ` +
                `${RPC.serviceName}:${action}. Will try to call it anyway...`);
        }

        // Get the arguments
        oldFieldNameFor = RPC.COMPATIBILITY.arguments[action] || {};
        args = supportedActions[action].map(argName => {
            var oldName = oldFieldNameFor[argName];
            return req.query.hasOwnProperty(argName) ? req.query[argName] : req.query[oldName];
        });
        let prettyArgs = JSON.stringify(args);
        prettyArgs = prettyArgs.substring(1, prettyArgs.length-1);  // remove brackets
        this._logger.log(`calling ${RPC.serviceName}.${action}(${prettyArgs})`);
        result = ctx[action].apply(ctx, args);

        this.sendRPCResult(res, result);

        return result;
    } else {
        this._logger.log('Invalid action requested for '+RPC.serviceName+': '+action);
        return res.status(400).send('unrecognized action');
    }
};

RPCManager.prototype.sendRPCResult = function(response, result) {
    if (!response.headersSent && result !== null) {  // send the return value
        if (typeof result === 'object') {
            if (typeof result.then === 'function') {
                return result
                    .then(result => this.sendRPCResult(response, result))
                    .catch(err => {
                        this._logger.error(`Uncaught exception: ${err.toString()}`);
                        response.status(500).send('Error occurred!');
                    });
            } else if (Array.isArray(result)) {
                return response.json(result);
            } else {  // arbitrary JSON
                return response.json(JsonToSnapList(result));
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
