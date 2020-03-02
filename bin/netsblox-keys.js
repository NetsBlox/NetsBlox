#!/usr/bin/env node

require('epipebomb')();  // Allow piping to 'head'

const Storage = require('../src/server/storage/storage');
const ApiKeys = require('../src/server/services/api-keys');
const { runWithStorage } = require('./utils');

async function listKeys() {
    ApiKeys.init(Storage._db);
    const keys = await ApiKeys.all();
    keys.forEach(key => {
        /* eslint-disable no-console */
        console.log([key._id, key.owner, key.type, key.value].join('\t'));
        /* eslint-enable no-console */
    });
}

runWithStorage(listKeys);
