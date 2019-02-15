'use strict';

const chalk = require('chalk');

// NOP color option to use default
const nullcolor = (output) => output;

const LEVELS = ['trace', 'info', 'log', 'debug', 'warn', 'error'],
    LEVELCOLORS = {
        'trace': {
            bg: nullcolor,
            fg: nullcolor
        }, 
        'info': {
            bg: nullcolor,
            fg: nullcolor
        },
        'log': {
            bg: nullcolor,
            fg: nullcolor
        },
        'debug': {
            bg: nullcolor,
            fg: nullcolor
        },
        'warn':  {
            bg: chalk.bgYellow,
            fg: chalk.black
        },
        'error': {
            bg: chalk.bgRed,
            fg: chalk.white
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
    if(Logger.skips.some((skip) => skip.test(this._name)))
    {
        return;
    }

    // Allow whitelist
    if(Logger.names.length > 0){
        
        if(!Logger.names.some((name) => name.test(this._name)))
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
    logFunc(LEVELCOLORS[level].bg(LEVELCOLORS[level].fg(`${Date.now()} ${this._name}:${level}`)) + ' ' + content);
};

Logger.prototype.fork = function(name) {
    return new Logger([this._name, name].join(':'));
};

// Inspired by debug package https://github.com/visionmedia/debug/
Logger.names = [];
Logger.skips = [];

// Get input from env variable
let namespaces = process.env.DEBUG || '';

let split = namespaces.split(/[\s,]+/);

// Set up filters 
split.forEach((s) => {
    if (s){
        namespaces = s.replace(/\*/g, '.*?');

        if (namespaces[0] === '-') {
            Logger.skips.push(new RegExp('^' + namespaces.substr(1) + '$'));
        } else {
            Logger.names.push(new RegExp('^' + namespaces + '$'));
        }
    }
});


module.exports = Logger;
