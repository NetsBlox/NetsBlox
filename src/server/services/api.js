const express = require('express');
const Q = require('q');
const RemoteClient = require('./remote-client');
const Services = require('./services-worker');
const Logger = require('../logger');

class ServicesAPI {
    constructor() {
        this.router = this.createRouter();
        this.loading = Q.defer();

        this.logger = new Logger('netsblox:services');
        this.services = new Services(this.logger);
    }

    async initialize() {
        await this.services.initialize();
    }

    isServiceLoaded(name) {
        const service = this.services.metadata[name];
        return service && service.isSupported;
    }

    getServices() {
        return Object.values(this.services.metadata);
    }

    getServiceNameFromDeprecated(name) {
        return Object.entries(this.services.compatibility)
            .find(pair => {
                const [validName, info] = pair;
                if (info.path && info.path.toLowerCase() === name) {
                    return validName;
                }
            }) || [null];
    }

    getValidServiceName(name) {
        if (this.services.metadata[name]) {
            return name;
        }

        name = name.toLowerCase();
        const validNames = Object.keys(this.services.metadata);
        let validName = validNames
            .find(serviceName => serviceName.toLowerCase() === name);

        if (validName) {
            return validName;
        }

        return this.getServiceNameFromDeprecated(name);
    }

    getServiceMetadata(name) {
        const validName = this.getValidServiceName(name);
        if (validName) {
            return this.services.metadata[validName];
        }
    }

    getDeprecatedArgName(serviceName, rpcName) {
        const compat = this.services.compatibility[serviceName];

        if (compat) {
            return compat.arguments[rpcName];
        }

        return null;
    }

    createRouter() {
        const router = express.Router({mergeParams: true});

        router.route('/').get((req, res) => {
            const metadata = Object.entries(this.services.metadata)
                .filter(nameAndMetadata => nameAndMetadata[1].isSupported)
                .map(pair => {
                    const [name, metadata] = pair;
                    return {
                        name: name,
                        categories: metadata.categories
                    };
                });
            return res.send(metadata);
        });

        router.route('/:serviceName').get((req, res) => {
            const serviceName = this.getValidServiceName(req.params.serviceName);
            const service = this.services.metadata[serviceName];

            if (!service || !service.isSupported) {
                return res.status(404).send(`Service "${serviceName}" is not available.`);
            }

            return res.json(this.services.metadata[serviceName]);
        });

        router.route('/:serviceName/:rpcName').post((req, res) => {
            const {serviceName, rpcName} = req.params;
            const service = this.getServiceMetadata(serviceName);

            if (!service || !service.isSupported) {
                return res.status(404).send(`Service "${serviceName}" is not available.`);
            }

            if (!this.exists(serviceName, rpcName)) {
                this.logger.log(`Invalid RPC: ${serviceName}.${rpcName}`);
                return res.status(404).send('Invalid RPC');
            }

            return this.handleRPCRequest(serviceName, rpcName, req, res);
        });

        return router;
    }

    exists(serviceName, rpcName) {
        const service = this.services.metadata[serviceName];
        return service && !!service.rpcs[rpcName];
    }

    getArgumentNames(serviceName, rpcName) {
        const service = this.services.metadata[serviceName];
        return service.rpcs[rpcName].args.map(arg => arg.name);
    }

    handleRPCRequest(serviceName, rpcName, req, res) {
        const {projectId, roleId, uuid} = req.query;

        if(!uuid || !projectId) {
            return res.status(400).send('Project ID and client ID are required.');
        }

        const expectedArgs = this.getArgumentNames(serviceName, rpcName);
        this.logger.info(`Received request to ${serviceName} for ${rpcName} (from ${uuid})`);

        const ctx = {};
        ctx.response = res;
        ctx.request = req;
        ctx.caller = {
            username: req.session.username,
            projectId,
            roleId,
            clientId: uuid
        };
        ctx.socket = new RemoteClient(projectId, roleId, uuid);

        // Get the arguments
        const oldFieldNameFor = this.getDeprecatedArgName(serviceName, rpcName) || {};
        const args = expectedArgs.map(argName => {
            const oldName = oldFieldNameFor[argName];
            return req.body.hasOwnProperty(argName) ? req.body[argName] : req.body[oldName];
        });

        return this.services.invoke(ctx, serviceName, rpcName, args);
    }
}

module.exports = new ServicesAPI();
