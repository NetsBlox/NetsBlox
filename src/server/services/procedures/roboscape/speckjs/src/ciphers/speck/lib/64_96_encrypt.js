function encrypt(text, key) {
    //console.log('encrypt')
    var x = text[0], y = text[1];
    for (var i = 0; i < 26; i++) {
        //console.log($key[i], x, y);
        x = (x << 24 | x >>> 8) + y ^ key[i];
        y = (y << 3 | y >>> 29) ^ x;
    }
    text[0] = x, text[1] = y;
}
//# sourceMappingURL=64_96_encrypt.js.map