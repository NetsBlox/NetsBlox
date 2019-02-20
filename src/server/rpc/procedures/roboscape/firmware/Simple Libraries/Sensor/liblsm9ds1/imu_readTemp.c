/**
 * @file LSM9DS1_readTemp.c
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

void imu_readTemp(int *temperature)
{
  unsigned char temp[2]; // We'll read two bytes from the temperature sensor into temp  
  short tempT;

  imu_SPIreadBytes(__pinAG, OUT_TEMP_L, temp, 2); // Read 2 bytes, beginning at OUT_TEMP_L
  tempT = (temp[1] << 8) | temp[0];

  *temperature = (int) tempT;
}

void imu_readTempCalculated(float *temperature, char tempUnit)
{
  int tempTemp;
  imu_readTemp(&tempTemp);
  if(tempUnit == FAHRENHEIT)  *temperature = (((float) tempTemp / 16) + 25.0) * 1.8 + 32.0;
  else                        *temperature = ((float) tempTemp / 16) + 25.0;
  if(tempUnit == KELVIN)      *temperature += 273.15;
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