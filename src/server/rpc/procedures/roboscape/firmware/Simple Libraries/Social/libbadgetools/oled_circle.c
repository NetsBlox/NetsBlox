#include <stdlib.h>
#include <propeller.h>
#include "badgetools.h"

volatile screen *self;

void circle(int32_t x0, int32_t y0, int32_t r, int32_t c)
{
  int f = 1 - r;
  int ddF_x = 1;
  int ddF_y = -2 * r;
  int x = 0;
  int y = r;

  point(x0  , y0 + r, c);
  point(x0  , y0 - r, c);
  point(x0 + r, y0  , c);
  point(x0 - r, y0  , c);

  while (x < y)
  {
    if (f >= 0) {
      y--;
      ddF_y += 2;
      f += ddF_y;
    }
    x++;
    ddF_x += 2;
    f += ddF_x;

    point(x0 + x, y0 + y, c);
    point(x0 - x, y0 + y, c);
    point(x0 + x, y0 - y, c);
    point(x0 - x, y0 - y, c);
    point(x0 + y, y0 + x, c);
    point(x0 - y, y0 + x, c);
    point(x0 + y, y0 - x, c);
    point(x0 - y, y0 - x, c);
  }
  if (self->AutoUpdate) screen_update();
}

void circleFilled(int32_t x0, int32_t y0, int32_t r, int32_t c)
{
  // Draw a box formed by the coordinates of a diagonal line
  line(x0, y0 - r, x0, y0 + r, c);

  int f     = 1 - r;
  int ddF_x = 1;
  int ddF_y = -2 * r;
  int x     = 0;
  int y     = r;

  while (x < y)
  {
    if (f >= 0) {
      y--;
      ddF_y += 2;
      f     += ddF_y;
    }
    x++;
    ddF_x += 2;
    f     += ddF_x;

    int yD = 2 * y + 1;
    int xD = 2 * x + 1;
    
    //if(y0 - y + yD > _height) yD = _height - y0 + y;
    //if(y0 - y + xD > _height) xD = _height - y0 + y; 
         
    line(x0 + x, y0 - y, x0 + x, y0 - y + yD - 1, c);
    line(x0 + y, y0 - x, x0 + y, y0 - x + xD - 1, c);
    line(x0 - x, y0 - y, x0 - x, y0 - y + yD - 1, c);
    line(x0 - y, y0 - x, x0 - y, y0 - x + xD - 1, c);
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