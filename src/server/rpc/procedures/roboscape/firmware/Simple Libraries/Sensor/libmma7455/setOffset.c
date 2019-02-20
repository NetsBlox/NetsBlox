/*
 * @file setOffset.c
 *
 * @author Andy Lindsay
 *
 * @version 0.50
 *
 * @copyright
 * Copyright (C) Parallax, Inc. 2014. All Rights MIT Licensed.
 *
 * @brief Sets x, y, and z offset values for the Parallax MMA7455 3-Axis 
 * Accelerometer Module.
 */


#include "simpletools.h"
#include "mma7455.h"


int MMA7455_pinDat, MMA7455_pinClk, MMA7455_pinEn;
int MMA7455_gRangeVal;


void MMA7455_setOffsetX(signed short offset)
{
  MMA7455_writeByte(MMA7455_XOFFL, (unsigned char) offset);
  MMA7455_writeByte(MMA7455_XOFFH, (unsigned char) (offset >> 8));
}

void MMA7455_setOffsetY(signed short offset)
{
  MMA7455_writeByte(MMA7455_YOFFL, (unsigned char) offset);
  MMA7455_writeByte(MMA7455_YOFFH, (unsigned char) (offset >> 8));
}

void MMA7455_setOffsetZ(signed short offset)
{
  MMA7455_writeByte(MMA7455_ZOFFL, (unsigned char) offset);
  MMA7455_writeByte(MMA7455_ZOFFH, (unsigned char) (offset >> 8));
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


