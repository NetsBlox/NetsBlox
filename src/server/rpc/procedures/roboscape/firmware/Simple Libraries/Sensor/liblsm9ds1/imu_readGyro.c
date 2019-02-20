/**
 * @file LSM9DS1_readGyro.c
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

float __gRes;
float __gBias[3];
int __gBiasRaw[3];
char __autoCalc;


void imu_readGyro(int *gx, int *gy, int *gz)
{
  unsigned char temp[6]; // We'll read six bytes from the gyro into temp
  short tempX, tempY, tempZ;
  
  imu_SPIreadBytes(__pinAG, OUT_X_L_G, temp, 6); // Read 6 bytes, beginning at OUT_X_L_G
  tempX = (temp[1] << 8) | temp[0]; // Store x-axis values into gx
  tempY = (temp[3] << 8) | temp[2]; // Store y-axis values into gy
  tempZ = (temp[5] << 8) | temp[4]; // Store z-axis values into gz
  
  *gx = (int) tempX;
  *gy = (int) tempY;
  *gz = (int) tempZ;
  
  if (__autoCalc)
  {
    *gx -= __gBiasRaw[X_AXIS];
    *gy -= __gBiasRaw[Y_AXIS];
    *gz -= __gBiasRaw[Z_AXIS];
  }
}

void imu_readGyroCalculated(float *gx, float *gy, float *gz)
{
  // Return the gyro raw reading times our pre-calculated DPS / (ADC tick):
  int tempX, tempY, tempZ;

  imu_readGyro(&tempX, &tempY, &tempZ);

  *gx = ((float) tempX) / __gRes;
  *gy = ((float) tempY) / __gRes;
  *gz = ((float) tempZ) / __gRes;
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