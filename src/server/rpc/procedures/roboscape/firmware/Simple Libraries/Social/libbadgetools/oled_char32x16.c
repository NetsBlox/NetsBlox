#include <stdlib.h>
#include <propeller.h>
#include "badgetools.h"

volatile screen *self;

void screen_char32x16(int32_t ch, int32_t row, int32_t col)
{
  ////int32_t	h, i, j, k, q, r, s, mask, cbase, cset, bset;
  int32_t	h, j, k, r, mask, cbase, bset;
  if ((row == 0) || ((row == 1) && ((col >= 0) && (col < 8)))) 
  {
    // Write a 16x32 character to the screen at position 0-7 (left to right)
    // Compute the base of the interleaved character 
    cbase = 32768 + ((ch & 0xfe) << 6);
    for(j = 0; j <= 31; j++) {
      // For all the rows in the font
      // For setting bits in the OLED buffer. The mask is always a byte and has to wrap
      bset = (1<<(j % 8));
      if (ch & 0x1) {
        // For the extraction of the bits interleaved in the font
        mask = 2;
      } else {
        // For the extraction of the bits interleaved in the font
        mask = 1;
      }
      // Row is the font data with which to perform bit extraction
      r = ((int32_t *)cbase)[j];
      // Just for printing the font  to the serial terminal (DEBUG)
      //s = 0;
      // Get the base address of the OLED buffer
      h = (int32_t)(&self->buffer[0]) + (row * 512);
      // Compute the offset to the column of data and add to the base...
      h = h + (((Shr__(j, 3)) * 128) + (col * 16));
      // ...then add the offset to the character position
      for(k = 0; k <= 15; k++) {
        // For all 16 bits we need from the interlaced font...
        if (r & mask) {
          // Set the column bit
          ((uint8_t *)h)[k] = ((uint8_t *)h)[k] | bset;
        } else {
          // Clear the column bit
          ((uint8_t *)h)[k] = ((uint8_t *)h)[k] & (~bset);
        }
        // The mask shifts two places because the fonts are interlaced
        mask = mask << 2;
      }
    }
    if (self->AutoUpdate) screen_update();
    self->crsrX = col;
    self->crsrY = row;
  }
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

