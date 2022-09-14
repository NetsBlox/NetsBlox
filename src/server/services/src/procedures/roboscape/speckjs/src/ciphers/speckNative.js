const { printBinary, mod, lcsn, rcsn, asciiToBits, chopString } = require('../utils'),
  BlockCipher = require('../blockCipher');

class SpeckNative32 extends BlockCipher {
  constructor() {
    super(16, 4, 22);
    this.alpha = 7;
    this.beta = 2;
  }

  _expandKey(keyWords) {
    super._expandKey(keyWords);
    let rKeys = [];
    // build the initial L and K CHECK
    const m = this.m;
    const sixteenOnes = Math.pow(2,16) - 1;

    let key = [...keyWords]; // shallow copy to dereference
    var k = key[3];
    for (var i = 0, j; i < this.numRounds; ++i) {
        rKeys[i] = k;
        j = 2 - i % 3;
        key[j] = rcsn(key[j], 7, 16) + k & sixteenOnes ^ i;
        k = lcsn(k, 2, 16) ^ key[j];
    }

    return rKeys;
  }

  _round(x, y, rKey) {
    // calc x
    let leftTerm = mod(rcsn(x, this.alpha, 16) + y, Math.pow(2, this.n)); // modulo addition
    // CHECK override x here?
    x = leftTerm ^ rKey;
    y = lcsn(y, this.beta, 16) ^ x;

    return [x, y];
  }

  // inverse round
  _roundI(x, y, rKey) {
    y = rcsn(x ^ y, this.beta, 16);
    let leftT = mod((x ^ rKey) - y, Math.pow(2, this.n)); // modulo subtraction
    x = lcsn(leftT, this.alpha, 16);
    return [x, y];
  }

  // input: 2 words (a block) and a list of round keys
  _encrypt(words, rKeys) {
    // console.log('input words to encrypt', words);
    let [x, y] = words;
    for (let i=0; i<this.numRounds; i++) {
      [x, y] = this._round(x, y, rKeys[i]);
    }
    return [x, y];
  }

  _decrypt(words, rKeys) {
    // console.log('input words to decrypt', words);
    let [x, y] = words;
    for (let i=this.numRounds-1; i >= 0; i--) {
      [x, y] = this._roundI(x, y, rKeys[i]);
    }
    return [x, y];
  }
}

module.exports = SpeckNative32;
