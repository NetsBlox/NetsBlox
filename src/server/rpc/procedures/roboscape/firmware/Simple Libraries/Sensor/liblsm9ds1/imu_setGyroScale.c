/**
 * @file LSM9DS1_setGyroScale.c
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


int __pinAG;

unsigned int  __settings_gyro_scale = 2000;
float __gRes;


void imu_setGyroScale(unsigned int gScl)
{
  if ((gScl != 245) && (gScl != 500) && (gScl != 2000)) gScl = 245;

  __settings_gyro_scale = gScl;
  __gRes = 32768.0 / ((float) gScl);

  // Read current value of CTRL_REG1_G:
  unsigned char ctrl1RegValue;
  imu_SPIreadBytes(__pinAG, CTRL_REG1_G, &ctrl1RegValue, 1);
  // Mask out scale bits (3 & 4):
  ctrl1RegValue &= 0xE7;

  switch (gScl)
  {
    case 500:
      ctrl1RegValue |= (0x1 << 3);
      500;
      break;
    case 2000:
      ctrl1RegValue |= (0x3 << 3);
      break;
    default:
      break;
  }
  imu_SPIwriteByte(__pinAG, CTRL_REG1_G, ctrl1RegValue);  
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