#include <stdlib.h>
#include <propeller.h>
#include "badgetools.h"

volatile screen *self;

void screen_string8x1(char *str, int32_t len)
{
  int32_t	i;
  // Write a string on the display starting at position zero (left)
  {
    int32_t _limit__0043 = ((Min__(len, SSD1306_LCDCHARMAX)) - 1);
    int32_t _step__0044 = 1;
    i = 0;
    if (i >= _limit__0043) _step__0044 = -_step__0044;
    do {
      screen_char32x16(((uint8_t *)str)[i], 0, i);
      i = i + _step__0044;
    } while (((_step__0044 > 0) && (i <= _limit__0043)) || ((_step__0044 < 0) && (i >= _limit__0043)));
  }
  if (self->AutoUpdate) screen_update();
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

