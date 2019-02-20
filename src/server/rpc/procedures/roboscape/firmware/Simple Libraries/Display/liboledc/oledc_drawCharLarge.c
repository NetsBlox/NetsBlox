/*
 * @file oledc_drawCharLarge.c
 *
 * @author Matthew Matz
 *
 * @version 0.9
 *
 * @copyright Copyright (C) Parallax, Inc. 2016.  See end of file for
 * terms of use (MIT License).
 *
 * @brief 0.96-inch RGB OLED display driver component, see oledc_h. for documentation.
 *
 * @detail Please submit bug reports, suggestions, and improvements to
 * this code to editor@parallax.com.
 */

#include "oledc.h"
#include "simpletools.h"


int _font[5];

i2c *eeBus;                                   // I2C bus ID

static char current_character[51] = {0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0};

void oledc_drawCharLarge(int x, int y, unsigned char c, unsigned int color, unsigned int bg) 
{
  int offset = 0;
  int idx;
  char li;
  int ctr = 0;
  
  char font_lg_index[95];
  char font_lg_zeroMap[7];
  char oled_font_lg[51];

  while(oledc_screenLock());  
  oledc_screenLockSet();

  i2c_in(eeBus, 0b1010000, (_font[2] & 0xFFFF), 2, font_lg_index, 95);
  i2c_in(eeBus, 0b1010000, ((_font[3] & 0xFFFF) + 7*(c-33)), 2, font_lg_zeroMap, 7);
  
  for(int i = 1; i < (c-32); i++) 
  {
    if(font_lg_index[i] == 0xEA) font_lg_index[i] = 0x19;
    offset += font_lg_index[i];   // sum the index to find the offset
  }    

  i2c_in(eeBus, 0b1010000, ((_font[4] & 0xFFFF) + offset), 2, oled_font_lg, 51); 
  
  offset = 0;       
  
  for(int k = 1; k < 8; k++)
  {
    li = font_lg_zeroMap[k - 1];
    if(li == 0xEA) li = 0x19;
    for(int j = 0; j < 8; j++) 
    {
      ctr++;
      char t = li & (1 << (7-j));
      if((t > 0) && ctr < 52)
      {
        current_character[ctr] = oled_font_lg[offset];
        if(current_character[ctr] == 0xEA) current_character[ctr] = 0x19;
        offset++;
      } else if(ctr < 52) {
        current_character[ctr] = 0x00;
      }
    }                 
  }    

  for (char i = 1; i < 52; i += 3 ) 
  {
    int lj;
    if (i < 51) lj = (current_character[i] << 16) | (current_character[i + 1] << 8) | current_character[i + 2];
    else        lj = 0x0;

    for (char j = 0; j < 23; j++, lj >>= 1) 
    {
      if (lj & 0x1)          oledc_drawPixelPrimative(x + i / 3, y + j, color);
      else if (bg != color)  oledc_drawPixelPrimative(x + i / 3, y + j, bg);
    }
    
    if (bg != color)
    {
      oledc_drawLinePrimative(x + 17, y, x + 17, y + 23, bg);
      oledc_drawLinePrimative(x, y + 23, x + 16, y + 23, bg);
    }      
  }

  oledc_screenLockClr();
}


/**
 * TERMS OF USE: MIT License
 *
 * Permission is hereby granted, free of charge, to any person obtaining a
 * copy of this software and associated documentation files (the "Software"),
 * to deal in the Software without restriction, including without limitation
 * the rights to use, copy, modify, merge, publish, distribute, sublicense,
 * and/or sell copies of the Software, and to permit persons to whom the
 * Software is furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL
 * THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
 * FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER
 * DEALINGS IN THE SOFTWARE.
 */
