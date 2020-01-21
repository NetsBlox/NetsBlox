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