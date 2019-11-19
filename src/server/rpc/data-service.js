const InputTypes = require('./input-types');
const createLogger = require('./procedures/utils/logger');

class DataService {
    constructor(record) {
        this.serviceName = record.name;
        this._logger = createLogger(this.serviceName);
        this._data = record.data;
        this._docs = new DataDocs(record);
        this.COMPATIBILITY = {};
        record.methods.forEach(method => {
            try {
                this._initializeRPC(method);
            } catch (err) {
                this._logger.error(`Unable to load ${record.name}.${method.name}`);
            }
        });
    }

    async _initializeRPC(method) {
        this._logger.info(`initializing ${method.name}`);
        const data = this._data.slice(1);  // skip headers
        const factory = await this._getFunctionForMethod(method, this._data);
        if (!factory) return;

        this[method.name] = async function() {
            const fn = factory();
            const args = Array.prototype.slice.call(arguments);
            args.push(data);

            return await fn.apply(this, args);
        };

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
        const combineArgCount = method.combine ? method.combine.arguments.length-1 : 0;

        let startIndex = 0;
        return [queryArgCount, transformArgCount, combineArgCount].map(count => {
            const args = Array.prototype.slice.call(allArgs, startIndex, startIndex + count);
            startIndex += count;
            return args;
        });
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

module.exports = DataService;
