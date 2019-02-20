/*
 * @file getxyz10.c
 *
 * @author Andy Lindsay
 *
 * @version 0.50
 *
 * @copyright
 * Copyright (C) Parallax, Inc. 2014. All Rights MIT Licensed.
 *
 * @brief Gets 10 bit x, y, and z axis measurements from the Parallax MMA7455 
 * 3-Axis Accelerometer Module.
 */


#include "simpletools.h"
#include "mma7455.h"


int MMA7455_pinDat, MMA7455_pinClk, MMA7455_pinEn;


void MMA7455_getxyz10(signed short *x, signed short *y, signed short *z)
{
  int temp;
  unsigned char byteLow, byteHigh;
  int regAddr[6] = {MMA7455_XOUTL, MMA7455_XOUTH, MMA7455_YOUTL, MMA7455_YOUTH, MMA7455_ZOUTL, MMA7455_ZOUTH};
  signed short *val[3] = {x, y, z};
  for(int i = 0; i < 6; i += 2)
  {
    byteLow = MMA7455_readByte(regAddr[i]); // Get value from register
    byteHigh = MMA7455_readByte(regAddr[i+1]); // Get value from register
    if((1 & (byteHigh >> 1))) byteHigh |= 0b11111100;
    *val[i/2] = ((signed short) byteHigh << 8) | byteLow;                                                                    
  }
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


