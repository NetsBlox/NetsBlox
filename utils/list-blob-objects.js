#! /usr/bin/env node
/* eslint-disable no-console */

const currentBlob = require('../src/server/storage/blob');

const Q = require('q');

currentBlob.list()
    .then(ids => ids.forEach(id => console.log(id)));
