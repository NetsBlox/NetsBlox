const sharp = require('sharp');

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

// if arr contains only defined values, returns arr, otherwise throws Error(errorMsg)
utils.definedArrOrThrow = function(arr, errorMsg) {
    for (const val of arr) if (val === undefined) throw new Error(errorMsg);
    return arr;
}
// if val is defined, returns val, otherwise throws Error(errorMsg)
utils.definedOrThrow = function(val, errorMsg) {
    if (val === undefined) throw new Error(errorMsg);
    return val;
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
    let matches = raw.match(/^\s*\<costume .*image="data:image\/png;base64,([^"]+)".*\/\>\s*$/);
    if (matches) {
        const raw = Buffer.from(matches[1], 'base64');
        return await sharp(raw)
            .flatten({ background: { r: 255, g: 255, b: 255 } })
            .toFormat('jpeg')
            .jpeg({
                quality: 90,
                chromaSubsampling: '4:4:4',
                force: true,
        }).toBuffer();
    }

    throw Error('unsupported image type');
};

module.exports = utils;