#include "simpletools.h"
#include "badgetools.h"

volatile screen *self;

void shape(char *img, int bw, int xtl, int ytl, int xpics, int ypics)
{
  int byte, bit, pix = 0, xp, yp, bytep, bitp, pixp = 0, n;
  uint32_t screenbuf = screen_getBuffer();
  char *scrbuf = (char *) screenbuf;
  for(int x = 0; x < xpics; x++)
  {
    for(int y = 0; y < ypics; y++)
    {
      n = (y * xpics) + x;  
      byte = n / 8;
      bit = 7 - (n % 8);
      pix = (bw & 1) & (img[byte] >> bit);
      pix ^= (bw >> 1);
      pix &= 1;

      scrbuf[byte] &= ~(1 << bit);
      scrbuf[byte] |= (pixp << bit);

      xp = xtl + x;
      yp = ytl + y;
      
      bytep = ((yp >> 3) << 7) + xp;
      bitp = yp % 8;
      scrbuf[bytep] &= ~(1 << bitp);
      scrbuf[bytep] |= (pix << bitp);
    }
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

