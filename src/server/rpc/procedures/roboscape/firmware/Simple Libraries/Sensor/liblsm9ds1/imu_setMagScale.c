/**
 * @file LSM9DS1_setMagScale.c
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



#include "lsm9ds1.h"


int __pinM;
float __mRes;
unsigned char __settings_mag_scale = 16;


void imu_setMagScale(unsigned char mScl)
{
  if ((mScl != 4) && (mScl != 8) && (mScl != 12) && (mScl != 16)) mScl = 4;
 
  // We need to preserve the other bytes in CTRL_REG6_XM. So, first read it:
  unsigned char temp;
  imu_SPIreadBytes(__pinM, CTRL_REG2_M, &temp, 1);
  // Then mask out the mag scale bits:
  temp &= 0xFF^(0x3 << 5);
  
  switch (mScl)
  {
  case 8:
    temp |= (0x1 << 5);
    __settings_mag_scale = 8;
    __mRes = 3448.28;
    break;
  case 12:
    temp |= (0x2 << 5);
    __settings_mag_scale = 12;
    __mRes = 2298.85;
    break;
  case 16:
    temp |= (0x3 << 5);
    __settings_mag_scale = 16;
    __mRes = 1724.14;
    break;
  default:
    __settings_mag_scale = 4;
    __mRes = 6896.55;
    break;
  }  
  
  imu_SPIwriteByte(__pinM, CTRL_REG2_M, temp);
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