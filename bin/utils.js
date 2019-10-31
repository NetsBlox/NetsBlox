/* eslint-disable no-console*/
const storage = require('../src/server/storage/storage');

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
