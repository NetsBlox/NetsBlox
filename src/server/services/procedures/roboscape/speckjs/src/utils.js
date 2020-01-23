// js int length for bitwise operations (in form of two's complement)
const JSINTLENGTH = 32;
const ASCII_SIZE = 8;

// WARN positive dec
let dec2Bin = dec => {
  return (dec >>> 0).toString(2);
}

// ensure binary string is n bits
let ensureNBits = (str, n) => {
  diff = n - str.length;
  if (diff < 0) throw new Error(`input binary out of the defined alphabet range ${str.length} vs ${n}`);
  console.assert(diff >= 0);
  if (diff > 0) {
    let pad = '';
    for (let i=0; i < diff; i++) {
      pad += '0';
    }
    str = pad + str;
  }
  return str;
};


// padded string repr of num
let asciiCharToBinary =  c => {
  let decNum = c.charCodeAt(0); // CHECK UTF16 but also ASCII ?!
  let numStr = dec2Bin(decNum);
  numStr = ensureNBits(numStr, ASCII_SIZE);
  return numStr;
};

let binaryToAsciiChar =  binaryStr => {
  if (binaryStr.length !== ASCII_SIZE) throw new Error(`input has to be ${ASCII_SIZE} bits`);
  let c = String.fromCharCode(parseInt(binaryStr, 2));
  return c;
};


let printBinary = int => {
  let str = int.toString(2);
  return str;
};

let lcs = (xInt, nBits) => {
  if (nBits === undefined) throw new Error('missing input: number of bits to shift is required');
  let res = (xInt << nBits | xInt >>> JSINTLENGTH-nBits)
  return res;
};

let rcs = (xInt, nBits) => {
  if (nBits === undefined) throw new Error('missing input: number of bits to shift is required');
  let res = (xInt << JSINTLENGTH-nBits | xInt >>> nBits)
  return res;
};

let lcsn = (xInt, nBits, unsignedBitCount) => {
  if (nBits === undefined) throw new Error('missing input: number of bits to shift is required');
  if (unsignedBitCount > 32 || unsignedBitCount < 1) throw new Error('bad number size')
  let res = (xInt << nBits | xInt >>> unsignedBitCount-nBits) & (Math.pow(2, unsignedBitCount) - 1)
  return res;
};

let rcsn = (xInt, nBits, unsignedBitCount) => {
  if (nBits === undefined) throw new Error('missing input: number of bits to shift is required');
  if (unsignedBitCount > 32 || unsignedBitCount < 1) throw new Error('bad number size')
  let res = (xInt << unsignedBitCount-nBits | xInt >>> nBits) & (Math.pow(2, unsignedBitCount) - 1)
  return res;
};

// FIXME there should be a way of avoiding strings..
let asciiToBits = str => {
  let bitRep = '';
  for (var n = 0, l = str.length; n < l; n ++)
  {
    bitRep += asciiCharToBinary(str[n]);
  }
  return bitRep;
};

let chopString = (str, blockSize) => {
  let re = new RegExp(`.{1,${blockSize}}`, 'g');
  return str.match(re);
};

/**
 * Computes x mod n
 * x arbitrary integer
 * n natural number
 */
const mod = (x, n) => ((x % n) + n) % n;
// const mod = (x, n) => x & n;

// (a+b) mod c = (a mod c + b mod c) mod c
let moduloAdd = (a, b, base) => {
  return mod((a + b), base);
}

let moduloSub = (a, b, base) => {
  return mod((a - b), base);
}

module.exports = {
  lcs,
  rcs,
  lcsn,
  rcsn,
  moduloAdd,
  moduloSub,
  lcs16: (xInt, nBits) => lcsn(xInt, nBits, 16),
  rcs16: (xInt, nBits) => rcsn(xInt, nBits, 16),
  printBinary,
  asciiToBits,
  asciiCharToBinary,
  binaryToAsciiChar,
  ensureNBits,
  dec2Bin,
  chopString,
  mod,
}
