Speck 32/64 {

	function encrypt(text, key) {
		Encrypt (text, key)
	}

	function encryptString(s, key) {
		var a = new Array(s.length)
		for (var i = 0; i < s.length; i += 2) {
			var x = s.charCodeAt(i), y = s.charCodeAt(i + 1)
			//Encrypt (x, y, key)
			a[i] = x, a[i + 1] = y
		}
		return int16ArrayToString(a)
	}

	function decryptString(s, key) {

	}

	function stringToInt16Array(s) {
		var a = new (typeof Int16Array ? Int16Array : Array)(s.length)
		for (var i = 0; i < s.length; i++) { a[i] = s.charCodeAt(i) }
		return a
	}

	function int16ArrayToString(a) {
		return String.fromCharCode.apply(String, a)
	}
}