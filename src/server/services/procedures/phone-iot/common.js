const jimp = require('jimp');
const logger = require('../utils/logger')('PhoneIoT-common');

const utils = {};

utils.dotProduct = function(a, b) {
    let total = 0;
    for (var i = 0; i < a.length; ++i) {
        total += a[i] * b[i];
    }
    return total;
}
utils.magnitude = function(a) {
    return Math.sqrt(utils.dotProduct(a, a));
}
utils.scale = function(a, f) {
    return a.map(x => x * f);
}
utils.normalize = function(a) {
    return utils.scale(a, 1.0 / utils.magnitude(a));
}
utils.angle = function(a, b) {
    return Math.acos(utils.dotProduct(a, b) / (utils.magnitude(a) * utils.magnitude(b)));
}

utils.closestVector = function(val, def) {
    let best = [Infinity, undefined];
    for (const dir of def) {
        const t = utils.angle(val, dir[0]);
        if (t < best[0]) best = [t, dir[1]];
    }
    return best[1];
}
utils.closestScalar = function(val, def) {
    let best = [Infinity, undefined];
    for (const dir of def) {
        const t = Math.abs(val - dir[0]);
        if (t < best[0]) best = [t, dir[1]];
    }
    return best[1];
}

// parses a SalIO password and simplifies the error message (if any)
utils.gracefulPasswordParse = function(password) {
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
utils.prepImageToSend = async function(raw) {
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

utils.parseBool = function (val) {
    const lower = val.toLowerCase();
    if (lower === 'true' || lower === 'yes') return true;
    if (lower === 'false' || lower === 'no') return false;
    throw Error(`failed to parse bool: ${val}`);
};

// given an options dict and a rules dict, generates a sanitized options dict.
utils.parseOptions = function (opts, rules) {
    const res = {};
    for (const key in opts) {
        const value = opts[key];
        const rule = rules[key];
        if (rule === undefined) throw Error(`unknown option: ${key}`);
        res[key] = rule.parse(value);
    }
    for (const key in rules) {
        if (res[key] === undefined) res[key] = rules[key].default;
    }
    return res;
};

module.exports = utils;