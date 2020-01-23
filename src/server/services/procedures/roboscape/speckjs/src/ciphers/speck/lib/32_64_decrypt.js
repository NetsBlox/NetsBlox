function decrypt(text, key) {
    //console.log('decrypt')
    var x = text[0], y = text[1];
    for (var i = 22 - 1; i >= 0; i--) {
        //console.log($key[i], x, y);
        y = x ^ y;
        y = (y << 14 | y >>> 2) & 65535;
        x = (x ^ key[i]) - y & 65535;
        x = (x << 7 | x >>> 9) & 65535;
    }
    text[0] = x, text[1] = y;
}
//# sourceMappingURL=32_64_decrypt.js.map