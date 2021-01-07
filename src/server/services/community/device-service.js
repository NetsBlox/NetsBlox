const _ = require('lodash');
const InputTypes = require('../input-types');
const createLogger = require('../procedures/utils/logger');
const CacheManager = require('cache-manager');
const fsStore = require('cache-manager-fs');
const fs = require('fs');
const {promisify} = require('util');
const rm_rf = promisify(require('rimraf'));

class DeviceService {

    constructor(record, cache=true) {
        this.serviceName = record.name;
        this._logger = createLogger(this.serviceName);

        this.COMPATIBILITY = {};

        record.methods.forEach(method => {
            try {
                this._initializeRPC(method, cache);
            } catch (err) {
                this._logger.error(`Unable to load ${record.name}.${method.name}: ${err.message}`);
            }
        });

        this._docs = {
            description: 'help',
            categories: [['Community', 'Device']],
            getDocFor: (method) => {
                let m = record.methods.find((val) => val.name == method);
                return {
                    name: m.name,
                    description: 'help',
                    args: m.arguments.map(argument => ({
                        name: argument.name,
                        optional: argument.optional,
                    })),
                };
            }
        };
    }

    async _initializeRPC(methodSpec) {
        const method = new DeviceServiceMethod(methodSpec);
        this[methodSpec.name] = async function() {
            return await method.invoke(...arguments);
        };
    }

    async _getFunctionForMethod(method, data) {
        return () => async function() {
            const args = this._getArgs(method, arguments);

            return 1;
        };
    }

    _getArgs(method) {
        return this._docs.getDocFor(method).args.map(info => info.name);
    }

    async onDelete() {
        
    }
}

class DeviceServiceMethod {
    constructor(spec) {
        this.spec = spec;
    }

    async invoke() {
        return await 1;
    }

    _getArgs(method, allArgs) {
        const queryArgCount = method.query.arguments.length-1;
        const transformArgCount = method.transform ? method.transform.arguments.length-1 : 0;
        const combineArgCount = method.combine ? method.combine.arguments.length - 2 : 0;

        let startIndex = 0;
        return [queryArgCount, transformArgCount, combineArgCount].map(count => {
            const args = Array.prototype.slice.call(allArgs, startIndex, startIndex + count);
            startIndex += count;
            return args;
        });
    }
}

module.exports = DeviceService;
