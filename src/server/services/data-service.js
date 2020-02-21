const InputTypes = require('./input-types');
const createLogger = require('./procedures/utils/logger');
const CacheManager = require('cache-manager');
const fsStore = require('cache-manager-fs');
const {CACHE_DIR='cache'} = process.env;
const fs = require('fs');
const {promisify} = require('util');
const rm_rf = promisify(require('rimraf'));

class DataService {
    constructor(record) {
        this.serviceName = record.name;
        this._logger = createLogger(this.serviceName);
        this._data = record.data;
        this._docs = new DataDocs(record);
        this.COMPATIBILITY = {};
        ensureExists(this._getCacheDir());
        record.methods.forEach(method => {
            try {
                this._initializeRPC(method);
            } catch (err) {
                this._logger.error(`Unable to load ${record.name}.${method.name}: ${err.message}`);
            }
        });
    }

    _getCacheDir() {
        return `${CACHE_DIR}/Community/${this.serviceName}`;
    }

    async _initializeRPC(method) {
        this._logger.info(`initializing ${method.name}`);
        this[method.name] = () => this._methodLoading(method.name);

        const data = this._data.slice(1);  // skip headers
        const factory = await this._getFunctionForMethod(method, this._data);
        if (!factory) return;

        const cache = CacheManager.caching({
            store: fsStore,
            options: {
                ttl: 3600 * 24 * 14,
                maxsize: 1024*1000,
                path: `${this._getCacheDir()}/${method.name}`,
                preventfill: false,
                reviveBuffers: true
            }
        });

        this[method.name] = async function() {
            const args = Array.prototype.slice.call(arguments);
            const id = args.join('|');

            return cache.wrap(
                id,
                async () => {
                    const fn = factory();
                    args.push(data);

                    return await fn.apply(this, args);
                },
            );
        };

    }

    _methodLoading(name) {
        throw new Error(`RPC "${name}" not yet ready. Please retry.`);
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
