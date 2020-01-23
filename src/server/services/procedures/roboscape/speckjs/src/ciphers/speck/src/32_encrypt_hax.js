function encrypt(text, key) {
	var x = text[0], y = text[1]
	var k = key[3]
	var l0 = key[2]
	var l1 = key[1]
	var l2 = key[0]
	//console.log(k)
	for (var i = 0; i < 21;) {
		x = ((x << 9 | x >>> 7) + y ^ k) & 0xffff
		y = ((y << 2 | y >>> 14) ^ x) & 0xffff
		l0 = ((l0 << 9 | l0 >>> 7) + k ^ i) & 0xffff
		k = ((k << 2 | k >>> 14) ^ l0) & 0xffff
		//console.log(k)
		i++
		x = ((x << 9 | x >>> 7) + y ^ k) & 0xffff
		y = ((y << 2 | y >>> 14) ^ x) & 0xffff
		l1 = ((l1 << 9 | l1 >>> 7) + k ^ i) & 0xffff
		k = ((k << 2 | k >>> 14) ^ l1) & 0xffff
		//console.log(k)
		i++
		x = ((x << 9 | x >>> 7) + y ^ k) & 0xffff
		y = ((y << 2 | y >>> 14) ^ x) & 0xffff
		l2 = ((l2 << 9 | l2 >>> 7) + k ^ i) & 0xffff
		k = ((k << 2 | k >>> 14) ^ l2) & 0xffff
		//console.log(k)
		i++
	}
	x = ((x << 9 | x >>> 7) + y ^ k) & 0xffff
	y = ((y << 2 | y >>> 14) ^ x) & 0xffff
	text[0] = x, text[1] = y
	return text
}

exports.encrypt = encrypt
