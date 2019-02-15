// The RPC Manager manages the contexts of rooms handles rpcs
//
// It will need to load RPC's from the RPC directory and then mantain a separate
// RPC context for each room.

var fs = require('fs'),
    path = require('path'),
    _ = require('lodash'),
    express = require('express'),
    Logger = require('../logger'),
    PROCEDURES_DIR = path.join(__dirname,'procedures'),
    NetworkTopology = require('../network-topology'),
    utils = require('../server-utils'),
    JsonToSnapList = require('./procedures/utils').jsonToSnapList ,
    Docs = require('./jsdoc-extractor.js').Docs,
    types = require('./input-types.js'),
    RESERVED_FN_NAMES = require('../../common/constants').RPC.RESERVED_FN_NAMES;

const DEFAULT_COMPATIBILITY = {arguments: {}};
/**
 * RPCManager
 *
 * @constructor
 */
var RPCManager = function() {
    this._logger = new Logger('netsblox:services');
    this.rpcRegistry = {};
    this._rpcInstances = {};
    this.rpcs = this.loadRPCs();
    this.router = this.createRouter();
    this.checkStaleServices();
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
        .map(pair => [pair[0], pair[1], require(pair[1])])  // name, path, module
        .filter(pair => {
            let [name, /*path*/, service] = pair;
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
            let [name, path, RPCConstructor] = pair;

            RPCConstructor._docs = new Docs(path);
            if (RPCConstructor.init) {
                RPCConstructor.init(this._logger);
            }

            // Register the rpc actions, method signatures
            RPCConstructor.serviceName = RPCConstructor.serviceName ||
                name.split('-').map(w => w[0].toUpperCase() + w.slice(1)).join('');

            RPCConstructor.COMPATIBILITY = RPCConstructor.COMPATIBILITY || {};
            _.merge(RPCConstructor.COMPATIBILITY, DEFAULT_COMPATIBILITY);

            if (typeof RPCConstructor === 'function') {
                RPCConstructor.prototype._docs = RPCConstructor._docs;
                RPCConstructor.prototype.serviceName = RPCConstructor.serviceName;
                RPCConstructor.prototype.COMPATIBILITY = RPCConstructor.COMPATIBILITY;
            }

            this.registerRPC(RPCConstructor);

            return RPCConstructor;
        });
};

RPCManager.prototype.registerRPC = function(rpc) {
    var fnObj = rpc,
        name = rpc.serviceName,
        fnNames;

    this.rpcRegistry[name] = {};
    this.rpcRegistry[name]._docs = rpc._docs;
    if (typeof rpc === 'function') {
        fnObj = rpc.prototype;
    }

    fnNames = Object.keys(fnObj)
        .filter(name => name[0] !== '_')
        .filter(name => !RESERVED_FN_NAMES.includes(name));

    for (var i = fnNames.length; i--;) {
        let args;
        // find the associated doc
        let doc = rpc._docs.getDocFor(fnNames[i]);
        // get the argument names ( starting from doc )
        if (doc) {
            args = doc.args.map(arg => arg.name);
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

    function createServiceMetadata(rpc) {
        let methods = this.rpcRegistry[rpc.serviceName];
        let serviceDoc = {rpcs:{}}; // stores info about service's methods
        let deprecatedMethods = rpc.COMPATIBILITY.deprecatedMethods || [];
        Object.keys(methods)
            .filter(key => !key.startsWith('_'))
            .forEach(name => {
                let info; // a single rpc info
                if (rpc._docs && rpc._docs.getDocFor(name)) {
                    info = rpc._docs.getDocFor(name);
                } else {
                    // if the method has no docs build up sth similar
                    info = {
                        args: methods[name].map(argName => {
                            return {name: argName};
                        }),
                    };
                }
                delete info.name;
                info.deprecated = info.deprecated || deprecatedMethods.includes(name);

                serviceDoc.rpcs[name] = info;
            });

        if (rpc._docs) {
            serviceDoc.description = rpc._docs.description;
        }
        return serviceDoc;
    }

    this.rpcs.forEach(rpc => {
        router.route('/' + rpc.serviceName)
            .get((req, res) => res.json(createServiceMetadata.call(this, rpc)));

        if (rpc.COMPATIBILITY.path) {
            router.route('/' + rpc.COMPATIBILITY.path)
                .get((req, res) => res.json(createServiceMetadata.call(this, rpc)));
        }
    });

    // For each RPC, create the respective endpoints
    this.rpcs.forEach(this.addRoute.bind(this, router));

    return router;
};

RPCManager.prototype.addRoute = function(router, RPC) {
    this._logger.info(`Adding route for ${RPC.serviceName}`);
    router.route(`/${RPC.serviceName}/:action`)
        .post(this.handleRPCRequest.bind(this, RPC));

    if (RPC.COMPATIBILITY.path) {
        router.route(`/${RPC.COMPATIBILITY.path}/:action`)
            .post(this.handleRPCRequest.bind(this, RPC));
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
RPCManager.prototype.getRPCInstance = function(name, projectId) {
    const RPC = this.rpcs.find(rpc => rpc.serviceName === name);

    if (typeof RPC !== 'function') {  // stateless rpc
        return RPC;
    }

    // Look up the rpc context
    if (!this._rpcInstances[projectId]) {
        this._rpcInstances[projectId] = {};
    }
    const projectRPCs = this._rpcInstances[projectId];

    // If the RPC hasn't been created for the given room, create one
    if (!projectRPCs[RPC.serviceName]) {
        this._logger.info(`Creating new RPC (${RPC.serviceName}) for ${projectId}`);
        projectRPCs[RPC.serviceName] = new RPC(projectId);
    }

    projectRPCs.lastInvocationTime = new Date();
    return projectRPCs[RPC.serviceName];
};

RPCManager.prototype.getArgumentsFor = function(service, action) {
    return this.rpcRegistry[service] && this.rpcRegistry[service][action];
};

RPCManager.prototype.handleRPCRequest = function(RPC, req, res) {
    const uuid = req.query.uuid;
    const projectId = req.query.projectId;
    const roleId = req.query.roleId;
    const action = req.params.action;

    if(!uuid || !projectId) {
        return res.status(400).send('Project ID and client ID are required.');
    }

    const expectedArgs = this.getArgumentsFor(RPC.serviceName, action);
    this._logger.info(`Received request to ${RPC.serviceName} for ${action} (from ${uuid})`);

    // Then pass the call through
    if (expectedArgs) {
        const rpc = this.getRPCInstance(RPC.serviceName, projectId);

        // Add the netsblox socket for triggering network messages from an RPC
        let ctx = Object.create(rpc);
        ctx.socket = NetworkTopology.getSocket(uuid);
        if (!ctx.socket) {
            this._logger.warn(`Calling ${RPC.serviceName}.${action} with disconnected websocket: ${uuid} (${projectId})`);
        }

        ctx.response = res;
        ctx.request = req;
        ctx.caller = {
            username: req.session.username,
            projectId,
            roleId,
            clientId: uuid
        };

        // Get the arguments
        const oldFieldNameFor = RPC.COMPATIBILITY.arguments[action] || {};
        const args = expectedArgs.map(argName => {
            var oldName = oldFieldNameFor[argName];
            return req.body.hasOwnProperty(argName) ? req.body[argName] : req.body[oldName];
        });

        // validate and enforce types in RPC manager.
        // parse the inputs to correct types
        // provide feedback to the user
        return this.callRPC(action, ctx, args);
    } else {
        this._logger.log(`Invalid RPC:${RPC.serviceName}.${action}`);
        return res.status(400).send('Invalid RPC');
    }
};

RPCManager.prototype.callRPC = function(name, ctx, args) {
    let doc = null;
    let prepareInputs = Promise.resolve();
    const errors = [];

    if (ctx._docs) doc = ctx._docs.getDocFor(name);
    if (doc) {
        // assuming doc params are defined in order!
        prepareInputs = Promise.all(doc.args.map((arg, idx) => {
            if (arg.type) {
                //let input = this.parseArgValue(arg, args[idx], ctx);
                return this.parseArgValue(arg, args[idx], ctx)
                    .then(input => {
                        // if there was no errors update the arg with the parsed input
                        if (input.isValid) {
                            args[idx] = input.value;
                        } else {
                            // handle the error
                            this._logger.warn(`${ctx.serviceName} -> ${name} input error:`, input.msg);
                            if (input.msg) errors.push(input.msg);
                        }
                    });
            }
        }));
    }

    return prepareInputs
        .then(() => {
            // provide user feedback if there was an error
            if (errors.length > 0) return ctx.response.status(500).send(errors.join('\n'));

            let prettyArgs = JSON.stringify(args);
            prettyArgs = prettyArgs.substring(1, prettyArgs.length-1);  // remove brackets
            this._logger.log(`calling ${ctx.serviceName}.${name}(${prettyArgs}) ${ctx.caller.clientId}`);

            try {
                const result = ctx[name].apply(ctx, args);
                return this.sendRPCResult(ctx.response, result);
            } catch (err) {
                this.sendRPCError(ctx.response, err);
            }
        });
};

// in: arg obj and input value
// out: {isValid: boolean, value, msg}
RPCManager.prototype.parseArgValue = function (arg, input, ctx) {
    const inputStatus = {isValid: true, msg: '', value: input};

    // is the argument provided or not?
    if (input === '') {
        if (!arg.optional) {
            inputStatus.msg = `${arg.name} is required.`;
            inputStatus.isValid = false;
            inputStatus.value = undefined;
        }
    } else if (arg.type) {
        const typeName = arg.type.name;
        const recordError = err => {
            inputStatus.isValid = false;
            const netsbloxType = types.getNBType(typeName);
            inputStatus.msg = `"${arg.name}" is not a valid ${netsbloxType}.`;
            if (err.message.includes(netsbloxType)) {
                inputStatus.msg = `"${arg.name}" is not valid. ` + err.message;
            } else if (err.message) {
                inputStatus.msg += ' ' + err.message;
            }
        };

        if (types.parse.hasOwnProperty(typeName)) { // if we have the type handler
            try {
                const args = [input].concat(arg.type.params);
                args.push(ctx);
                return Promise.resolve(types.parse[typeName].apply(null, args))
                    .then(value => {
                        inputStatus.value = value;
                        return inputStatus;
                    })
                    .catch(e => {
                        recordError(e);
                        return inputStatus;
                    });
            } catch (e) {
                recordError(e);
            }
        }
    }
    return Promise.resolve(inputStatus);
};

RPCManager.prototype.sendRPCResult = function(response, result) {
    if (!response.headersSent && result !== null) {  // send the return value
        if (typeof result === 'object') {
            if (typeof result.then === 'function') {
                return result
                    .then(result => this.sendRPCResult(response, result))
                    .catch(err => this.sendRPCError(response, err));
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

RPCManager.prototype.sendRPCError = function(response, error) {
    const isIntentionalError = err => err.name === 'Error';
    if (isIntentionalError(error)) {
        // less descriptive logs and send the error message to the user
        this._logger.warn(`Error caught: ${error.message}`);
        if (response.headersSent) return;
        response.status(500).send(error.message);
    } else {
        // more verbose logs. hide the error message from user (generic error)
        this._logger.error('Uncaught exception:', error);
        if (response.headersSent) return;
        response.status(500).send('something went wrong');
    }
};

RPCManager.prototype.isRPCLoaded = function(rpcPath) {
    return !!this.rpcRegistry[rpcPath] || this.rpcRegistry['/' + rpcPath];
};

RPCManager.prototype.checkStaleServices = function() {
    const minutes = 60*1000;
    this.removeStaleRPCInstances();
    setTimeout(() => this.checkStaleServices(), 10*minutes);
};

RPCManager.prototype.removeStaleRPCInstances = function() {
    const MAX_STALE_TIME = 12*60*60*1000;  // consider services stale after 12 hours
    const projectIds = Object.keys(this._rpcInstances);
    const now = new Date();

    projectIds.forEach(projectId => {
        const projectRPCs = this._rpcInstances[projectId];
        const sinceLastInvocation = now - projectRPCs.lastInvocationTime;
        if (sinceLastInvocation > MAX_STALE_TIME) {
            this._logger.trace(`Removing stale service instances for ${projectId}`);
            delete this._rpcInstances[projectId];
        }
    });
};

module.exports = new RPCManager();
