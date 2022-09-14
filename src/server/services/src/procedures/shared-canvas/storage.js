const Storage = require('../../storage');
const jimp = require('jimp');

const EDIT_COOLDOWN = 60 * 1000; // ms
const CANVAS_SIZE = [1000, 1000]; // pixels
const BG_COLOR = jimp.rgbaToInt(0, 0, 0, 255);

_usersDB = null;
function getUsersDB() {
    if (!_usersDB) {
        _usersDB = Storage.createCollection('shared-canvas-users');
    }
    return _usersDB;
}

class User {
    constructor(username, lastEdit, numEdits) {
        this.username = username;
        this.lastEdit = lastEdit;
        this.numEdits = numEdits;
    }

    msTillCooldown() {
        return this.lastEdit + EDIT_COOLDOWN - +new Date();
    }
    canEdit() {
        return this.msTillCooldown() <= 0;
    }
    markEdit() {
        this.lastEdit = +new Date();
        this.numEdits += 1;
        getUsersDB().updateOne({ username: this.username }, { $set: this }, { upsert: true });
    }
}

async function getUser(caller) {
    const username = caller?.username;
    if (!username) throw Error('You must be logged in to use this feature');

    const info = await getUsersDB().findOne({ username });
    const lastEdit = info?.lastEdit || 0;
    const numEdits = info?.numEdits || 0;
    return new User(username, lastEdit, numEdits);
}

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

async function saveCanvas() {
    const canvas = await getCanvas();
    const buf = await canvas.getBufferAsync(jimp.MIME_PNG);
    await getCanvasDB().updateOne({ id: 'saved-canvas' }, { $set: { buf } }, { upsert: true });
}

module.exports = {
    getCanvas,
    saveCanvas,

    EDIT_COOLDOWN,
    getUser,
};
