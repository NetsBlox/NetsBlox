#! /usr/bin/env node
/* eslint-disable no-console */

const targetBackend = process.argv[2];

if (!targetBackend) {
    console.error('usage: node --expose_gc ./migrate-blob-backend.js <target-backend>');
    process.exit(1);
}

const currentBlob = require('../src/server/storage/blob');

const BlobStorage = require('../src/server/storage/blob/blob');
const newBlob = new BlobStorage(currentBlob.logger, targetBackend);

// Check if the blob is different...
if (newBlob.backendType === currentBlob.backendType) {
    console.error('current blob and target blob are the same. Exiting...');
    process.exit(1);
}

const Q = require('q');
const ProgressBar = require('progress');

currentBlob.list()
    .then(ids => {
        const bar = new ProgressBar('Migrating blob data: :percent complete', {total: ids.length});
        return ids.reduce((promise, id) => {
            return promise.then(() => currentBlob.get(id))
                .then(data => newBlob.store(data))  // Can I free 'data'?
                .then(() => {
                    if (global.gc) global.gc();
                    console.log('memory usage:', process.memoryUsage());
                    bar.tick();
                });
        }, Q());
    });
