/**
 * @file LSM9DS1_readMag.c
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


void imu_readMag(int *mx, int *my, int *mz)
{
  unsigned char temp[6]; // We'll read six bytes from the mag into temp  
  short tempX, tempY, tempZ;
  
  imu_SPIreadBytes(__pinM, OUT_X_L_M, temp, 6); // Read 6 bytes, beginning at OUT_X_L_M
  tempX = (temp[1] << 8) | temp[0]; // Store x-axis values into gx
  tempY = (temp[3] << 8) | temp[2]; // Store y-axis values into gy
  tempZ = (temp[5] << 8) | temp[4]; // Store z-axis values into gz
  
  *mx = (int) tempX;
  *my = (int) tempY;
  *mz = (int) tempZ;
}


void imu_readMagCalculated(float *mx, float *my, float *mz)
{
  // Return the mag raw reading times our pre-calculated Gs / (ADC tick):
  int tempX, tempY, tempZ;

  imu_readMag(&tempX, &tempY, &tempZ);

  *mx = ((float) tempX) / __mRes;
  *my = ((float) tempY) / __mRes;
  *mz = ((float) tempZ) / __mRes;
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