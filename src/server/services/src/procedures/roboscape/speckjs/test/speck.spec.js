const assert = require('assert'),
  utils = require('../src/utils'),
  Speck32 = require('../src/ciphers/speck'),
  SpeckNative32 = require('../src/ciphers/speckNative');

describe('ciphers', function() {
  describe('speck32', function() {

    const keyWords = [1918, 1110, 0908, 0100];
    const s32 = new Speck32(); // using speck lib
    const sNative32 = new SpeckNative32();

    describe('speck lib', function() {


      it('should encrypt two ways block sized texts', function() {
        const plainMessage = 'holahola';
        let encMsg = s32.encryptAscii(plainMessage, keyWords);
        let decryptedMsg = s32.decryptAscii(encMsg, keyWords);
        assert.deepEqual(decryptedMsg, plainMessage);
      })

      it('should encrypt two ways odd sized texts', function() {
        const plainMessage = 'holas';
        let encMsg = s32.encryptAscii(plainMessage, keyWords);
        let decryptedMsg = s32.decryptAscii(encMsg, keyWords);
        assert.deepEqual(decryptedMsg, plainMessage);
      })
    });

    describe('speck native', function() {

      let checkTwoWay = plainMessage => {
        let encMsg = sNative32.encryptAscii(plainMessage, keyWords);
        let decryptedMsg = sNative32.decryptAscii(encMsg, keyWords);
        assert.deepEqual(decryptedMsg, plainMessage);
      }

      it('should encrypt two ways block sized texts', function() {
        const plainMessage = 'hola';
        checkTwoWay(plainMessage);
      })

      it('should encrypt two ways odd sized texts', function() {
        const plainMessage = 'holas';
        let encMsg = sNative32.encryptAscii(plainMessage, keyWords);
        let decryptedMsg = sNative32.decryptAscii(encMsg, keyWords);
        assert.deepEqual(decryptedMsg, plainMessage);
      })

      it('should encrypt two ways odd sized texts', function() {
        const plainMessage = 'hdWEIRUk';
        checkTwoWay(plainMessage);
      })

      it('should be able to reverse encryption on random string', function() {
        let randStr = () => Math.random().toString(36).substring(5);
        const messages = ['holas', 'asdfzxc', '34 23sadf aqI',  'hdWEIRUk', 'xzcjkvliasufhdWEIRUkCnv234305@#$(9^)']
        messages.forEach(plainMessage => {
          checkTwoWay(plainMessage);
        })
        for (let i=0; i<1000; i++) {
          checkTwoWay(randStr());
        }
      })
    })

    describe('mixed tests', function() {

      it('should generate same key schedules', function() {
        let nativeRKeys = sNative32._expandKey(keyWords);
        let libRKeys = s32._expandKey(keyWords);
        assert.deepEqual(nativeRKeys.length, 22);
        assert.deepEqual(nativeRKeys, libRKeys);
      })

      it('should generate the same encrypted text', function() {
        const plainMessage = 'hola';
        let nativeEnc = sNative32.encryptAscii(plainMessage, keyWords);
        let libEnc = s32.encryptAscii(plainMessage, keyWords);
        assert.deepEqual(nativeEnc, libEnc);
      })

      it('should generate the same encrypted text odd sized', function() {
        const plainMessage = 'holaas';
        let nativeEnc = sNative32.encryptAscii(plainMessage, keyWords);
        let libEnc = s32.encryptAscii(plainMessage, keyWords);
        assert.deepEqual(nativeEnc, libEnc);
      })

    })

  }) // end of speck32
})
