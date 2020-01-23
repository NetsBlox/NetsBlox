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