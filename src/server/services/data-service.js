const _ = require('lodash');
const InputTypes = require('./input-types');
const createLogger = require('./procedures/utils/logger');
const CacheManager = require('cache-manager');
const fsStore = require('cache-manager-fs');
const {CACHE_DIR='cache'} = process.env;
const fs = require('fs');
const {promisify} = require('util');
const rm_rf = promisify(require('rimraf'));

class DataService {
    constructor(record, cache=true) {
        this.serviceName = record.name;
        this._logger = createLogger(this.serviceName);
        this._data = record.data;
        this._docs = new DataDocs(record);
        this.COMPATIBILITY = {};
        ensureExists(this._getCacheDir());
        record.methods.forEach(method => {
            try {
                this._initializeRPC(method, cache);
            } catch (err) {
                this._logger.error(`Unable to load ${record.name}.${method.name}: ${err.message}`);
            }
        });
    }

    _getCacheDir() {
        return `${CACHE_DIR}/Community/${this.serviceName}`;
    }

    async _initializeRPC(methodSpec, useCache) {
        const method = new DataServiceMethod(this._data, methodSpec);
        if (useCache) {
            const cache = CacheManager.caching({
                store: fsStore,
                options: {
                    ttl: 3600 * 24 * 14,
                    maxsize: 1024*1000,
                    path: `${this._getCacheDir()}/${methodSpec.name}`,
                    preventfill: false,
                    reviveBuffers: true
                }
            });

            this[methodSpec.name] = function() {
                const args = Array.prototype.slice.call(arguments);
                const id = args.join('|');

                return cache.wrap(
                    id,
                    async () => await method.invoke(...args)
                );
            };
        } else {
            this[methodSpec.name] = async function() {
                return await method.invoke(...arguments);
            };
        }
    }

    async _getFunctionForMethod(method, data) {
        if (method.code) {
            const fn = await InputTypes.parse.Function(method.code);
            return () => fn;
        } else if (method.query) {
            const queryFn = await InputTypes.parse.Function(method.query.code);
            const transformFn = method.transform ?
                await InputTypes.parse.Function(method.transform.code) : row => row;
            const combineFn = method.combine ?
                await InputTypes.parse.Function(method.combine.code) : (list, item) => list.concat([item]);

            return () => async function() {
                const [queryArgs, transformArgs, combineArgs] = this._getArgs(method, arguments);

                let results = [];
                for (let i = 1; i < data.length; i++) {
                    const args = queryArgs.slice();
                    const row = data[i];
                    args.push(row);
                    if (await queryFn.apply(null, args)) {
                        let args = transformArgs.slice();
                        args.push(row);
                        const value = await transformFn.apply(null, args);

                        args = combineArgs.slice();
                        args.push(results, value);

                        results = await combineFn.apply(null, args);
                    }
                }

                return results;
            };
        } else {
            this._logger.warn(`Malformed method ${method.name}. Needs "query" or "code"`);
        }
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

    async onDelete() {
        await rm_rf(this._getCacheDir());
    }
}

class DataDocs {
    constructor(record) {
        this.record = record;
        this.description = record.help;
        this.categories = [['Community', record.author]];
    }

    getDocFor(name) {
        const method = this.record.methods.find(method => method.name === name);
        if (method) {
            return {
                name,
                description: method.help,
                args: method.arguments.map(argument => ({
                    name: argument,
                    optional: false,
                })),
            };
        }
    }
}

class DataServiceMethod {
    constructor(data, spec) {
        this.data = data;
        this.spec = spec;
        this._compiled = null;
        const seconds = 1000;
        this.cacheTTL = 30*seconds;
        this.clearCacheID = null;
    }

    async invoke() {
        const factory = await this.func();
        const fn = factory();
        const data = this.data.slice(1);  // skip headers
        const args = Array.prototype.slice.call(arguments);
        args.push(data);

        return await fn.apply(this, args);
    }

    async func() {
        if (!this._compiled) {
            this._compiled = await this.compile();
            if (this.clearCacheID) {
                clearTimeout(this.clearCacheID);
            }
            this.clearCacheID = setTimeout(
                () => this.clearCache(),
                this.cacheTTL
            );
        }
        return this._compiled;
    }

    clearCache() {
        this.clearCacheID = null;
        this._compiled = null;
    }

    async compile(data=this.data, spec=this.spec) {
        if (spec.code) {
            const fn = await InputTypes.parse.Function(spec.code);
            return () => fn;
        } else if (spec.query) {
            const queryFn = await InputTypes.parse.Function(spec.query.code);
            const transformFn = spec.transform ?
                await InputTypes.parse.Function(spec.transform.code) : row => row;

            let combineFn, initialValue;
            if (spec.combine) {
                combineFn = await InputTypes.parse.Function(spec.combine.code);
                initialValue = spec.initialValue !== undefined ?
                    spec.initialValue : null;
            } else {
                combineFn = (list, item) => list.concat([item]);
                initialValue = [];
            }
            const hasInitialValue = initialValue !== null;

            return () => async function() {
                const [queryArgs, transformArgs, combineArgs] = this._getArgs(spec, arguments);
                const startIndex = hasInitialValue ? 1 : 2;
                let results;

                if (hasInitialValue) {
                    results = _.cloneDeep(initialValue);
                } else {
                    const args = queryArgs.slice();
                    const row = data[1];
                    args.push(row);
                    if (await queryFn.apply(null, args)) {
                        let args = transformArgs.slice();
                        args.push(row);
                        results = await transformFn.apply(null, args);
                    }
                }

                for (let i = startIndex; i < data.length; i++) {
                    const args = queryArgs.slice();
                    const row = data[i];
                    args.push(row);
                    if (await queryFn.apply(null, args)) {
                        let args = transformArgs.slice();
                        args.push(row);
                        const value = await transformFn.apply(null, args);

                        args = combineArgs.slice();
                        args.push(results, value);

                        results = await combineFn.apply(null, args);
                    }
                }

                return results;
            };
        }
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

const path = require('path');
function ensureExists(filepath) {
    const parentDir = path.dirname(filepath);
    if (parentDir !== filepath) {
        ensureExists(parentDir);
    }

    if (!fs.existsSync(filepath)) {
        fs.mkdirSync(filepath); 
    }
}

module.exports = DataService;
