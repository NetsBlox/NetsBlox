#include <stdlib.h>
#include <propeller.h>
#include "badgewxtools.h"

volatile screen *self;

void screen_string16x4(char *str, int32_t len, int32_t row, int32_t col)
{
  ////int32_t	i, j;
  int32_t	j;
  // Write a string of 5x7 characters to the display @ row and column
  {
    int32_t _limit__0047 = (len - 1);
    int32_t _step__0048 = 1;
    j = 0;
    if (j >= _limit__0047) _step__0048 = -_step__0048;
    do 
    {
      if((str[j] == '\n') || (str[j] == '\r'))
      {
        row = 0x7 & (row + 1);
        col = 0;
        j = j + _step__0048;
      }        
      else  
      {
        screen_char7x5(((uint8_t *)str)[j], row, col);
        (col++);
        if (col > 15) {
          col = 0;
          (row++);
        }
        if(row > 7){
          row = 0;
        }        
        j = j + _step__0048;
      }        
    } while (((_step__0048 > 0) && (j <= _limit__0047)) || ((_step__0048 < 0) && (j >= _limit__0047)));
  }
  if (self->AutoUpdate) screen_update();
  self->crsrX = col;
  self->crsrY = row;
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

