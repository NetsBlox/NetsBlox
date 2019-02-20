/**
 * @file LSM9DS1_calibrateAG.c
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



#include <propeller.h>
#include "lsm9ds1.h"


int __pinAG;
float __gRes, __aRes;
float __gBias[3]  = {0,0,0};
float __aBias[3]  = {0,0,0};
int __gBiasRaw[3] = {0,0,0};
int __aBiasRaw[3] = {0,0,0};
char __autoCalc;


void imu_calibrateAG()
{  
  unsigned char data[6] = {0, 0, 0, 0, 0, 0};
  unsigned char samples = 0;
  int ii;
  int ax, ay, az, gx, gy, gz;
  int aBiasRawTemp[3]   = {0, 0, 0};
  int gBiasRawTemp[3]   = {0, 0, 0};
  
  // Turn on FIFO and set threshold to 32 samples
  unsigned char tempF;
  imu_SPIreadBytes(__pinAG, CTRL_REG9, &tempF, 1);
  tempF |= (1<<1);
  imu_SPIwriteByte(__pinAG, CTRL_REG9, tempF);
  imu_SPIwriteByte(__pinAG, FIFO_CTRL, (((FIFO_THS & 0x7) << 5) | 0x1F));

  
  while (samples < 0x1F)
  {
    unsigned char tempS;
    imu_SPIreadBytes(__pinAG, FIFO_SRC, &tempS, 1);       // Read number of stored samples
    samples = tempS & 0x3F;
  }

  for(ii = 0; ii < samples ; ii++) 
  { 
    // Read the gyro data stored in the FIFO
    imu_readGyro(&gx, &gy, &gz);
    gBiasRawTemp[0] += gx;
    gBiasRawTemp[1] += gy;
    gBiasRawTemp[2] += gz;
    imu_readAccel(&ax, &ay, &az);
    aBiasRawTemp[0] += ax;
    aBiasRawTemp[1] += ay;
    aBiasRawTemp[2] += az - ((int) __aRes);    // Assumes sensor facing up!
  }  

  for (ii = 0; ii < 3; ii++)
  {
    __gBiasRaw[ii] = gBiasRawTemp[ii] / samples;
    __gBias[ii]    = ((float) __gBiasRaw[ii]) / __gRes;
    __aBiasRaw[ii] = aBiasRawTemp[ii] / samples;
    __aBias[ii]    = ((float) __aBiasRaw[ii]) / __aRes;
  }
 
  __autoCalc = 1; 
  
  //Disable FIFO
  imu_SPIreadBytes(__pinAG, CTRL_REG9, &tempF, 1);
  tempF &= ~(1<<1);
  imu_SPIwriteByte(__pinAG, CTRL_REG9, tempF);  
  imu_SPIwriteByte(__pinAG, FIFO_CTRL, ((FIFO_OFF & 0x7) << 5));

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