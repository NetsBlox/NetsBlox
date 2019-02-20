/*
 * @file readByte.c
 *
 * @author Andy Lindsay
 *
 * @version 0.50
 *
 * @copyright
 * Copyright (C) Parallax, Inc. 2014. All Rights MIT Licensed.
 *
 * @brief Reads a byte from a register in the Parallax MMA7455 3-Axis Accelerometer 
 * Module.
 */


#include "simpletools.h"                        
#include "mma7455.h"


#define MMA7455_readMask   ~(1 << 6)            // Read mask for clearing bit 6

                                                  
int MMA7455_pinDat, MMA7455_pinClk, MMA7455_pinEn;
int MMA7455_gRangeVal;


unsigned char MMA7455_readByte(unsigned char address)
{
  low(MMA7455_pinEn);                                   
  int cmd = address & MMA7455_readMask;                          
  shift_out(MMA7455_pinDat, MMA7455_pinClk, MSBFIRST, 7, cmd);
  shift_out(MMA7455_pinDat, MMA7455_pinClk, MSBFIRST, 1, 0b0);
  unsigned char result = shift_in(MMA7455_pinDat, MMA7455_pinClk, MSBPRE, 8);
  high(MMA7455_pinEn);                                  
  return result;
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



