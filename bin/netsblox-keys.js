#!/usr/bin/env node

require('epipebomb')();  // Allow piping to 'head'

const Storage = require('../src/server/storage/storage');
const ApiKeys = require('../src/server/services/api-keys');
const { runWithStorage } = require('./utils');

async function listKeys() {
    ApiKeys.init(Storage._db);
    const keys = await ApiKeys.all();
    keys.forEach(key => {
        console.log([key.username, key.name, key.value].join('\t'));
    });
}

runWithStorage(listKeys);
