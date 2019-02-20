/**
 * @file LSM9DS1_setAccelScale.c
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

unsigned char __settings_accel_scale;
float __aRes;


void imu_setAccelScale(unsigned char aScl)
{
  if ((aScl != 2) && (aScl != 4) && (aScl != 8) && (aScl != 16))  aScl = 2;

  __aRes = 32768.0 / ((float) aScl);
  __settings_accel_scale = aScl;

  // We need to preserve the other bytes in CTRL_REG6_XL. So, first read it:
  unsigned char tempRegValue;
  imu_SPIreadBytes(__pinAG, CTRL_REG6_XL, &tempRegValue, 1);
  // Mask out accel scale bits:
  tempRegValue &= 0xE7;
  
  switch (aScl)
  {
    case 4:
      tempRegValue |= (0x2 << 3);
      break;
    case 8:
      tempRegValue |= (0x3 << 3);
      break;
    case 16:
      tempRegValue |= (0x1 << 3);
      break;
    default:
      break;
  }
  
  imu_SPIwriteByte(__pinAG, CTRL_REG6_XL, tempRegValue);
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