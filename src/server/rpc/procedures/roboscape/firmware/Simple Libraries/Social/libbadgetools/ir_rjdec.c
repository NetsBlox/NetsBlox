#include <stdlib.h>
#include <propeller.h>
#include "badgetools.h"

jm_ir_hdserial *irself;

int32_t ircom_rjdec(int32_t val, int32_t width, int32_t pchar)
{
  int32_t	tmpval, pad;
  // Transmit right-justified decimal value
  // -- val is value to print
  // -- width is width of (pchar padded) field for value
  //  Original code by Dave Hein
  //  Modified by Jon McPhalen
  if (val >= 0) {
    // if positive
    //  copy value
    tmpval = val;
    //  make room for 1 digit
    pad = width - 1;
  } else {
    if (val == (int32_t)0x80000000U) {
      //  if max negative
      //    use max positive for width
      tmpval = 2147483647;
    } else {
      //  else
      //    make positive
      tmpval = -val;
    }
    //  make room for sign and 1 digit
    pad = width - 2;
  }
  while (tmpval >= 10) {
    // adjust pad for value width > 1
    (pad--);
    tmpval = tmpval / 10;
  }
  {
    int32_t _idx__0048;
    int32_t _limit__0049 = pad;
    for(_idx__0048 = 0; _idx__0048 < _limit__0049; _idx__0048++) {
      // transmit pad
      ircom_tx(pchar);
    }
  }
  // trasnmit value
  ircom_dec(val);
  return 0;
}

/*
  TERMS OF USE: MIT License
 
  Permission is hereby granted, free of charge, to any person obtaining a
  copy of this software and associated documentation files (the "Software"),
   to deal in the Software without restriction, including without limitation
  the rights to use, copy, modify, merge, publish, distribute, sublicense,
  and/or sell copies of the Software, and to permit persons to whom the
  Software is furnished to do so, subject to the following conditions:
 
  The above copyright notice and this permission notice shall be included in
  all copies or substantial portions of the Software.
 
  THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
  IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
  FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL
  THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
  LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
  FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER
  DEALINGS IN THE SOFTWARE.
*/

