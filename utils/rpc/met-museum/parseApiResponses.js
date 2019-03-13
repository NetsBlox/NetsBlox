#!/bin/env node

const fse = require('fse');
const path = require('path');
const mongoose = require('mongoose');
const MetObject = require('../../../src/server/rpc/procedures/met-museum/database');


const RESPONSES_DIR = 'metmuseumImages';

const listSavedResponses = async () => {
    let files = await fse.readdir(RESPONSES_DIR);
    return files.filter(f => f.startsWith('responses'));
};

async function load() {
    let validResps = [];
    const failedResps = [];

    let files = await listSavedResponses();
    let promises = files.map(async f => {
        let responses = JSON.parse(await fse.readFile(path.join(RESPONSES_DIR, f)));
        let successes = responses.filter(r => typeof r.resp !== 'string').map(s => s.resp);
        let fails = responses.filter(r => typeof r.resp === 'string');
        console.log(`valid resp: ${successes.length}/${responses.length}` );
        validResps.push(...successes);
        failedResps.push(...fails);
    });
    await Promise.all(promises);
    console.log(validResps.length);
    console.log(failedResps.length);
    return [validResps, failedResps];
}

// OPT duplicates the objects with correct attrs
function changeAttrCase(metObj) {
    const changedObj = {};
    Object.keys(metObj).forEach(attr => {
        if (attr === 'objectID') {
            changedObj['Object ID'] = metObj[attr];
            return;
        }
        let newAttr = attr // insert a space before all caps
            .replace(/([A-Z])/g, ' $1')
            // uppercase the first character
            .replace(/^./, function(str){ return str.toUpperCase(); });
        changedObj[newAttr] = metObj[attr];
    });
    return changedObj;
}

async function updateMetObject(r) {
    let id = r['Object ID'];
    console.log('updating.. ', id);
    try {
        await MetObject.updateOne({'Object ID': id}, {'Primary Image': r['Primary Image'], 'Additional Images': r['Additional Images']});
    } catch (e) {
        console.error(e);
    }
}

async function start() {
    let [validResps, failedResps] = await load();
    validResps = validResps.map(obj => changeAttrCase(obj));

    console.log(validResps.length);
    console.log(failedResps.length);

    for (let r of validResps) {
        await updateMetObject(r);
    }

    // needs batching
    // await Promise.all(validResps.map(r => updateMetObject(r)));

    console.log('done');
}


start().then(() => mongoose.disconnect());
