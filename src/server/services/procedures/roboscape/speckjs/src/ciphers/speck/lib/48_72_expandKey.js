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