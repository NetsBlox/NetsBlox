'use strict';

const chalk = require('chalk');

const LEVELS = ['trace', 'info', 'log', 'debug', 'warn', 'error'],
    LEVELCOLORS = {
        'trace': {
            bg: 'bgBlack',
            fg: 'white'
        }, 
        'info': {
            bg: 'bgBlack',
            fg: 'white'
        },
        'log': {
            bg: 'bgBlack',
            fg: 'white'
        },
        'debug': {
            bg: 'bgBlack',
            fg: 'white'
        },
        'warn':  {
            bg: 'bgYellow',
            fg: 'black'
        },
        'error': {
            bg: 'bgRed',
            fg: 'white'
        }
    };

// set which debug levels to send to stderr, the rest will go to stdout
const STDERR = ['warn', 'error'];

var Logger = function(name) {
    this._name = name;
    /* eslint-disable no-console*/
    LEVELS.forEach(lvl => {
        this[lvl] = this._log.bind(this, lvl);
    });
    /* eslint-enable no-console*/
};

Logger.prototype._log = function(level, content) {

    // Determine which output to use
    let logFunc = STDERR.find(lvl => level === lvl)? console.error : console.log;
    logFunc = logFunc.bind(console);

    // Prevent issues if no color available
    logFunc(chalk[LEVELCOLORS[level].bg](chalk[LEVELCOLORS[level].fg](`${this._name}:${level}`)) + " " + content);
};

Logger.prototype.fork = function(name) {
    return new Logger([this._name, name].join(':'));
};

module.exports = Logger;
