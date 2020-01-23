function expandKey(key, expanded) {
    var k = key[2];
    for (var i = 0, j; i < 26; ++i) {
        expanded[i] = k;
        j = 1 - i % 2;
        key[j] = (key[j] << 24 | key[j] >>> 8) + k ^ i;
        k = (k << 3 | k >>> 29) ^ key[j];
    }
}
//# sourceMappingURL=64_96_expandKey.js.map