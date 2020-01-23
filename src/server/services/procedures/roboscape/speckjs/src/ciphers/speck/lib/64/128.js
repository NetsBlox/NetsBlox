function decrypt(text, key) {
    //console.log('decrypt')
    var x = text[0], y = text[1];
    for (var i = 27 - 1; i >= 0; i--) {
        //console.log($key[i], x, y);
        y = x ^ y;
        y = y << 29 | y >>> 3;
        x = (x ^ key[i]) - y;
        x = x << 8 | x >>> 24;
    }
    text[0] = x, text[1] = y;
}
//# sourceMappingURL=64_128_decrypt.js.map
function encrypt(text, key) {
    //console.log('encrypt')
    var x = text[0], y = text[1];
    for (var i = 0; i < 27; i++) {
        //console.log($key[i], x, y);
        x = (x << 24 | x >>> 8) + y ^ key[i];
        y = (y << 3 | y >>> 29) ^ x;
    }
    text[0] = x, text[1] = y;
}
//# sourceMappingURL=64_128_encrypt.js.map
function expandKey(key, expanded) {
    var k = key[3];
    for (var i = 0, j; i < 27; ++i) {
        expanded[i] = k;
        j = 2 - i % 3;
        key[j] = (key[j] << 24 | key[j] >>> 8) + k ^ i;
        k = (k << 3 | k >>> 29) ^ key[j];
    }
}
//# sourceMappingURL=64_128_expandKey.js.map
exports.encrypt = encrypt
exports.decrypt = decrypt
exports.expandKey = expandKey
//# sourceMappingURL=../64/128.js.map