'use strict';

const chalk = require('chalk'),
    moment = require('moment'),
    ColorHash = require('color-hash'),
    util = require('util');

// NOP color option to use default
const nullcolor = output => output;

// Stores logging levels and associated output colors
const LEVELS = {
    trace: {
        bg: nullcolor,
        fg: nullcolor
    },
    info: {
        bg: nullcolor,
        fg: nullcolor
    },
    log: {
        bg: nullcolor,
        fg: nullcolor
    },
    debug: {
        bg: nullcolor,
        fg: nullcolor
    },
    warn: {
        bg: chalk.bgYellow,
        fg: chalk.black
    },
    error: {
        bg: chalk.bgRed,
        fg: chalk.white
    }
};

// Set which debug levels to send to stderr, the rest will go to stdout
const STDERR = ['warn', 'error'];

// Strings to use for disabling date output
const disablestrings = ['none', 'off', 'disable', 'disabled'];

// Get format from env variable
var dateformat = process.env.DEBUG_DATE || 'MM.DD HH:mm:ss';
const useColors = (process.env.DEBUG_COLORS || true) == true;

// Disable date if requested
if (disablestrings.indexOf(dateformat.toLowerCase()) !== -1) {
    dateformat = '';
}

// For hashing names to colors
const colorHash = new ColorHash({ lightness: 0.75 });

// Options for utils.inspect
const inspectOptions = {
    colors: true
};

class Logger {
    /**
     * Create a new logger with a given namespace
     * @param {String} name Name/namespace for this Logger
     */
    constructor(name) {
        this._name = name;

        Object.keys(LEVELS).forEach(lvl => {
            if (this._shouldBeEnabled(lvl)) {
                this[lvl] = this._log.bind(this, lvl);
            } else {
                this[lvl] = this._nop;
            }
        });

        // Create color from string hash if available
        if (chalk.supportsColor.has256 === true) {
            let hash = colorHash.hex(this._name);
            this._colorize = chalk.hex(hash);
        }
    }

    /**
     * Determine if this logger matches the requested filters.
     * @param {String=} level Level of logging to check for filter match, undefined for no level.
     */
    _shouldBeEnabled(level = undefined) {
        let tempName = this._name;

        // Add logging level to name
        if (level !== undefined) {
            tempName += ':' + level;
        }

        // Allow skips
        if (Logger.skips.some(skip => skip.test(tempName))) {
            return false;
        }

        // Allow whitelist
        if (Logger.names.length > 0) {
            if (!Logger.names.some(name => name.test(tempName))) {
                return false;
            }
        }

        return true;
    }

    /**
     * Used for loggers not actually sending messages out.
     * @param {String} message Message being ignored
     */
    _nop(message) {
        return message;
    }

    /**
     * Prints a message to the correct stream based on logging level
     * @param {String} level Logging level for message
     * @param {String} content Message to print
     */
    _log(level, ...content) {
        // Format content
        content = content
            .map(item => {
                if (typeof item == 'string') {
                    return item;
                } else {
                    return util.inspect(item, inspectOptions);
                }
            })
            .join(' ');

        content = content.split('\n');

        /* eslint-disable no-console*/
        // Determine which output to use
        let logFunc = STDERR.find(lvl => level === lvl)
            ? console.error
            : console.log;
        logFunc = logFunc.bind(console);
        /* eslint-enable no-console*/

        // Prevent issues if no color available
        let tags = `${
            dateformat != '' ? moment().format(dateformat) + ' ' : ''
        }${this._name}:${level}`;

        content.forEach((line, idx) => {
            // Mark multi-line
            if (content.length == 1) {
                line = '> ' + line;
            } else {
                if (idx == 0) {
                    line = 'v ' + line;
                } else if (idx == content.length - 1) {
                    line = '^ ' + line;
                } else {
                    line = '| ' + line;
                }
            }

            if (!useColors) {
                logFunc(tags + ' ' + line);
            } else if (chalk.supportsColor.has256 === true) {
                // Color from hash of name
                logFunc(
                    LEVELS[level].bg(LEVELS[level].fg(tags)) +
                        ' ' +
                        this._colorize(line)
                );
            } else {
                // Default to only colors for labels
                logFunc(LEVELS[level].bg(LEVELS[level].fg(tags)) + ' ' + line);
            }
        });
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
split.forEach(s => {
    if (s) {
        namespaces = s.replace(/\*/g, '.*?');

        if (namespaces[0] === '-') {
            Logger.skips.push(new RegExp('^' + namespaces.substr(1) + '$'));
        } else {
            Logger.names.push(new RegExp('^' + namespaces + '$'));
        }
    }
});

module.exports = Logger;
