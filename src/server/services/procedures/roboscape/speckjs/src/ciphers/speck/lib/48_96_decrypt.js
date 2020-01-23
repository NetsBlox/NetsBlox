function decrypt(text, key) {
    //console.log('decrypt')
    var x = text[0], y = text[1];
    for (var i = 23 - 1; i >= 0; i--) {
        //console.log($key[i], x, y);
        y = x ^ y;
        y = (y << 21 | y >>> 3) & 16777215;
        x = (x ^ key[i]) - y & 16777215;
        x = (x << 8 | x >>> 16) & 16777215;
    }
    text[0] = x, text[1] = y;
}
//# sourceMappingURL=48_96_decrypt.js.map