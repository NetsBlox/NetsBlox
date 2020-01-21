function expandKey(key, expanded) {
    var k = key[3];
    for (var i = 0, j; i < 22; ++i) {
        expanded[i] = k;
        j = 2 - i % 3;
        key[j] = (key[j] << 9 | key[j] >>> 7) + k & 65535 ^ i;
        k = (k << 2 | k >>> 14) & 65535 ^ key[j];
    }
}
//# sourceMappingURL=32_64_expandKey.js.map