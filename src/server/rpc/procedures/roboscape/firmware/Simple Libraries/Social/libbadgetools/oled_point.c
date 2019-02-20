#include <stdlib.h>
#include <propeller.h>
#include "badgetools.h"

volatile screen *self;

void point(int32_t x, int32_t y, int32_t color)
{
  //while(lockset(screenLock));
  ////int32_t	pp;
  // Plot a point x,y on the screen. color is really just on or off (1 or 0)
  x = x & 0x7f;
  if ((y > 0) && (y < self->displayHeight)) {
    if (color == SCR_WHITE) {
      self->buffer[(x + ((Shr__(y, 3)) * 128))] = self->buffer[(x + ((Shr__(y, 3)) * 128))] | ((1<<(y % 8)));
    } else {
      // Clear the bit and it's off (black)
      self->buffer[(x + ((Shr__(y, 3)) * 128))] = self->buffer[(x + ((Shr__(y, 3)) * 128))] & (~((1<<(y % 8))));
    }
  }
  if (self->AutoUpdate) screen_update();
  //lockclr(screenLock);
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

