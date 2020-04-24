/* eslint-disable no-console*/
const storage = require('../../storage/storage');
const Auth = require('../core/auth');
const {RequestError} = require('../core/errors');

async function runWithStorage(fn, args) {
    let exitCode = 0;
    try {
        await storage.connect();
        await fn.apply(this, args);
    } catch (err) {
        exitCode = 1;
        if (err instanceof RequestError) {
            console.error(err.message);
        } else {
            console.error(err);
        }
    } finally {
        await storage.disconnect();
        process.exit(exitCode);
    }
}

async function initAndRun(fn, args) {
    Auth.disable();
    return await runWithStorage(fn, args);
}

/* eslint-enable no-console*/
module.exports = {
    runWithStorage,
    initAndRun,
};
