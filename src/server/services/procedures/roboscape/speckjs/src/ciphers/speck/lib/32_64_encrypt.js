function encrypt(text, key) {
    //console.log('encrypt')
    var x = text[0], y = text[1];
    for (var i = 0; i < 22; i++) {
        //console.log($key[i], x, y);
        x = (x << 9 | x >>> 7) + y & 65535 ^ key[i];
        y = (y << 2 | y >>> 14) & 65535 ^ x;
    }
    text[0] = x, text[1] = y;
}
function encryptString(s, key) {
    var a = new Array(s.length);
    for (var i = 0; i < s.length; i += 2) {
        var x = s.charCodeAt(i), y = s.charCodeAt(i + 1);
        //Encrypt (x, y, key)
        a[i] = x, a[i + 1] = y;
    }
    return int16ArrayToString(a);
}
function decryptString(s, key) {
}
function stringToInt16Array(s) {
    var a = new (typeof Int16Array ? Int16Array : Array)(s.length);
    for (var i = 0; i < s.length; i++) {
        a[i] = s.charCodeAt(i);
    }
    return a;
}
function int16ArrayToString(a) {
    return String.fromCharCode.apply(String, a);
}
//# sourceMappingURL=32_64_encrypt.js.map