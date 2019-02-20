/*
 * @file oledc_setText.c
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
int _font[5];

void oledc_setTextSize(char s) {
  if(_font[0] == 0) 
  {
    textsize = 1;
  } else {
    textsize = s;
    if(s < 1) textsize = 1;
    if(s > 3) textsize = 3;
  }    
}

void oledc_setTextColor(unsigned int c, unsigned int b) {
  textcolor   = c;
  textbgcolor = b;
}

void oledc_setTextWrap(char w) {
  wrap = w;
}

void oledc_setTextFont(char f) {
  
  if( f == 3 )        // Bubble
  {
    _font[1] = 44544;	
    _font[2] = 44416;	
    _font[3] = 43648;	
    _font[4] = 40576;	
  }
  else if ( f == 2 )  // Serif
  {      
	 _font[1] = 50048;
	 _font[2] = 49920;
	 _font[3] = 49152;
	 _font[4] = 46720;
  }
  else if ( f == 1 )  // Script
  {      
    _font[1] = 55552;
    _font[2] = 55424;
    _font[3] = 54656;
    _font[4] = 52224;
  }
  else                // Sans
  {      
    _font[1] = 61184;
    _font[2] = 61056;
    _font[3] = 60288;
    _font[4] = 57728;
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
