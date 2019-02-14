'use strict';

var levels = ['trace', 'info', 'log', 'debug', 'warn', 'error'],
    debug = require('debug');

// set which debug levels to send to stderr, the rest will go to stdout
const STDERR = ['warn', 'error'];

const consolelog = console.log.bind(console),
    consoleerror = console.error.bind(console);

var Logger = function(name) {
    this._name = name;
    /* eslint-disable no-console*/
    levels.forEach(lvl => {
        this[lvl] = debug(`${name}:${lvl}`); // WARN the debug functions won't go out of scope (debug.instances) on their own
        if (STDERR.find(item => item === lvl)) {
            this[lvl].log = consoleerror;
        } else { // send to stdout
            this[lvl].log = consolelog;
        }
    });
    /* eslint-enable no-console*/
};

Logger.prototype.fork = function(name) {
    return new Logger([this._name, name].join(':'));
};

Logger.prototype.destroy = function() {
    levels.forEach(lvl => {
        this[lvl].destroy();
    });
};

module.exports = Logger;
