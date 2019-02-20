/*
 * @file oledc_drawCircleHelper.c
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

void oledc_drawCircleHelper( int x0, int y0, int r, char cornername, unsigned int color)
{
  int f     = 1 - r;
  int ddF_x = 1;
  int ddF_y = -2 * r;
  int x     = 0;
  int y     = r;

  while (x < y)
  {
    if (f >= 0)
    {
      y--;
      ddF_y += 2;
      f     += ddF_y;
    }
    x++;
    ddF_x += 2;
    f     += ddF_x;
    if (cornername & 0x4) {
      oledc_drawPixelPrimative(x0 + x, y0 + y, color);
      oledc_drawPixelPrimative(x0 + y, y0 + x, color);
    }
    if (cornername & 0x2) {
      oledc_drawPixelPrimative(x0 + x, y0 - y, color);
      oledc_drawPixelPrimative(x0 + y, y0 - x, color);
    }
    if (cornername & 0x8) {
      oledc_drawPixelPrimative(x0 - y, y0 + x, color);
      oledc_drawPixelPrimative(x0 - x, y0 + y, color);
    }
    if (cornername & 0x1) {
      oledc_drawPixelPrimative(x0 - y, y0 - x, color);
      oledc_drawPixelPrimative(x0 - x, y0 - y, color);
    }
  }

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
