const assert = require('assert'),
  { rolInt16, rorInt16 } = require('bitwise-rotation'),
  utils = require('../src/utils');
const ASCII_SIZE = 8;

describe('utils', function() {

  it('chop should work on indivisible lengths', function() {
    let res = utils.chopString('12345', 2);
    let expected = ['12', '34', '5'];
    assert.deepEqual(res, expected);

    res = utils.chopString('1234', 2);
    expected = ['12', '34'];
    assert.deepEqual(res, expected);
  });

  it('mod function', function() {
    assert.equal(utils.mod(10, 2), 0);
    assert.equal(utils.mod(5, 2), 1);
  })

  it('modular addition', function() {
    assert.equal(utils.moduloAdd(9, 5, 12), 2);
    assert.equal(utils.moduloAdd(30, 8, 12), 2);
    assert.equal(utils.moduloAdd(5, 4, 12), 9);
  })

  it('modular subtraction', function() {
    assert.equal(utils.moduloSub(5, 4, 6), 1);
    assert.equal(utils.moduloSub(4, 5, 6), 5);
    assert.equal(utils.moduloSub(5, 7, 6), 4);
  })


  describe('circular shifts', function() {

    // TODO what happens to negative numbers in 16 bit rotation

    const randIntBetween = (min, max) => Math.floor(Math.random() * max) + min;

    // fun test cases.. not that useful
    it('16bits lcs should behave the same as the library', function() {
      let arg1, arg2;
      for (let i=0; i<100; i++) {
        arg1 = randIntBetween(1, 65535);
        arg2 = randIntBetween(1, 16);
        assert.deepEqual(utils.lcs16(arg1, arg2), rolInt16(arg1, arg2), `failed with args ${arg1}, ${arg2}`);
      }
    })

    it('16bits rcs should behave the same as the library', function() {
      let arg1, arg2;
      for (let i=0; i<100; i++) {
        arg1 = randIntBetween(1, 65535);
        arg2 = randIntBetween(1, 16);
        assert.deepEqual(utils.rcs16(arg1, arg2), rorInt16(arg1, arg2), `failed with args ${arg1}, ${arg2}`);
      }
    })

    describe('lcs', function() {

      it('should lcs 1 to 8 with 3bit', function() {
        assert.deepEqual(utils.lcs(1, 3), 8);
      });

      it('should not change with 32 bit rotation', function() {
        assert.deepEqual(utils.lcs(-100, 32), -100);
        assert.deepEqual(utils.lcs(1, 32), 1);
        assert.deepEqual(utils.lcs(24523, 32), 24523);
      });

      it('should do 30 bit rotation', function() {
        assert.deepEqual(utils.lcs(1, 30), Math.pow(2,30));
      });

      it('should lcs(1,31) should get -2^31', function() {
        assert.deepEqual(utils.lcs(1, 31), -1 * Math.pow(2,31));
      });

      it('should lcs(1,33) should get 2', function() {
        assert.deepEqual(utils.lcs(1, 33), 2);
      });

      describe('16 bit', function() {
        it('should not change with 16 bit rotation', function() {
          assert.deepEqual(utils.lcs16(1, 16), 1);
          assert.deepEqual(utils.lcs16(24523, 16), 24523);
          assert.deepEqual(utils.lcs16(100, 16), 100);
        })

      })

    }); // end of lcs tests

    describe('rcs', function() {

      it('should rcs 2 by 1 bit to 1', function() {
        assert.deepEqual(utils.rcs(2, 1), 1);
      });

      it('should not change with 32 bit rotation', function() {
        assert.deepEqual(utils.rcs(-100, 32), -100);
        assert.deepEqual(utils.rcs(1, 32), 1);
        assert.deepEqual(utils.rcs(24523, 32), 24523);
      });

      it('should do 30 bit rotation', function() {
        assert.deepEqual(utils.rcs(Math.pow(2,30), 30), 1);
      });

      it('should rcs(1,2) should get 2^30', function() {
        assert.deepEqual(utils.rcs(1, 2), Math.pow(2,30));
      });

      it('should rcs(1,1) should get -2^31', function() {
        assert.deepEqual(utils.rcs(1, 1), -1 * Math.pow(2,31));
      });

      describe('16 bit', function() {

        it('should not change with 16 bit rotation', function() {
          assert.deepEqual(utils.rcs16(1, 16), 1);
          assert.deepEqual(utils.rcs16(24523, 16), 24523);
          assert.deepEqual(utils.rcs16(100, 16), 100);
        })

      })


    }); // end of rcs tests

  })

  describe('binary', function() {

    const checkTwoWay = msg => {
      let bits = utils.asciiToBits(msg);
      let charBits = utils.chopString(bits, ASCII_SIZE)
      let chars = charBits.map(utils.binaryToAsciiChar);
      assert.deepEqual(chars.join(''), msg);
    }

    it('should convert ascii char to padded binary', function() {
      const expected = '00100000';
      let str = utils.asciiCharToBinary(' ')
      assert.deepEqual(str, expected);
    })

    it('should convert message to binary', function() {
      const expected = '01110011011001010111010000100000';
      let str = utils.asciiToBits('set ');
      assert.deepEqual(str, expected);
    })

    it('should convert to binary and back', function() {
      let randStr = () => Math.random().toString(36).substring(1);
      const messages = ['holas', 'asdfzxc', '34 23sadf aqI',  'hdWEIRUk', 'xzcjkvliasufhdWEIRUkCnv234305@#$(9^)']
      messages.forEach(plainMessage => {
        checkTwoWay(plainMessage);
      })
      for (let i=0; i<100; i++) {
        checkTwoWay(randStr());
      }
    })

  })

});
