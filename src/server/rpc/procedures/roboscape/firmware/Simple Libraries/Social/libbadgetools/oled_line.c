#include <stdlib.h>
#include <propeller.h>
#include "badgetools.h"

volatile screen *self;

void line(int32_t x0, int32_t y0, int32_t x1, int32_t y1, int32_t c)
{
  int dx = x1-x0;
  signed char ix = (dx > 0) - (dx < 0);
  dx = abs(dx) << 1;

  int dy = y1 - y0;
  signed char iy = (dy > 0) - (dy < 0);
  dy = abs(dy) << 1;

  point( x0, y0, c);

  if( dx >= dy )
  {
    int err = dy - (dx >> 1);
    while(x0 != x1)
    {
      if( (err >= 0) && (err || (ix > 0)) )
      {
        err -= dx;
        y0 += iy;
      }

      err += dy;
      x0 += ix;
      point( x0, y0, c );
    }
  }
  else
  {
    int err = dx - (dy >> 1);
    while(y0 != y1)
    {
      if( (err >= 0) && (err || (iy > 0)) )
      {
        err -= dy;
        x0 += ix;
      }

      err += dx;
      y0 += iy;
      point( x0, y0, c );
    }
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

