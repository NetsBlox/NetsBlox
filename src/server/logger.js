'use strict';

var levels = ['trace', 'info', 'log', 'debug', 'warn', 'error'],
    debug = require('debug');

// set which debug levels to send to stderr, the rest will go to stdout
const STDERR = ['warn', 'error'];

var Logger = function(name) {
    this._name = name;
    /* eslint-disable no-console*/
    levels.forEach(lvl => {
        this[lvl] = debug(`${name}:${lvl}`);
        if (STDERR.find(item => item === lvl)) {
            this[lvl].log = console.error.bind(console);
        } else { // send to stdout
            this[lvl].log = console.log.bind(console);
        }
    });
    /* eslint-enable no-console*/
};

Logger.prototype.fork = function(name) {
    return new Logger([this._name, name].join(':'));
};

module.exports = Logger;
