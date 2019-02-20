/**
 * @file LSM9DS1_SPIread.c
 *
 * @author Matthew Matz
 *
 * @version 0.5
 *
 * @copyright
 * Copyright (C) Parallax, Inc. 2016. All Rights MIT Licensed.
 *
 * @brief This Propeller C library was created for the Parallax 9-axis IMU Sensor, based
 * on the STMicroelectronics LSM9DS1 inertial motion sensor chip.
 */


#include "simpletools.h"
#include "lsm9ds1.h"


int __pinM, __pinSDIO, __pinSCL;

void imu_SPIreadBytes(unsigned char csPin, unsigned char subAddress, unsigned char *dest, unsigned char count)
{
  // To indicate a read, set bit 0 (msb) of first byte to 1
  unsigned char rAddress = 0x80 | (subAddress & 0x3F);

  // Mag SPI port is different. If we're reading multiple bytes, 
  // set bit 1 to 1. The remaining six bytes are the address to be read
  if ((csPin == __pinM) && count > 1) rAddress |= 0x40;
	
  low(csPin);
  shift_out(__pinSDIO, __pinSCL, MSBFIRST, 8, rAddress); 
  for (int i=0; i<count; i++)
  {  
    dest[i] = shift_in(__pinSDIO, __pinSCL, MSBPRE, 8);
  }
  high(csPin);
}


/*
 * Based on the Arduino Library for the LSM9SD1 by Jim Lindblom of Sparkfun Electronics
 */

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