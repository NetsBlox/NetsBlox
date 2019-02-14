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
    LEVELS.forEach(lvl => {
        this[lvl] = this._log.bind(this, lvl);
    });
};

Logger.prototype._log = function(level, content) {

    // Allow skips
    if(Logger.prototype.skips.some((skip) => skip.test(this._name)))
    {
        return;
    }

    // Allow whitelist
    if(Logger.prototype.names.length > 0){
        
        if(!Logger.prototype.names.some((name) => name.test(this._name)))
        {
            return;
        }
    }

    /* eslint-disable no-console*/
    // Determine which output to use
    let logFunc = STDERR.find(lvl => level === lvl)? console.error : console.log;
    logFunc = logFunc.bind(console);
    /* eslint-enable no-console*/

    // Prevent issues if no color available
    logFunc(chalk[LEVELCOLORS[level].bg](chalk[LEVELCOLORS[level].fg](`${Date.now()} ${this._name}:${level}`)) + " " + content);
};

Logger.prototype.fork = function(name) {
    return new Logger([this._name, name].join(':'));
};

// Inspired by debug package https://github.com/visionmedia/debug/
Logger.prototype.names = [];
Logger.prototype.skips = [];

// Get input from env variable
let namespaces = process.env.DEBUG || '';

let split = namespaces.split(/[\s,]+/);

// Set up filters 
split.forEach((s) => {
    if (s){
        namespaces = s.replace(/\*/g, '.*?');

        if (namespaces[0] === '-') {
            Logger.prototype.skips.push(new RegExp('^' + namespaces.substr(1) + '$'));
        } else {
            Logger.prototype.names.push(new RegExp('^' + namespaces + '$'));
        }
    }
});


module.exports = Logger;
