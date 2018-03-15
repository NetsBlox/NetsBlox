#! /usr/bin/env node
/* eslint-disable no-console */

const currentBlob = require('../src/server/storage/blob');

currentBlob.list()
    .then(ids => ids.forEach(id => console.log(id)));
