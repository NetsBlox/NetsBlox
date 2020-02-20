// The RPC Manager manages the contexts of rooms handles rpcs
//
// It will need to load RPC's from the RPC directory and then mantain a separate
// RPC context for each room.

var fs = require('fs'),
    path = require('path'),
    utils = require('../server-utils'),
    JsonToSnapList = require('./procedures/utils').jsonToSnapList,
    types = require('./input-types.js');

const {Docs} = require('./jsdoc-extractor.js');
const {RESERVED_FN_NAMES} = require('../../common/constants').RPC;
const ServerStorage = require('../storage/storage');
const ServiceEvents = require('./procedures/utils/service-events');
const Storage = require('./storage');
const DataService = require('./data-service');
const DEFAULT_COMPATIBILITY = {arguments: {}};
const isProduction = process.env.ENV === 'production';
//const Message = require('./worker-messages');

class ServicesWorker {
    constructor(logger) {
        this._logger = logger.fork('worker');
        this.rpcRegistry = {};
        this.metadata = {};
        this.compatibility = {};
        this._rpcInstances = {};
        ServiceEvents.on(ServiceEvents.UPDATE, this.onUpdateService.bind(this));
        ServiceEvents.on(ServiceEvents.DELETE, this.onDeleteService.bind(this));
    }

    async onUpdateService(name) {
        await this.onDeleteService(name);
        await ServerStorage.onConnected;
        const DataServices = Storage.createCollection('netsblox:services:community');
        const serviceData = await DataServices.findOne({name});
        const service = new DataService(serviceData);
        this.registerRPC(service);
    }

    async onDeleteService(serviceName) {
        const service = this.rpcRegistry[serviceName];
        if (service) {
            await service.onDelete();
        }

        delete this.rpcRegistry[serviceName];
        delete this.metadata[serviceName];
        return !!service;
    }

    async initialize() {
        await this.loadRPCs();
        this.checkStaleServices();
    }

    async loadRPCs() {
        const DBServices = await this.loadRPCsFromDatabase();
        this.loadRPCsFromFS().concat(DBServices)
            .forEach(service => this.registerRPC(service));
    }

    loadRPCsFromFS() {
        const PROCEDURES_DIR = path.join(__dirname, 'procedures');
        return fs.readdirSync(PROCEDURES_DIR)
            .map(name => [name, path.join(PROCEDURES_DIR, name, name+'.js')])
            .filter(pair => fs.existsSync(pair[1]))
            .map(pair => [pair[0], pair[1], require(pair[1])])  // name, path, module
            .map(pair => {
                let [name, path, service] = pair;

                service._docs = new Docs(path);
                if (service.init) {
                    service.init(this._logger);
                }

                // Register the rpc actions, method signatures
                if (service.serviceName) {
                    if (this.validateCustomServiceName(name, service.serviceName)) {
                        this._logger.error(`\nInvalid service name for ${name}: ${service.serviceName}. \n\nSee https://github.com/NetsBlox/NetsBlox/wiki/Best-Practices-for-NetsBlox-Services#naming-conventions for more information.\n`);
                        process.exit(1);
                    }
                } else {
                    service.serviceName = this.getDefaultServiceName(name);
                }

                if(service.isSupported && !service.isSupported()){
                    /* eslint-disable no-console*/
                    console.error(`${service.serviceName} is not supported in this deployment.`);
                    /* eslint-enable no-console*/
                } else if (isProduction && !service._docs.isEnabledInProduction()) {
                    /* eslint-disable no-console*/
                    console.error(`${service.serviceName} is not supported in production.`);
                    /* eslint-enable no-console*/
                    service.isSupported = () => false;
                }

                return service;
            });
    }

    async loadRPCsFromDatabase() {
        await ServerStorage.onConnected;
        const DataServices = Storage.createCollection('netsblox:services:community');
        const serviceData = await DataServices.find({}).toArray();
        const services = serviceData
            .map(serviceInfo => new DataService(serviceInfo));

        return services;
    }

    getDefaultServiceName(name) {
        return name.split('-')
            .map(w => w[0].toUpperCase() + w.slice(1))
            .join('');
    }

    validateCustomServiceName(name, serviceName) {
        return serviceName.toLowerCase() !== this.getDefaultServiceName(name).toLowerCase();
    }

    registerRPC(rpc) {
        rpc.COMPATIBILITY = rpc.COMPATIBILITY || {};
        Object.assign(rpc.COMPATIBILITY, DEFAULT_COMPATIBILITY);

        if (typeof rpc === 'function') {
            rpc.prototype._docs = rpc._docs;
            rpc.prototype.serviceName = rpc.serviceName;
            rpc.prototype.COMPATIBILITY = rpc.COMPATIBILITY;
        }

        const name = rpc.serviceName;

        rpc.isSupported = rpc.isSupported || (() => true);
        this.rpcRegistry[name] = rpc;
        this.metadata[name] = this.createServiceMetadata(rpc);
        this.compatibility[name] = rpc.COMPATIBILITY;
    }

    getServices() {
        return Object.values(this.rpcRegistry);
    }

    createServiceMetadata(service) {
        let serviceDoc = {rpcs:{}}; // stores info about service's methods
        let deprecatedMethods = service.COMPATIBILITY.deprecatedMethods || [];

        this.getMethodsFor(service.serviceName)
            .forEach(name => {
                let info;
                if (service._docs.getDocFor(name)) {
                    info = service._docs.getDocFor(name);
                } else {
                    // if the method has no docs build up sth similar
                    const argNames = this.getArgumentsFor(service.serviceName, name);
                    info = {
                        args: argNames.map(argName => ({name: argName}))
                    };
                }
                delete info.name;
                info.deprecated = info.deprecated || deprecatedMethods.includes(name);
                serviceDoc.rpcs[name] = info;
            });

        serviceDoc.description = service._docs.description;
        serviceDoc.categories = service._docs.categories;
        return serviceDoc;
    }

    invoke(context, serviceName, rpcName, args) {
        const rpc = this.getServiceInstance(serviceName, context.projectId);
        const ctx = Object.create(rpc);
        Object.assign(ctx, context);
        return this.callRPC(rpcName, ctx, args);
    }

    getServiceInstance(name, projectId) {
        const RPC = this.getServices().find(rpc => rpc.serviceName === name);

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
    }

    getMethodsFor(serviceName) {
        const service = this.rpcRegistry[serviceName];
        if (!service) {
            throw new Error(`Service not found: ${serviceName}`);
        }

        let fnObj = service;
        if (typeof service === 'function') {
            fnObj = service.prototype;
        }

        return Object.keys(fnObj)
            .filter(name => name[0] !== '_')
            .filter(name => !RESERVED_FN_NAMES.includes(name));
    }

    getArgumentsFor(serviceName, action) {
        const service = this.rpcRegistry[serviceName];
        if (!service) {
            throw new Error(`Service not found: ${serviceName}`);
        }

        const doc = service._docs.getDocFor(action);
        if (doc) {
            return doc.args.map(arg => arg.name);
        } else {
            let fnObj = service;
            if (typeof service === 'function') {
                fnObj = service.prototype;
            }
            return fnObj[action] && utils.getArgumentsFor(fnObj[action]);
        }
    }

    async callRPC(name, ctx, args) {
        let doc = null;
        const errors = [];

        if (ctx._docs) doc = ctx._docs.getDocFor(name);
        if (doc) {
            // assuming doc params are defined in order!
            await Promise.all(doc.args.map(async (arg, idx) => {
                const input = await this.parseArgValue(arg, args[idx], ctx);
                // if there was no errors update the arg with the parsed input
                if (input.isValid) {
                    args[idx] = input.value;
                } else {
                    // handle the error
                    this._logger.warn(`${ctx.serviceName} -> ${name} input error:`, input.msg);
                    if (input.msg) errors.push(input.msg);
                }
            }));
        }

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
    }

    // in: arg obj and input value
    // out: {isValid: boolean, value, msg}
    parseArgValue(arg, input, ctx) {
        const inputStatus = {isValid: true, msg: '', value: input};
        const isArgumentProvided = input !== '';

        if (!isArgumentProvided) {
            inputStatus.value = undefined;
            if (!arg.optional) {
                inputStatus.msg = `${arg.name} is required.`;
                inputStatus.isValid = false;
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
    }

    sendRPCResult(response, result) {
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
    }

    sendRPCError(response, error) {
        const isIntentionalError = err => err.name === 'Error';
        if (!isIntentionalError(error)) {
            this._logger.error('Uncaught exception:', error);
        }
        if (response.headersSent) return;
        response.status(500).send(error.message);
    }

    isServiceLoaded(serviceName) {
        return this.rpcRegistry[serviceName] && this.rpcRegistry[serviceName].isSupported();
    }

    getApiKey(serviceName) {
        const service = this.getServiceInstance(serviceName);
        return service.apiKey;
    }

    checkStaleServices() {
        const minutes = 60*1000;
        this.removeStaleRPCInstances();
        setTimeout(() => this.checkStaleServices(), 10*minutes);
    }

    removeStaleRPCInstances() {
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
    }
}

module.exports = ServicesWorker;
