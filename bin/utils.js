/* eslint-disable no-console*/
const Storage = require('../src/server/storage/storage'),
    Logger = require('../src/server/logger'),
    logger = new Logger('netsblox:cli'),
    storage = new Storage(logger);

async function runWithStorage(fn, args) {
    try {
        await storage.connect();
        await fn.apply(this, args);
    } catch (e) {
        console.error(e);
    } finally {
        await storage.disconnect();
    }
}

/* eslint-enable no-console*/
module.exports = {
    runWithStorage,
};
