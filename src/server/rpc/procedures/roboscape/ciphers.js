
// key is an array of shift values
const caesarCipher = (text, key, decrypt=false) => {
    if (typeof text !== 'string') {
        return false;
    } else if (key.length === 0) {
        return text;
    }

    var output = '';
    for (var i = 0; i < text.length; i++) {
        var code = text.charCodeAt(i),
            shift = +key[i % key.length];

        code = decrypt ? code - shift : code + shift;
        code = (code - 32) % (127 - 32);
        if (code < 0) {
            code += 127 - 32;
        }
        code += 32;

        output += String.fromCharCode(code);
    }
    return output;
};



module.exports = {
    plain: { // ignores the second argument key
        encrypt: text => text,
        decrypt: text => text,
    },

    caesar: {
        encrypt: (text, key) => caesarCipher(text, key, false),
        decrypt: (text, key) => caesarCipher(text, key, true),
    },
};
