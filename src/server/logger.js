'use strict';

const chalk = require('chalk'),
    moment = require('moment'),
    ColorHash = require('color-hash');

// NOP color option to use default
const nullcolor = (output) => output;

// Stores logging levels and associated output colors
const LEVELS = {
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

// Get format from env variable
const dateformat = process.env.DEBUG_DATE || 'MM.DD HH:mm:ss',
    useColors = (process.env.DEBUG_COLORS || true) == true;

// For hashing names to colors
const colorHash = new ColorHash({lightness: 0.75});

class Logger {
    /**
     * Create a new logger with a given namespace
     * @param {String} name Name/namespace for this Logger 
     */
    constructor(name) {
        this._name = name;

        if(this._shouldBeEnabled())
        {
            Object.keys(LEVELS).forEach(lvl => {
                this[lvl] = this._log.bind(this, lvl);
            });
        } else {
            Object.keys(LEVELS).forEach(lvl => {
                this[lvl] = this._nop;
            });
        }

        // Create color from string hash if available
        if(chalk.supportsColor.has256 === true){
            let hash = colorHash.hex(this._name);
            this._colorize = chalk.hex(hash);
        }
    }

    /**
     * Determine if this logger matches the requested filters.
     */
    _shouldBeEnabled() {
        // Allow skips
        if(Logger.skips.some((skip) => skip.test(this._name)))
        {
            return false;
        }
    
        // Allow whitelist
        if(Logger.names.length > 0){
            if(!Logger.names.some((name) => name.test(this._name)))
            {
                return false;
            }
        }

        return true;
    }

    /**
     * Used for loggers not actually sending messages out.
     * @param {String} message Message being ignored
     */
    _nop(message){
        return message;
    }

    /**
     * Prints a message to the correct stream based on logging level
     * @param {String} level Logging level for message
     * @param {String} content Message to print 
     */
    _log(level, content) {
        /* eslint-disable no-console*/
        // Determine which output to use
        let logFunc = STDERR.find(lvl => level === lvl)? console.error : console.log;
        logFunc = logFunc.bind(console);
        /* eslint-enable no-console*/
    
        // Prevent issues if no color available
        let tags = `${dateformat != ''? moment().format(dateformat) + ' ' : ''}${this._name}:${level}`;

        if(!useColors)
        {
            logFunc(tags + ' ' + content);
        }
        else if(chalk.supportsColor.has16m === true){
            // Color from hash of name
            logFunc(LEVELS[level].bg(LEVELS[level].fg(tags)) + ' ' + this._colorize(content));
        } else {
            // Default to only colors for labels
            logFunc(LEVELS[level].bg(LEVELS[level].fg(tags)) + ' ' + content);
        }
    }

    /**
     * Create a new logger at one level deeper in the same namespace
     * @param {String} name 
     */
    fork(name) {
        return new Logger([this._name, name].join(':'));
    }
}

// Inspired by debug package https://github.com/visionmedia/debug/
// Namespaces to require a match from 
Logger.names = [];
// Namespaces to hide if matching
Logger.skips = [];

// Get input from env variable
let namespaces = process.env.DEBUG || '';

let split = namespaces.split(/[\s,]+/);

// Set up filters 
split.forEach((s) => {
    if (s){
        namespaces = s.replace(/\*/g, '.*');

        if (namespaces[0] === '-') {
            Logger.skips.push(new RegExp('^' + namespaces.substr(1) + '$'));
        } else {
            Logger.names.push(new RegExp('^' + namespaces + '$'));
        }
    }
});

module.exports = Logger;
