#include <stdlib.h>
#include <propeller.h>
#include "badgetools.h"

jm_ir_hdserial *irself;

int32_t ircom_hex(int32_t value, int32_t digits)
{
  static int32_t look__0050[] = {48, 49, 50, 51, 52, 53, 54, 55, 56, 57, 65, 66, 67, 68, 69, 70, };

  // Transmit a value in hexadecimal format              
  value = value << ((8 - digits) << 2);
  {
    int32_t _idx__0051;
    int32_t _limit__0052 = digits;
    for(_idx__0051 = 0; _idx__0051 < _limit__0052; _idx__0051++) {
      ircom_tx(Lookup__(((value = Rotl__(value, 4)) & 0xf), 0, look__0050, 16));
    }
  }
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

