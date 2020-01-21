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