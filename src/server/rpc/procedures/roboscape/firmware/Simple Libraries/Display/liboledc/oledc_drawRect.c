/*
 * @file oledc_drawRect.c
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

int _width, _height;

// Draw a rectangle
void oledc_drawRect(int x, int y, int w, int h, unsigned int color)
{

  while(oledc_screenLock());  
  oledc_screenLockSet();
  
  if (w < 0 || h < 0) return;

  if (x < 0) x = 0;
  if (x >= _width) x = (_width-1);
  if (y < 0) y = 0;
  if (y >= _height) y = (_height-1);
  
  if(y >= 0 && y < _height)                     oledc_drawLinePrimative(x, y, x + w - 1, y, color);
  if((y + h - 1) >= 0 && (y + h - 1) < _height) oledc_drawLinePrimative(x, y + h - 1, x + w - 1, y + h - 1, color);
  if(x >= 0 && x < _width)                      oledc_drawLinePrimative(x, y, x, y + h - 1, color);
  if((x + w - 1) >= 0 && (x + w - 1) < _width)  oledc_drawLinePrimative(x + w - 1, y, x + w - 1, y + h - 1, color);

  oledc_screenLockClr();
}

// Parts of this file are from the Adafruit GFX arduino library

/***************************************************
  This is a library for the 0.96" 16-bit Color OLED with SSD1331 driver chip
  Pick one up today in the adafruit shop!
  ------> http://www.adafruit.com/products/684
  These displays use SPI to communicate, 4 or 5 pins are required to
  interface
  Adafruit invests time and resources providing this open source code,
  please support Adafruit and open-source hardware by purchasing
  products from Adafruit!
  Written by Limor Fried/Ladyada for Adafruit Industries.
  BSD license, all text above must be included in any redistribution
 ****************************************************/

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
