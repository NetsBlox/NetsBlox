/*
 * @file oledc_scrollStart.c
 *
 * @author Matthew Matz
 *
 * @version 0.9
 *
 * @copyright Copyright (C) Parallax, Inc. 2016.  See end of file for
 * terms of use (MIT License).
 *
 * @brief 0.96-inch RGB OLED display bitmap driver, see oledc_h. for documentation.
 *
 * @detail Please submit bug reports, suggestions, and improvements to
 * this code to editor@parallax.com.
 */


#include "oledc.h"

char TFTROTATION;
int _width, _height;
char TFTSCROLLING;

void oledc_scrollStart(char h, char v) 
{
  while(oledc_screenLock());  
  oledc_screenLockSet();
  
  if(TFTSCROLLING) oledc_writeCommand(SSD1331_CMD_SCROLLSTOP, 0);   

  // check rotation, move pixel around if necessary
  switch (TFTROTATION) {
    case 1:
      gfx_swap(v, h);
      break;
    case 2:
      v = -v;
      h = -h;
      break;
    case 3:
      gfx_swap(v, h);
      h = -h;
      break;
  }

  if(v < 0) v = _width + v;
  if(h < 0) h = _height + h;
  if(v > _width/2) v = _width/2;
  if(h > _height/2) h = _height/2;
  
  oledc_writeCommand(SSD1331_CMD_SCROLLSETUP, 0);
  
  oledc_writeCommand(h, 0);
  oledc_writeCommand(0, 0);
  oledc_writeCommand(_height, 0);    
  oledc_writeCommand(v, 0); 
  oledc_writeCommand(0, 0);   // speed?

  int _tMark = CNT + (CLKFREQ / 10000);
  while(_tMark > CNT);                          // Wait for system clock target

  oledc_writeCommand(SSD1331_CMD_SCROLLSTART, 0);
  TFTSCROLLING = 1;
  
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
