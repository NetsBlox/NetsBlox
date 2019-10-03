const blocks2js = require('./blocks2js');
const createLogger = require('./procedures/utils/logger');

class DataService {
    constructor(record) {
        this.serviceName = record.name;
        this._logger = createLogger(this.serviceName);
        this._data = record.data;
        this._docs = new DataDocs(record);
        this.COMPATIBILITY = {};
        record.methods.forEach(method => this._initializeRPC(method));
    }

    _initializeRPC(method) {
        this._logger.info(`initializing ${method.name}`);
        const data = this._data.slice(1);  // skip headers
        const factory = this._getFunctionForMethod(method, this._data);
        if (!factory) return;

        this[method.name] = async function() {
            const fn = factory();
            const args = Array.prototype.slice.call(arguments);
            args.push(data);

            return await fn.apply(null, args);
        };

    }

    _getFunctionForMethod(method, data) {
        if (method.code) {
            const factory = blocks2js.compile(method.code);
            const env = blocks2js.newContext();
            return () => factory(env);
        } else if (method.query) {
            const queryArgCount = method.query.arguments.length-1;

            const factory = blocks2js.compile(method.query.code);
            const env = blocks2js.newContext();

            let getTransformFn = () => row => row;
            let transformArgCount = 0;
            if (method.transform) {
                getTransformFn = blocks2js.compile(method.transform.code);
                transformArgCount = method.transform.arguments.length-1;
            }

            return () => async function() {
                const queryFn = factory(env);
                const queryArgs = Array.prototype.slice.call(arguments, 0, queryArgCount);
                const transformArgs = Array.prototype.slice.call(arguments, queryArgCount, queryArgCount + transformArgCount);
                const transformFn = getTransformFn(env);
                const results = [];
                for (let i = 0; i < data.length; i++) {
                    const args = queryArgs.slice();
                    const row = data[i];
                    args.push(row);
                    if (await queryFn.apply(null, args)) {
                        const args = transformArgs.slice();
                        args.push(row);
                        results.push(await transformFn.apply(null, args));
                    }
                }
                return results;
            };
        } else {
            this._logger.warn(`Malformed method ${method.name}. Needs "query" or "code"`);
        }
    }
}

class DataDocs {
    constructor(record) {
        this.record = record;
        this.description = record.help;
        this.categories = ['Community'];
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

module.exports = DataService;
