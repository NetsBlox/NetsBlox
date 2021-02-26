/*
 * This is a logger for use when the developer doesn't have access to the
 * console logs from the instance. The motivating example for this was the development
 * of the Alexa service.
 */
const path = require('path');
const os = require('os');
const fsp = require('fs').promises;

class DevLogger {
    constructor() {
        this.filename = path.join(os.tmpdir(), 'netsblox-debug-logs.txt');
    }

    async log(message) {
        await fsp.appendFile(this.filename, message + '\n');
    }

    async read() {
        try {
            return await fsp.readFile(this.filename, 'utf8');
        } catch (err) {
            return '';
        }
    }

    async clear() {
        await fsp.unlink(this.filename);
    }
}

module.exports = new DevLogger();
