'use strict';

var levels = ['trace', 'info', 'log', 'debug', 'warn', 'error'],
    debug = require('debug');

var Logger = function(name) {
    this._name = name;
    levels.forEach(lvl => this[lvl] = debug(`${name}:${lvl}`));
};

Logger.prototype.fork = function(name) {
    return new Logger([this._name, name].join(':'));
};

module.exports = Logger;
