const jimp = require('jimp');
const logger = require('../utils/logger')('PhoneIoT-common');
const types = require('../../input-types');

const common = {};

common.DIRECTIONS_3D = [
    [[0, 0, 1], 'up'],
    [[0, 0, -1], 'down'],
    [[0, 1, 0], 'vertical'],
    [[0, -1, 0], 'upside down'],
    [[1, 0, 0], 'left'],
    [[-1, 0, 0], 'right'],
];
common.COMPASS_DIRECTIONS_4 = [
    [0, 'N'],
    [90, 'E'],
    [-90, 'W'],
    [180, 'S'],
    [-180, 'S'],
];
common.COMPASS_DIRECTIONS_8 = [
    [0, 'N'],
    [45, 'NE'],
    [-45, 'NW'],
    [90, 'E'],
    [-90, 'W'],
    [135, 'SE'],
    [-135, 'SW'],
    [180, 'S'],
    [-180, 'S'],
];

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

async function jimp_to_jpeg(img, quality) {
    // change this to getBufferAsync when we update to a newer jimp
    return await new Promise((resolve, reject) => {
        img.quality(quality).background(0xffffffff).getBuffer(jimp.MIME_JPEG, (err, buffer) => {
            if (err) reject(err);
            else resolve(buffer);
        });
    });
}

// given some image source, attempts to convert it into a buffer for sending over UDP.
// if the image type is not recognized, throws an error.
common.prepImageToSend = async function(raw) {
    if (!raw) throw Error('input was not an image');

    let matches = raw.match(/^\s*\<costume .*image="data:image\/png;base64,([^"]+)".*\/\>\s*$/);
    if (matches) {
        const raw = Buffer.from(matches[1], 'base64');
        const img = await jimp.read(raw);
        const [width, height] = [img.bitmap.width, img.bitmap.height];
        logger.log(`orig image size ${width}x${height}`);

        let scale = Math.min(200000 / (width * height), 1.0);
        let quality = 80;
        for (let attempt = 1; attempt <= 8; ++attempt) {
            const [new_width, new_height] = [ Math.round(width * scale), Math.round(height * scale) ];
            const res = await jimp_to_jpeg(img.resize(new_width, new_height), quality);
            logger.log(`attempt ${attempt}: resized to ${new_width}x${new_height} (byte size ${res.length})`);

            if (res.length <= 50000) { // if it fits in 50KB, we'll call it good
                logger.log(`resize success after ${attempt} attempts`);
                return res;
            }

            scale *= 0.9;   // repeat with smaller image and lower quality until success
            quality *= 0.9; // default scale/quality should work first try on most inputs
        }
        throw Error(`image scaling failure`);
    }

    throw Error('unsupported image type');
};

function packXYZ(vals) { return { x: vals[0], y: vals[1], z: vals[2] }; };
function packXYZW(vals) { return { x: vals[0], y: vals[1], z: vals[2], w: vals[3] }; };
function packAcceleration(vals) {
    const facingDir = common.closestVector(vals, common.DIRECTIONS_3D);
    return { x: vals[0], y: vals[1], z: vals[2], facingDir };
}
function packOrientation(vals) {
    const heading = vals[0];
    const dir = common.closestScalar(heading, common.COMPASS_DIRECTIONS_8);
    const cardinalDir = common.closestScalar(heading, common.COMPASS_DIRECTIONS_4);
    return { x: vals[0], y: vals[1], z: vals[2], heading, dir, cardinalDir };
}
common.SENSOR_PACKERS = {
    'gravity': packXYZ,
    'gyroscope': packXYZ,
    'orientation': packOrientation,
    'accelerometer': packAcceleration,
    'magneticField': packXYZ,
    'rotation': packXYZW,
    'linearAcceleration': packXYZ,
    'gameRotation': packXYZ,
    'lightLevel': vals => { return { value: vals[0] }; },
    'microphoneLevel': vals => { return { volume: vals[0] }; },
    'proximity': vals => { return { distance: vals[0] }; },
    'stepCount': vals => { return { count: vals[0] }; },
    // also send 'bearing' for backwards compat - now correctly called 'heading'
    'location': vals => { return { latitude: vals[0], longitude: vals[1], heading: vals[2], bearing: vals[2], altitude: vals[3] }; },
};
common.DEPRECATED_SENSORS = new Set([
    'rotation', 'gameRotation',
]);

module.exports = common;