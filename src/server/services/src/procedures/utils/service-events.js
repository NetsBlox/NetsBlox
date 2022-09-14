const {defer} = require('../../utils');

class ServiceEvents {
    constructor() {
        const events = [
            this.UPDATE,
            this.CREATE,
            this.DELETE
        ];
        this._handlers = {};
        events.forEach(event => this._handlers[event] = []);
    }

    emit (event) {
        const args = Array.prototype.slice.call(arguments, 1);
        this.ensureValidEvent(event);
        return this._handlers[event].map(fn => fn.apply(null, args));
    }

    on (event, fn) {
        this.ensureValidEvent(event);
        this._handlers[event].push(fn);
    }

    off (event, fn) {
        this._handlers[event] = this._handlers[event].filter(handler => handler !== fn);
    }

    once (event, fn) {
        const deferred = defer();
        const callback = (...args) => {
            fn(...args);
            this.off(event, callback);
            deferred.resolve();
        };
        this.on(event, callback);
        return deferred.promise;
    }

    ensureValidEvent(event) {
        if (!this._handlers[event]) {
            throw new Error(`Unsupported service event: ${event}`);
        }
    }

    new() {
        return new ServiceEvents();
    }
}

ServiceEvents.prototype.UPDATE = 'update';
ServiceEvents.prototype.CREATE = 'create';
ServiceEvents.prototype.DELETE = 'delete';

module.exports = new ServiceEvents();
