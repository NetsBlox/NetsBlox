/**
 * @file LSM9DS1_readAccel.c
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

float __aRes;
float __aBias[3];
int __aBiasRaw[3];
char __autoCalc;


void imu_readAccel(int *ax, int *ay, int *az)
{
  unsigned char temp[6]; // We'll read six bytes from the accelerometer into temp  
  short tempX, tempY, tempZ;
  
  imu_SPIreadBytes(__pinAG, OUT_X_L_XL, temp, 6); // Read 6 bytes, beginning at OUT_X_L_XL
  tempX = (temp[1] << 8) | temp[0]; // Store x-axis values into ax
  tempY = (temp[3] << 8) | temp[2]; // Store y-axis values into ay
  tempZ = (temp[5] << 8) | temp[4]; // Store z-axis values into az
  
  *ax = (int) tempX;
  *ay = (int) tempY;
  *az = (int) tempZ;

  if (__autoCalc)
  {
    *ax -= __aBiasRaw[X_AXIS];
    *ay -= __aBiasRaw[Y_AXIS];
    *az -= __aBiasRaw[Z_AXIS];
  }
}

void imu_readAccelCalculated(float *ax, float *ay, float *az)
{
  // Return the accel raw reading times our pre-calculated g's / (ADC tick):
  int tempX, tempY, tempZ;

  imu_readAccel(&tempX, &tempY, &tempZ);

  *ax = ((float) tempX) / __aRes;
  *ay = ((float) tempY) / __aRes;
  *az = ((float) tempZ) / __aRes;
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