macro number_lit {
	case { _ $v:lit } => {
		var v = #{ $v }
		if (v[0].token.type === parser.Token.NumericLiteral) return v
		throwSyntaxCaseError('Not a number')
	}
}
macro int_lit {
	case { _ $v:number_lit } => {
		var v = #{ $v }
		if (Number.isInteger(v[0].token.value)) return v
		throwSyntaxCaseError('Not a integer')
	}
}
macro uint_lit {
	case { _ $v:int_lit } => {
		var v = #{ $v }
		if (v[0].token.value >= 0) return v
		throwSyntaxCaseError('Not a unsigned integer')
	}	
}

macroclass SpeckVersion {
	pattern {
		rule { $blockSize:uint_lit/$keySize:uint_lit }
	}
}
macroclass SpeckOption {
	pattern {
		rule { (T = $T:uint_lit) } 
	}
	pattern {
		rule {} with $T = #{0}
	}
}

macro Speck {
	case {
		_ $version:SpeckVersion $option:SpeckOption {
			$body ...
		}
	} => {
		
		var n = #{ $version$blockSize }[0].token.value / 2, 
			m = #{ $version$keySize }[0].token.value / n

		if ([16, 24, 32, 48, 64].indexOf(n) === -1) {
			throwSyntaxError('SpeckError', 'Invalid blockSize', #{ $version$blockSize })
		}
		if ([2, 3, 4].indexOf(m) === -1) {
			throwSyntaxError('SpeckError', 'Invalid keySize', #{ $version$keySize })
		}
		
		var a, b
		if (n === 16) a = 7, b = 2
		else a = 8, b = 3
		
		var optionT = #{ $option$T }
		var T = optionT[0].token.value ||
			{16: 18, 24: 19, 32: 23, 48: 26, 64: 30}[n] + m

		letstx $n = [makeValue(n, optionT)]
		letstx $m1 = [makeValue(m - 1, optionT)]
		letstx $m2 = [makeValue(m - 2, optionT)]
		letstx $a = [makeValue(a, optionT)]
		letstx $b = [makeValue(b, optionT)]
		letstx $T = [makeValue(T, optionT)]

		//console.log(a, b, T);

		letstx $WORD = {
			16: #{ $x & 0xffff },
			24: #{ $x & 0xffffff },
			32: #{ $x },
		}[n]

		return #{
			macro WORD {
				rule { ($x:expr) } => { $WORD }
			}
			macro XOR {
				rule { ($x:expr, $y:expr) } => { ($x ^ $y) }
			}
			macro LCS {
				case {
					_ ($x:expr, $i)
				} => {
					var i = #{$i}[0].token.value
					letstx $j = [makeValue($n - i, #{$i})]
					return #{ ($x << $i | $x >>> $j) }
				}
			}
			macro RCS {
				case {
					_ ($x:expr, $i)
				} => {
					var i = #{$i}[0].token.value
					letstx $j = [makeValue($n - i, #{$i})]
					return #{ ($x << $j | $x >>> $i) }
				}	
			}
			macro ROUND {
				rule {
					($k:expr, $x:expr, $y:expr)
				} => {
					$x = XOR(WORD(RCS($x, $a) + $y), $k); $y = XOR(WORD(LCS($y, $b)), $x)
				}
			}
			macro ROUND_INV {
				rule {
					($k:expr, $x:expr, $y:expr)
				} => {
					$y = XOR($x, $y); $y = WORD(RCS($y, $b)); $x = WORD(XOR($x, $k) - $y); $x = WORD(LCS($x, $a))
				}
			}
			macro ExpandKey {
				rule { ($key, $expanded) } => {
					var k = $key[$m1]
					for (var i = 0, j; i < $T; ++i) {
						$expanded[i] = k;
						j = $m2 - i % $m1;
						ROUND (i, $key[j], k);
					}
				}
			}
			macro ExpandKeyAndEncrypt {
				rule {
					($text, $key)
				} => {
					var x = $text[0], y = $text[1], k = $key[$m1]
					for (var i = 0; i < $T; i++) {
						j = $m2 - 1 - i % $m1;
						ROUND (k, x, y);
						ROUND (i, $key[j], k);
					}
					$text[0] = x, $text[1] = y
				}
			}
			macro Encrypt {
				rule {
					($text, $key)
				} => {
					//console.log('encrypt')
					var x = $text[0], y = $text[1]
					for (var i = 0; i < $T; i++) {
						//console.log($key[i], x, y);
						ROUND ($key[i], x, y)
					}
					//console.log(x, y)
					$text[0] = x, $text[1] = y
				}
			}
			macro Decrypt {
				rule {
					($text, $key)
				} => {
					//console.log('decrypt')
					var x = $text[0], y = $text[1]
					for (var i = $T - 1; i >= 0; i--) {
						//console.log($key[i], x, y);
						ROUND_INV ($key[i], x, y)
					}
					//console.log(x, y)
					$text[0] = x, $text[1] = y
				}
			}

			$body ...
		}
	}
}
 
export Speck
