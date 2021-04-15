const jimp = require('jimp');
const logger = require('../utils/logger')('PhoneIoT-common');
const types = require('../../input-types');

const common = {};

common.dotProduct = function(a, b) {
    let total = 0;
    for (var i = 0; i < a.length; ++i) {
        total += a[i] * b[i];
    }
    return total;
}
common.magnitude = function(a) {
    return Math.sqrt(common.dotProduct(a, a));
}
common.scale = function(a, f) {
    return a.map(x => x * f);
}
common.normalize = function(a) {
    return common.scale(a, 1.0 / common.magnitude(a));
}
common.angle = function(a, b) {
    return Math.acos(common.dotProduct(a, b) / (common.magnitude(a) * common.magnitude(b)));
}

common.closestVector = function(val, def) {
    let best = [Infinity, undefined];
    for (const dir of def) {
        const t = common.angle(val, dir[0]);
        if (t < best[0]) best = [t, dir[1]];
    }
    return best[1];
}
common.closestScalar = function(val, def) {
    let best = [Infinity, undefined];
    for (const dir of def) {
        const t = Math.abs(val - dir[0]);
        if (t < best[0]) best = [t, dir[1]];
    }
    return best[1];
}

// parses a SalIO password and simplifies the error message (if any)
common.gracefulPasswordParse = function(password) {
    let res = undefined;
    try {
        res = BigInt('0x' + password);
        if (res < 0 || res > 0x7fffffffffffffffn) res = undefined;
    }
    catch (_) { }
    if (res === undefined) throw new Error('invalid password');
    return res;
}

// given some image source, attempts to convert it into a buffer for sending over UDP.
// if the image type is not recognized, throws an error.
common.prepImageToSend = async function(raw) {
    if (!raw) throw Error('input was not an image');

    let matches = raw.match(/^\s*\<costume .*image="data:image\/png;base64,([^"]+)".*\/\>\s*$/);
    if (matches) {
        const raw = Buffer.from(matches[1], 'base64');
        const temp = await jimp.read(raw);
        
        // change this to getBufferAsync when we update to a newer jimp
        const img = await new Promise((resolve, reject) => {
            temp.quality(80).background(0xffffffff).getBuffer(jimp.MIME_JPEG, (err, buffer) => {
                if (err) reject(err);
                else resolve(buffer);
            });
        });

        logger.log(`encoded image size: ${img.length}`);
        return img;
    }

    throw Error('unsupported image type');
};

function packXYZ(vals) { return { x: vals[0], y: vals[1], z: vals[2] }; };
function packXYZW(vals) { return { x: vals[0], y: vals[1], z: vals[2], w: vals[3] }; };
common.SENSOR_PACKERS = {
    'gravity': packXYZ,
    'gyroscope': packXYZ,
    'orientation': packXYZ,
    'accelerometer': packXYZ,
    'magneticField': packXYZ,
    'rotation': packXYZW,
    'linearAcceleration': packXYZ,
    'gameRotation': packXYZ,
    'lightLevel': vals => { return { value: vals[0] }; },
    'microphoneLevel': vals => { return { volume: vals[0] }; },
    'proximity': vals => { return { distance: vals[0] }; },
    'stepCount': vals => { return { count: vals[0] }; },
    'location': vals => { return { latitude: vals[0], longitude: vals[1], bearing: vals[2], altitude: vals[3] }; },
};

module.exports = common;