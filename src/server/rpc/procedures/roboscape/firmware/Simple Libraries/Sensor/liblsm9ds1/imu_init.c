/**
 * @file imu_init.c
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

int __pinAG, __pinM, __pinSDIO, __pinSCL;
char __autoCalc = 0;

int imu_init(int pinSCL, int pinSDIO, int pinAG, int pinM)
{ 
  __pinAG   = pinAG;
  __pinM    = pinM;
  __pinSDIO = pinSDIO;
  __pinSCL  = pinSCL;

  high(__pinAG);                               
  high(__pinM);                               
  low(__pinSCL);                              // Pin output state to low

  pause(1);
  
  // Set both the Accel/Gyro and Mag to 3-wire SPI mode
  imu_SPIwriteByte(__pinAG, CTRL_REG8, 0b00001100);
  imu_SPIwriteByte(__pinM, CTRL_REG3_M, 0b10000100);
   
  // To verify communication, we can read from the WHO_AM_I register of
  // each device. Store those in a variable so we can return them.
  char xgTest, mTest;
  imu_SPIreadBytes(__pinM, WHO_AM_I_M, &mTest, 1);     // Read the gyro WHO_AM_I
  imu_SPIreadBytes(__pinAG, WHO_AM_I_XG, &xgTest, 1);  // Read the accel/mag WHO_AM_I
  int whoAmICombined = (xgTest << 8) | mTest;
  
  if (whoAmICombined != ((WHO_AM_I_AG_RSP << 8) | WHO_AM_I_M_RSP)) return 0;
  
  //Init Gyro
  imu_SPIwriteByte(__pinAG, CTRL_REG1_G,  0xC0);
  imu_SPIwriteByte(__pinAG, CTRL_REG2_G,  0x00);  
  imu_SPIwriteByte(__pinAG, CTRL_REG3_G,  0x00);
  imu_SPIwriteByte(__pinAG, CTRL_REG4,    0x38);
  imu_SPIwriteByte(__pinAG, ORIENT_CFG_G, 0x00);

  //Init Accel
  imu_SPIwriteByte(__pinAG, CTRL_REG5_XL, 0x38);
  imu_SPIwriteByte(__pinAG, CTRL_REG6_XL, 0xC0);
  imu_SPIwriteByte(__pinAG, CTRL_REG7_XL, 0x00);

  //Init Mag
  imu_SPIwriteByte(__pinM,  CTRL_REG2_M,  0x00);
  imu_SPIwriteByte(__pinM,  CTRL_REG4_M,  0x0C);
  imu_SPIwriteByte(__pinM,  CTRL_REG5_M,  0x00);

  //Set Scales
  imu_setGyroScale(500);
  imu_setAccelScale(8);
  imu_setMagScale(12);

  // Once everything is initialized, return the WHO_AM_I registers we read:
  return whoAmICombined;
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