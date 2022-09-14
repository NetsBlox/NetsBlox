# JS Speck Cipher Implementation


## Gotchas in JS

- `%` is the remainder operator and not modulo

### Bitwise operations in JavaScript
Ref: [MDN](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Bitwise_Operators)
- Bitwise operators perform their operations on binary representations, but they return standard JavaScript numerical values.
- JavaScript does not have an unsigned int
- The operand of all bitwise operators are converted to singed 32-bit integers in two's complement format.
- `<<` and `>>` operate on signed int whereas `>>>` operates as if the number is unsigned

## TODO
- remove bitwise package dep
- add more tests for circular shifts and remove the extras
- refactor expand key
