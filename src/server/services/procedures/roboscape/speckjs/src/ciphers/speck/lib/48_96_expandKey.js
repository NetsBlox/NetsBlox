function expandKey(key, expanded) {
    var k = key[3];
    for (var i = 0, j; i < 23; ++i) {
        expanded[i] = k;
        j = 2 - i % 3;
        key[j] = (key[j] << 16 | key[j] >>> 8) + k & 16777215 ^ i;
        k = (k << 3 | k >>> 21) & 16777215 ^ key[j];
    }
}
//# sourceMappingURL=48_96_expandKey.js.map