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
        this._handlers[event].forEach(fn => fn.apply(null, args));
    }

    on (event, fn) {
        this.ensureValidEvent(event);
        this._handlers[event].push(fn);
    }

    ensureValidEvent(event) {
        if (!this._handlers[event]) {
            throw new Error(`Unsupported service event: ${event}`);
        }
    }

}

ServiceEvents.prototype.UPDATE = 'update';
ServiceEvents.prototype.CREATE = 'create';
ServiceEvents.prototype.DELETE = 'delete';

module.exports = new ServiceEvents();
