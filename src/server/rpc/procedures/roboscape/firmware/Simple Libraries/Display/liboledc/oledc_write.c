/*
 * @file oledc_write.c
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

char wrap;
unsigned int textsize, textcolor, textbgcolor;
int _width, _height, cursor_x, cursor_y;


void oledc_write(char c) {
  if (c == '\n') {
    cursor_y += textsize * 8;
    cursor_x  = 0;
  } else if (c == '\r') {
    // skip em
  } else {
    if (wrap && ((cursor_x + textsize * 6) > _width)) { // Heading off edge?
      cursor_x  = 0;            // Reset x to zero
      cursor_y += textsize * 8; // Advance y one line
    }
    if (wrap && ((cursor_y + textsize * 8) > _height)) { // Heading below bottom?
      cursor_x = 0;
      cursor_y = 0;
    }
    if (c < 32 || c > 126)  // draw unknown charachters as boxes
    {
      if (textcolor != textbgcolor) oledc_fillRect(cursor_x, cursor_y, textsize * 6, textsize * 8, textbgcolor);
      oledc_drawRect(cursor_x + 1, cursor_y + 1, textsize * 6 - 2, textsize * 8 - 2, textcolor);
      if (textsize > 1) oledc_drawRect(cursor_x + 2, cursor_y + 2, textsize * 6 - 4, textsize * 8 - 4, textcolor);
      if (textsize > 2) oledc_drawRect(cursor_x + 3, cursor_y + 3, textsize * 6 - 6, textsize * 8 - 6, textcolor);

    } else {
      
      if ((cursor_x >= _width)        || // Clip right
      (cursor_y >= _height)           || // Clip bottom
      ((cursor_x + 6 * textsize - 1) < 0) || // Clip left
      ((cursor_y + 8 * textsize - 1) < 0))   // Clip top
      return;

      if (c == 32)
      {
        if (textcolor != textbgcolor) oledc_fillRect(cursor_x, cursor_y, textsize * 6, textsize * 8 + 1, textbgcolor);
      } else {    
        if (textsize == 1) oledc_drawCharSmall(cursor_x, cursor_y, c, textcolor, textbgcolor);
//#ifdef OLED_FONT_MEDIUM
        if (textsize == 2) oledc_drawCharMedium(cursor_x, cursor_y, c, textcolor, textbgcolor);
//#endif
//#ifdef  OLED_FONT_LARGE
        if (textsize == 3) oledc_drawCharLarge(cursor_x, cursor_y, c, textcolor, textbgcolor);
//#endif
      }      
    }
    cursor_x += textsize * 6;
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
