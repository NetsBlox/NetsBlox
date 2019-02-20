/**
 * @file itoa.c
 *
 * @author Andy Lindsay
 * Started with
 * http://stackoverflow.com/questions/9655202/
 *      how-to-convert-integer-to-string-in-c
 *  Thanks to bhuwansahni.
 * Added support for number bases
 *
 * @version 0.85
 *
 * @copyright Copyright (C) Parallax, Inc. 2012.  See end of file for
 * terms of use (MIT License).
 *
 * @brief write function source, see simpletools.h for documentation.
 *
 * @detail Please submit bug reports, suggestions, and improvements to
 * this code to editor@parallax.com.
 */

#include "simpletools.h"                      // simpletools function prototypes

char* itoa(int i, char b[], int base){
  char const digit[] = "0123456789ABCDEF";
  char* p = b;
  if(i<0){
    *p++ = '-';
    i = -1;
  }
  int shifter = i;
  do{ //Move to where representation ends
    ++p;
    shifter = shifter/base;
  }while(shifter);
  *p = '\0';
  do{ //Move back, inserting digits as u go
    *--p = digit[i%base];
    i = i/base;
  }while(i);
  return b;
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
