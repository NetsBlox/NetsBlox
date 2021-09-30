const createLogger = require('../procedures/utils/logger');
const IoTScapeServices = require('../procedures/iotscape/iotscape-services');
const IoTScape = require('../procedures/iotscape/iotscape');

/**
 * Represents a service created for a IoTScape device
 */
class DeviceService {
    constructor(record) {
        this._record = record;
        this.serviceName = record.name;
        this._logger = createLogger(this.serviceName);

        this.COMPATIBILITY = {};

        record.methods.forEach(method => {
            try {
                this._initializeRPC(method);
            } catch (err) {
                this._logger.error(`Unable to load ${record.name}.${method.name}: ${err.message}`);
            }
        });

        this._docs = {
            description: record.description,
            categories: [['Community', 'Device']],
            getDocFor: (method) => {
                let m = record.methods.find((val) => val.name == method);
                return {
                    name: m.name,
                    description: m.documentation,
                    args: m.arguments.map(argument => ({
                        name: argument.name,
                        optional: argument.optional,
                        type: argument.type
                    })),
                };
            }
        };
    }

    async _initializeRPC(methodSpec) {
        // Default methods have special implementations
        if(methodSpec.name === 'getDevices'){
            this[methodSpec.name] = async function() {
                return IoTScapeServices.getDevices(this.serviceName);
            };
        } else if(methodSpec.name === 'listen'){
            this[methodSpec.name] = async function() {
                return IoTScapeServices.listen(this.serviceName, this.socket, ...arguments);
            };
        } else if(methodSpec.name === 'send'){
            this[methodSpec.name] = async function() {
                return IoTScape.send(this.serviceName, arguments[0], arguments[1]);
            };
        } else if(methodSpec.name === 'getMessageTypes'){
            this[methodSpec.name] = async function() {
                return IoTScapeServices.getMessageTypes(this.serviceName);
            };
        } else if(methodSpec.name === 'getMethods'){
            this[methodSpec.name] = async function() {
                return IoTScapeServices.getMethods(this.serviceName);
            };
        } else {
            this[methodSpec.name] = async function() {
                return await IoTScape.send(this.serviceName, arguments[0], [methodSpec.name, arguments[1]].join(' '));
            };
        }
    }

    _getArgs(method) {
        return this._docs.getDocFor(method).args.map(info => info.name);
    }

    async onDelete() {
        
    }
}

module.exports = DeviceService;
