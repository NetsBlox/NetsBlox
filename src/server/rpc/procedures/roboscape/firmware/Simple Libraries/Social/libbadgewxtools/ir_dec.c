#include <stdlib.h>
#include <propeller.h>
#include "badgewxtools.h"

jm_ir_hdserial *irself;

int32_t ircom_dec(int32_t value)
{
  int32_t	i, x;
  int32_t result = 0;
  // Transmit a value in decimal format              
  // mark max negative
  x = -(value == (int32_t)0x80000000U);
  if (value < 0) {
    // if negative                   
    // make positive and adjust
    value = abs((value + x));
    // print sign
    ircom_tx('-');
  }
  // set divisor
  i = 1000000000;
  {
    int32_t _idx__0047;
    for(_idx__0047 = 0; _idx__0047 < 10; _idx__0047++) {
      if (value >= i) {
        // non-zero digit for this divisor?                  
        //  print digit                    
        ircom_tx((((value / i) + '0') + (x * -(i == 1))));
        //  remove from value
        value = value % i;
        //  set printing flag                      
        result = -1;
      } else {
        if ((result) || (i == 1)) {
          // if printing or last digit            
          //  print zero
          ircom_tx('0');
        }
      }
      // update divisor
      i = i / 10;
    }
  }
  return result;
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

