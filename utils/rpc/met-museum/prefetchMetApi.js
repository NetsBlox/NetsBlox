#!/bin/env node

// this scripts crawls the museum api end point slowly to fetch the image links for public items

const mongoose = require('mongoose');
const fse = require('fse');
const axios = require('axios');

// we should get the model through mongoose.model
const MetModel = require('../../../src/server/rpc/procedures/met-museum/database');

const sleep = time => {
    return new Promise(resolve => setTimeout(resolve, time));
};


const start = async () => {
    let publicItemCount = await MetModel.find({'Is Public Domain': 'True'}).countDocuments();

    // load all the record ids
    let recIds = await MetModel.find({'Is Public Domain': 'True'}, {'Object ID': 1, '_id': 0});
    recIds = recIds.map(res => parseInt(res['Object ID']));
    recIds.sort((a,b) => a<b ? -1 : 1);

    console.assert(publicItemCount === recIds.length);

    const PER_MIN = 50; // rate
    let delayPerCall = 60/PER_MIN*1000; // in ms

    let limit = 500; // batch size
    let skip = 172000;

    console.log(`starting requests at ${skip} out of ${publicItemCount} items`);
    while (skip < publicItemCount) {
        let batchOfIds = recIds.slice(skip, skip+limit);

        let responses = [];
        for (let id of batchOfIds) {
            console.log('requesting', id);
            try {
                const { data: resp } = await axios.get(`https://collectionapi.metmuseum.org/public/collection/v1/objects/${id}`, {timeout: 3000});
                responses.push({id, resp});
            } catch (e) {
                responses.push({id, resp: 'failed'});
                console.error('failed', id, e);
            }
            await sleep(delayPerCall);
        }
        console.log('dumping to disk', skip, limit);
        await fse.writeFile(`responses-${skip}-${limit}`, JSON.stringify(responses));

        // move the skip by a block
        skip += limit;
    }
};

start()
    .then(() => mongoose.disconnect());
