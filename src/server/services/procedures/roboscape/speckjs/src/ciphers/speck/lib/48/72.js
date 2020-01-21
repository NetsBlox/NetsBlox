function decrypt(text, key) {
    //console.log('decrypt')
    var x = text[0], y = text[1];
    for (var i = 22 - 1; i >= 0; i--) {
        //console.log($key[i], x, y);
        y = x ^ y;
        y = (y << 21 | y >>> 3) & 16777215;
        x = (x ^ key[i]) - y & 16777215;
        x = (x << 8 | x >>> 16) & 16777215;
    }
    text[0] = x, text[1] = y;
}
//# sourceMappingURL=48_72_decrypt.js.map
function encrypt(text, key) {
    //console.log('encrypt')
    var x = text[0], y = text[1];
    for (var i = 0; i < 22; i++) {
        //console.log($key[i], x, y);
        x = (x << 16 | x >>> 8) + y & 16777215 ^ key[i];
        y = (y << 3 | y >>> 21) & 16777215 ^ x;
    }
    text[0] = x, text[1] = y;
}
//# sourceMappingURL=48_72_encrypt.js.map
function expandKey(key, expanded) {
    var k = key[2];
    for (var i = 0, j; i < 22; ++i) {
        expanded[i] = k;
        j = 1 - i % 2;
        key[j] = (key[j] << 16 | key[j] >>> 8) + k & 16777215 ^ i;
        k = (k << 3 | k >>> 21) & 16777215 ^ key[j];
    }
}
//# sourceMappingURL=48_72_expandKey.js.map
exports.encrypt = encrypt
exports.decrypt = decrypt
exports.expandKey = expandKey
//# sourceMappingURL=../48/72.js.map