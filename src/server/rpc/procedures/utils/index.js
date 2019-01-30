// a set of utilities to be used by rpcs
const Q = require('q');
const Projects = require('../../../storage/projects');

// sets up the headers and send an image
const sendImageBuffer = (response, imageBuffer, logger) => {
    if (imageBuffer.length < 1) throw 'empty image buffer';
    response.set('cache-control', 'private, no-store, max-age=0');
    response.set('content-type', 'image/png');
    response.set('content-length', imageBuffer.length);
    response.set('connection', 'close');
    response.status(200).send(imageBuffer);
    if (logger) logger.trace('sent the image');
};

const collectStream = (stream, logger) => {
    let deferred = Q.defer();
    var imageBuffer = new Buffer(0);
    stream.on('data', function(data) {
        imageBuffer = Buffer.concat([imageBuffer, data]);
    });
    stream.on('end', function() {
        deferred.resolve(imageBuffer);
    });
    stream.on('error', err => {
        deferred.reject(err);
        if (logger) logger.error('errored', err);
    });
    return deferred.promise;
};

// creates snap friendly structure out of an array ofsimple keyValue json object or just single on of them.
const jsonToSnapList = inputJson => {
    // if an string is passed check to see if it can be parsed to json
    if (typeof inputJson === 'string') {
        try {
            inputJson =  JSON.parse(inputJson);
        } catch (e) {
            return inputJson;
        }
    }

    // if it's not an obj(json or array)
    if (inputJson === null || inputJson === undefined) return undefined;
    if (typeof inputJson !== 'object') return inputJson;

    let keyVals = [];
    if (Array.isArray(inputJson)) {
        for (let i = 0; i < inputJson.length; i++) {
            keyVals.push(jsonToSnapList(inputJson[i]));
        }
    }else{
        const inputKeys = Object.keys(inputJson);
        for (let i = 0; i < inputKeys.length; i++) {
            let val = inputJson[inputKeys[i]];
            // convert date objects to an string representation
            if(val instanceof Date) val = val.toUTCString();
            keyVals.push([inputKeys[i], jsonToSnapList(val) ]);
        }
    }
    return keyVals;
};

// turns a tuple-like object into query friendly string
const encodeQueryData = tuple => {
    let ret = [];
    for (let d in tuple)
        ret.push(encodeURIComponent(d) + '=' + encodeURIComponent(tuple[d]));
    return ret.join('&');
};

const getRoleNames = (projectId, roleIds) => {
    roleIds = roleIds.filter(id => !!id);
    return Projects.getRawProjectById(projectId)
        .then(metadata => {
            if (!metadata) {
                throw new Error('Project not found');
            }

            try {
                return roleIds.map(id => metadata.roles[id].ProjectName);
            } catch (err) {
                throw new Error('Role not found');
            }
        });

};

const getRoleName = (projectId, roleId) => {
    return getRoleNames(projectId, [roleId])
        .then(names => names[0]);
};

const isValidServiceName = name => {
    return /^[a-z0-9-]+$/i.test(name);
};

module.exports = {
    getRoleNames,
    getRoleName,
    sendImageBuffer,
    encodeQueryData,
    collectStream,
    jsonToSnapList,
    isValidServiceName,
};
