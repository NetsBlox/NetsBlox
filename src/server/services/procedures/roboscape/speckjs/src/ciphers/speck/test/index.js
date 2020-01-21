'use strict'


var fs = require('fs')
var yaml = require('js-yaml')

try {
	var vectors = yaml.safeLoad(fs.readFileSync(__dirname + '/vectors.yml', 'utf-8'))
} catch (e) {
	console.error('Failed to load test vectors:', e)
}

function words(s) {
	return s.split(/\s+/).map(function (x) { return parseInt(x, 16) | 0 })
}


var Speck = require('../lib')
var assert = require('assert')

it('Speck32/64 hax demo', function () {
	var v = vectors['Speck32/64']
	assert.deepEqual(
		words(v.Ciphertext),
		require('../lib/32_encrypt_hax').encrypt(words(v.Plaintext), words(v.Key))
	)
})

Object.keys(Speck).forEach(function (version) {
	it('Speck' + version, function () {
		var v = vectors['Speck' + version]
		var text = words(v.Plaintext)
		var key = []
		Speck[version].expandKey(words(v.Key), key)
		//console.log(key)
		
		Speck[version].encrypt(text, key)
		assert.deepEqual(words(v.Ciphertext), text)
		
		Speck[version].decrypt(text, key)
		assert.deepEqual(words(v.Plaintext), text)
	})
})
