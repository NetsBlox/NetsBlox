#include <stdlib.h>
#include <propeller.h>
#include "badgewxtools.h"

volatile screen *self;

void box(int32_t x0, int32_t y0, int32_t x1, int32_t y1, int32_t c)
{
  // Draw a box formed by the coordinates of a diagonal line
  line(x0, y0, x1, y0, c);
  line(x1, y0, x1, y1, c);
  line(x1, y1, x0, y1, c);
  line(x0, y1, x0, y0, c);
  if (self->AutoUpdate) screen_update();
}

void boxFilled(int32_t x0, int32_t y0, int32_t x1, int32_t y1, int32_t c)
{
  // Draw a box formed by the coordinates of a diagonal line
  if(y0 > y1) {
    int temp = y0;
    y0 = y1;
    y1 = temp;
    temp = x0;
    x0 = x1;
    x1 = temp;
  }    
  for(int idx = y0; idx <= y1; idx++) line(x0, idx, x1, idx, c);    
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

