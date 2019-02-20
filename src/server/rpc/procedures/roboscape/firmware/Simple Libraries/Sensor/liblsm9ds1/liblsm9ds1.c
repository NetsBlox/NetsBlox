/**
 * @file libLSM9DS1.c
 *
 * @author Matthew Matz
 *
 * @version 0.6
 *
 * @copyright
 * Copyright (C) Parallax, Inc. 2016. All Rights MIT Licensed.
 *
 * @brief Test harness for the Propeller C library for the Parallax 9-axis IMU Sensor, based
 * on the STMicroelectronics LSM9DS1 inertial motion sensor chip.
 */


#include "lsm9ds1.h"
#include "simpletools.h"

//#define TEST_HARNESS    1



float gx, gy, gz; // x, y, and z axis readings of the gyroscope
float ax, ay, az; // x, y, and z axis readings of the accelerometer
float mx, my, mz; // x, y, and z axis readings of the magnetometer
float tmp;


int main() {
  
#ifdef TEST_HARNESS
  
  int whoAmI = imu_init(6, 7, 8, 9);

  print("Who Am I? %x\r", whoAmI);
  
  imu_clearAccelInterrupt();
  imu_setAccelInterrupt(Y_AXIS, 1.1, 20, 1, 0);

  while(1) {
/*
    if(input(10))
    {
      high(26);
      imu_readAccelCalculated(&ax, &ay, &az);  
      print("Accel:\t%.2f\t%.2f\t%.2f\r", ax, ay, az);
 
      pause(250);
    }      
    else 
    {
      low(26);
      pause(1);
    }    
*/    
    imu_readGyroCalculated(&gx, &gy, &gz);
    print("Gyro:\t%.2f\t%.2f\t%.2f\r", gx, gy, gz);
  
    imu_readAccelCalculated(&ax, &ay, &az);  
    print("Accel:\t%.2f\t%.2f\t%.2f\r", ax, ay, az);
  
    imu_readMagCalculated(&mz, &my, &mz);
    print("Mag:\t%.2f\t%.2f\t%.2f\r", mz, my, mz);
    
    imu_readTempCalculated(&tmp, FAHRENHEIT);
    print("Temp:\t%.2f\r\r", tmp);
/*
    imu_readGyro(&gx, &gy, &gz);
    print("Gyro:\t%d\t%d\t%d\r", gx, gy, gz);
  
    imu_readAccel(&ax, &ay, &az);  
    print("Accel:\t%d\t%d\t%d\r", ax, ay, az);
  
    imu_readMag(&mz, &my, &mz);
    print("Mag:\t%d\t%d\t%d\r", mz, my, mz);
    
    imu_readTemp(&tmp);
    print("Temp:\t%d\r\r", tmp);
*/       
    pause(500);
  }
  

#endif
}




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