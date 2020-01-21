const Speck = require('./speck/lib'),
  BlockCipher = require('../blockCipher');

class Speck32 extends BlockCipher {
  constructor() {
    super(16, 4, 22);
    this.lib = Speck['32/64'];
  }

  _expandKey(keyWords) {
    super._expandKey(keyWords);
    let tmpKeyWords = [...keyWords]; // shallow copy since lib mutates it
    let rKeys = [];
    this.lib.expandKey(tmpKeyWords, rKeys);
    return rKeys;
  }

  _encrypt(words, rKeys) {
    let enc = [...words]; // shallow copy
    this.lib.encrypt(enc, rKeys);
    return enc;
  }

  _decrypt(words, rKeys) {
    let enc = [...words]; // shallow copy
    this.lib.decrypt(enc, rKeys);
    return enc;
  }
}

module.exports = Speck32;
