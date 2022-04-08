const Storage = require('../../storage');
const jimp = require('jimp');

const CANVAS_SIZE = [1000, 1000];
const BG_COLOR = jimp.rgbaToInt(0, 0, 0, 255);

_canvasDB = null;
function getCanvasDB() {
    if (!_canvasDB) {
        _canvasDB = Storage.createCollection('shared-canvas');
    }
    return _canvasDB;
}

let _canvas = null;
async function getCanvas() {
    if (_canvas) return _canvas;
    const [width, height] = CANVAS_SIZE;

    const saved = await getCanvasDB().findOne({ id: 'saved-canvas' });
    if (saved?.buf?.buffer) {
        const res = await jimp.read(saved.buf.buffer);
        if (res.bitmap.width === width && res.bitmap.height === height) {
            _canvas = res;
            return _canvas;
        }
    }

    _canvas = new jimp(width, height);
    for (let i = 0; i < width; ++i) {
        for (let j = 0; j < height; ++j) {
            _canvas.setPixelColor(BG_COLOR, i, j);
        }
    }

    return _canvas;
}

async function getImageBuf(img) {
    return await new Promise((resolve, reject) => {
        img.getBuffer(jimp.MIME_PNG, (e, b) => {
            if (e) reject(e);
            else resolve(b);
        });
    })
}

async function saveCanvas() {
    const buf = await getImageBuf(await getCanvas())
    await getCanvasDB().updateOne({ id: 'saved-canvas' }, { $set: { buf } }, { upsert: true });
}

module.exports = {
    getCanvas,
    saveCanvas,
    getImageBuf,
};
