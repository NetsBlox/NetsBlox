/*
 * @file shiftIn.c
 *
 * @author Andy Lindsay
 *
 * @version 0.85
 *
 * @copyright Copyright (C) Parallax, Inc. 2012.  See end of file for
 * terms of use (MIT License).
 *
 * @brief shiftIn function source, see simpletools.h for documentation.
 *
 * @detail Please submit bug reports, suggestions, and improvements to
 * this code to editor@parallax.com.
 */

#include "simpletools.h"                         // simpletools function prototypes

// shiftIn function definition
int shift_in(int pinDat, int pinClk, int mode, int bits)
{
  int vi, vf, inc;
  int value = 0; 
  int preflag = 0;
  if((mode == MSBPRE)||(mode == LSBPRE)) preflag = 1;
  switch(mode)
  {
    case MSBPRE:
      vi = bits - 1;
      vf = -1;
      inc = -1;
      //value |= (input(pinDat) << bits);
      break;
    case LSBPRE:
      vi = 0;
      vf = bits;
      inc = 1;
      value |= input(pinDat);
      break;
    case MSBPOST:
      vi = bits -1;
      vf = -1;
      inc = -1;
      break;
    default: // case LSBPOST:
      vi = 0;
      vf = bits;
      inc = 1;
      break;
  }   
  low(pinClk);
  int i;
  for(i = vi; i != vf; i += inc)
  {
    if(preflag) value |= (input(pinDat) << i); 
    toggle(pinClk);
    toggle(pinClk);
    //if(!i)
    //{
    //  if(preflag) break;
    //}
    if(!preflag) value |= (input(pinDat) << i); 
  }
  return value;
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
