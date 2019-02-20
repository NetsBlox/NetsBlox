/*
 * @file oledc_drawLine.c
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

char TFTROTATION;
int _width, _height;
typedef int OutCode;

const int INSIDE = 0; // 0000
const int LEFT = 1;   // 0001
const int RIGHT = 2;  // 0010
const int BOTTOM = 4; // 0100
const int TOP = 8;    // 1000

// Compute the bit code for a point (x, y) using the clip rectangle
// bounded diagonally by (xmin, ymin), and (xmax, ymax)

// ASSUME THAT xmax, xmin, ymax and ymin are global constants.

OutCode ComputeOutCode(int x, int y)
{
  OutCode code;

  code = INSIDE;          // initialised as being inside of [[clip window]]

  if      (x < 0)          code |= LEFT;          // to the left of clip window
  else if (x >= TFTWIDTH)  code |= RIGHT;     // to the right of clip window
  if      (y < 0)          code |= TOP;          // below the clip window
  else if (y >= TFTHEIGHT) code |= BOTTOM;     // above the clip window
    

  return code;
}


void oledc_drawLinePrimative(int x0, int y0, int x1, int y1, unsigned int color)
{

  // check rotation, move pixel around if necessary
  switch (TFTROTATION) {
    case 1:
      gfx_swap(x0, y0);
      gfx_swap(x1, y1);
      x0 = TFTWIDTH - x0 - 1;
      x1 = TFTWIDTH - x1 - 1;
      //gfx_swap(x0, x1);
      break;
    case 2:
      gfx_swap(x0, x1);
      gfx_swap(y0, y1);
      x0 = TFTWIDTH - x0 - 1;
      y0 = TFTHEIGHT - y0 - 1;
      x1 = TFTWIDTH - x1 - 1;
      y1 = TFTHEIGHT - y1 - 1;
      break;
    case 3:
      gfx_swap(x0, y0);
      gfx_swap(x1, y1);
      y0 = TFTHEIGHT - y0 - 1;
      y1 = TFTHEIGHT - y1 - 1;
      //gfx_swap(y0, y1);
      break;
  }


  // Cohen–Sutherland clipping algorithm clips a line from
  // P0 = (x0, y0) to P1 = (x1, y1) against a rectangle with
  // diagonal from (xmin, ymin) to (xmax, ymax).
  // compute outcodes for P0, P1, and whatever point lies outside the clip rectangle

  OutCode outcode0 = ComputeOutCode(x0, y0);
  OutCode outcode1 = ComputeOutCode(x1, y1);
  char accept = 0;

  while (1) {
    if (!(outcode0 | outcode1)) { // Bitwise OR is 0. Trivially accept and get out of loop
      accept = 1;
      break;
    } else if (outcode0 & outcode1) { // Bitwise AND is not 0. Trivially reject and get out of loop
      break;
    } else {
      // failed both tests, so calculate the line segment to clip
      // from an outside point to an intersection with clip edge
      int x, y;

      // At least one endpoint is outside the clip rectangle; pick it.
      OutCode outcodeOut = outcode0 ? outcode0 : outcode1;

      // Now find the intersection point;
      // use formulas y = y0 + slope * (x - x0), x = x0 + (1 / slope) * (y - y0)
      if (outcodeOut & TOP) { // point is above the clip rectangle
        x = x0 + (x1 - x0) * (0 - y0) / (y1 - y0);
        y = 0;
      } else if (outcodeOut & BOTTOM) {           // point is below the clip rectangle
        x = x0 + (x1 - x0) * (TFTHEIGHT - y0 - 1) / (y1 - y0);
        y = TFTHEIGHT - 1;
      } else if (outcodeOut & RIGHT) {  // point is to the right of clip rectangle
        y = y0 + (y1 - y0) * (TFTWIDTH - x0 - 1) / (x1 - x0);
        x = TFTWIDTH - 1;
      } else if (outcodeOut & LEFT) {   // point is to the left of clip rectangle
        y = y0 + (y1 - y0) * (0 - x0) / (x1 - x0);
        x = 0;
      }

      // Now we move outside point to intersection point to clip
      // and get ready for next pass.
      if (outcodeOut == outcode0) {
        x0 = x;
        y0 = y;
        outcode0 = ComputeOutCode(x0, y0);
      } else {
        x1 = x;
        y1 = y;
        outcode1 = ComputeOutCode(x1, y1);
      }
    }
  }
  
  if (accept) {

    oledc_writeCommand(SSD1331_CMD_DRAWLINE, 0);

    oledc_writeCommand(x0, 0);
    oledc_writeCommand(y0, 0);
    oledc_writeCommand(x1, 0);
    oledc_writeCommand(y1, 0);

    oledc_writeCommand((color >> 11) << 1, 0);
    oledc_writeCommand((color >> 5) & 0x3F, 0);
    oledc_writeCommand((color << 1) & 0x3F, 0);

    int _tMark = CNT + (CLKFREQ / 100000);
    while (_tMark > CNT);                         // Wait for system clock target

  }
}


void oledc_drawLine(int x0, int y0, int x1, int y1, unsigned int color)
{
  while (oledc_screenLock());
  oledc_screenLockSet();

  oledc_drawLinePrimative(x0, y0, x1, y1,color);
  
  oledc_screenLockClr();
}  


// Parts of this file are from the Adafruit GFX arduino library, other parts are from Wikipedia:
// https://en.wikipedia.org/wiki/Cohen%E2%80%93Sutherland_algorithm

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
