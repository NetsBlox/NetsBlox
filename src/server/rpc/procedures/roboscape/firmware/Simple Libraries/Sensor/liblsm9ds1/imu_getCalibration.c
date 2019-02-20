/**
 * @file LSM9DS1_getCalibration.c
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

int __gBiasRaw[3];
int __aBiasRaw[3];
int __mBiasRaw[3];

void imu_getMagCalibration(int *mxBias, int *myBias, int *mzBias)
{
  *mxBias = __mBiasRaw[X_AXIS];
  *myBias = __mBiasRaw[Y_AXIS];
  *mzBias = __mBiasRaw[Z_AXIS];  
}  

void imu_getAccelCalibration(int *axBias, int *ayBias, int *azBias)
{
  *axBias = __aBiasRaw[X_AXIS];
  *ayBias = __aBiasRaw[Y_AXIS];
  *azBias = __aBiasRaw[Z_AXIS];  
}  

void imu_getGyroCalibration(int *gxBias, int *gyBias, int *gzBias)
{
  *gxBias = __gBiasRaw[X_AXIS];
  *gyBias = __gBiasRaw[Y_AXIS];
  *gzBias = __gBiasRaw[Z_AXIS];  
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