#include <stdlib.h>
#include <propeller.h>
#include "badgetools.h"

volatile screen *self;

void screen_char7x5(int32_t ch, int32_t row, int32_t col)
{
  int32_t	i;
  // Write a 5x7 character to the display @ row and column
  col = col & 0xf;
  /*
  if (self->displayType == TYPE_128X32) {
    row = row & 0x3;
    for(i = 0; i <= 7; i++) {
      self->buffer[(((row * 128) + (col * 8)) + i)] = ((uint8_t *)(((int32_t)(&(*(uint8_t *)&oleddat[1416])) + (8 * ch)) + i))[0];
    }
  } else
  */
  row = row & 0x7;
  for(i = 0; i <= 7; i++)
  {
    self->buffer[(((row * 128) + (col * 8)) + i)] = ((uint8_t *)(((int32_t)(&(*(uint8_t *)&oleddat[1416])) + (8 * ch)) + i))[0];
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

