/**
 * @file LSM9DS1.h
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


#ifndef __LSM9DS1_IMU_SENSOR_H__                             // Prevents duplicate
#define __LSM9DS1_IMU_SENSOR_H__                             // declarations

#if defined(__cplusplus)                                     // If compiling for C++
extern "C" {                                                 // Compile for C
#endif



// LSM9DS1 Accel/Gyro (XL/G) Registers 
#define ACT_THS           0x04
#define ACT_DUR           0x05
#define INT_GEN_CFG_XL    0x06
#define INT_GEN_THS_X_XL  0x07
#define INT_GEN_THS_Y_XL  0x08
#define INT_GEN_THS_Z_XL  0x09
#define INT_GEN_DUR_XL    0x0A
#define REFERENCE_G       0x0B
#define INT1_CTRL         0x0C
#define INT2_CTRL         0x0D
#define WHO_AM_I_XG       0x0F
#define CTRL_REG1_G       0x10
#define CTRL_REG2_G       0x11
#define CTRL_REG3_G       0x12
#define ORIENT_CFG_G      0x13
#define INT_GEN_SRC_G     0x14
#define OUT_TEMP_L        0x15
#define OUT_TEMP_H        0x16
#define STATUS_REG_0      0x17
#define OUT_X_L_G         0x18
#define OUT_X_H_G         0x19
#define OUT_Y_L_G         0x1A
#define OUT_Y_H_G         0x1B
#define OUT_Z_L_G         0x1C
#define OUT_Z_H_G         0x1D
#define CTRL_REG4         0x1E
#define CTRL_REG5_XL      0x1F
#define CTRL_REG6_XL      0x20
#define CTRL_REG7_XL      0x21
#define CTRL_REG8         0x22
#define CTRL_REG9         0x23
#define CTRL_REG10        0x24
#define INT_GEN_SRC_XL    0x26
#define STATUS_REG_1      0x27
#define OUT_X_L_XL        0x28
#define OUT_X_H_XL        0x29
#define OUT_Y_L_XL        0x2A
#define OUT_Y_H_XL        0x2B
#define OUT_Z_L_XL        0x2C
#define OUT_Z_H_XL        0x2D
#define FIFO_CTRL         0x2E
#define FIFO_SRC          0x2F
#define INT_GEN_CFG_G     0x30
#define INT_GEN_THS_XH_G  0x31
#define INT_GEN_THS_XL_G  0x32
#define INT_GEN_THS_YH_G  0x33
#define INT_GEN_THS_YL_G  0x34
#define INT_GEN_THS_ZH_G  0x35
#define INT_GEN_THS_ZL_G  0x36
#define INT_GEN_DUR_G     0x37

// LSM9DS1 Magneto Registers
#define OFFSET_X_REG_L_M  0x05
#define OFFSET_X_REG_H_M  0x06
#define OFFSET_Y_REG_L_M  0x07
#define OFFSET_Y_REG_H_M  0x08
#define OFFSET_Z_REG_L_M  0x09
#define OFFSET_Z_REG_H_M  0x0A
#define WHO_AM_I_M        0x0F
#define CTRL_REG1_M       0x20
#define CTRL_REG2_M       0x21
#define CTRL_REG3_M       0x22
#define CTRL_REG4_M       0x23
#define CTRL_REG5_M       0x24
#define STATUS_REG_M      0x27
#define OUT_X_L_M         0x28
#define OUT_X_H_M         0x29
#define OUT_Y_L_M         0x2A
#define OUT_Y_H_M         0x2B
#define OUT_Z_L_M         0x2C
#define OUT_Z_H_M         0x2D
#define INT_CFG_M         0x30
#define INT_SRC_M         0x30
#define INT_THS_L_M       0x32
#define INT_THS_H_M       0x33

// LSM9DS1 WHO_AM_I Responses
#define WHO_AM_I_AG_RSP   0x68
#define WHO_AM_I_M_RSP    0x3D


// fifoMode_type
#define  FIFO_OFF           0
#define  FIFO_THS           1
#define  FIFO_CONT_TRIGGER  3
#define  FIFO_OFF_TRIGGER   4
#define  FIFO_CONT          5

// lsm9ds1_axis 
#define  X_AXIS             0
#define  Y_AXIS             1
#define  Z_AXIS             2
#define  ALL_AXIS           3

// temperature units
#define  CELSIUS            0
#define  FAHRENHEIT         1
#define  KELVIN             2


/**
 * @brief Initializes the LSM9DS1 IMU module.
 *
 * @details This function initializes the LSM9DS1 IMU module.  It sets
 * the chip to 3-wire SPI mode and starts up the 
 * accelerometer, gyroscope, and magnetometer. 
 *
 * @note Defaults the Accelerometer scale to +/-8g, the Gryoscope 
 * scale to +/- 500 DPS, and the Magnetometer scale to +/-12 gauss.
 *
 * @param pinSCL I/O Pin connected to the module's SCL pin.  
 *
 * @param pinSDIO I/O Pin connected to the module's SDIO pin.  
 *
 * @param pinAG I/O Pin connected to the module's CS_AG pin.  
 *
 * @param pinM I/O Pin connected to the module's CS_M pin.  
 *
 * @returns 0x683D if both the Accel/Gyro and Mag start up successfully,  
 * or 0 of neither sensor starts.
 */
int imu_init(int pinSCL, int pinSDIO, int pinAG, int pinM);


/**
 * @brief Calibrates the Accelerometer and Gyroscope on the LSM9DS1 IMU module.
 *
 * @details This is a function that uses the FIFO to accumulate sample of accelerometer and gyro data, averages
 * them, scales them to  gs and deg/s, respectively, and then passes the biases to variables in the library
 * for subtraction from all subsequent data.  Results in a more accurate measurement in general and can
 * remove errors due to imprecise or varying initial placement.
 *
 * @note Accel/Gyro Calibration values are NOT stored in the LSM9DS1.  They can be retireved and set using other
 * functions in this library.
 */
void imu_calibrateAG();


/**
 * @brief Calibrates the Magnetometer on the LSM9DS1 IMU module.
 *
 * @details This is a function accumulates samples from the magnetometer, averages
 * them, and then passes the biases back to the LSM9DS1 for subtraction from
 * all subsequent data.  Results in a more accurate measurement in general and can
 * remove errors due to imprecise or varying initial placement.  The calibration 
 * function uses the accelerometer to verify that each of the 3 axes has been pointed 
 * straight up and straight down slowly enough to get good magnetometer readings in 
 * each dimension.
 *
 * @note Mag Calibration values ARE stored in the LSM9DS1 and variables that can be retireved and set using other
 * functions in this library.
 */
void imu_calibrateMag();


/**
 * @brief Retrieves the Magnetometer's calibration biases.
 *
 * @details This function retrieves the calibration biases for each Magnetometer axis.
 * Biases can be retrieved after a Magnetometer calibration has been performed.
 *
 * @note A Magmetometer Calibration must be preformed before calling this function. This function retireves
 * the biases from RAM (so they are lost if the Propeller is powered off).
 * 
 * @param *mxBias variable to store Magnetometer x-axis bias into.
 *
 * @param *myBias variable to store Magnetometer y-axis bias into.
 *
 * @param *mzBias variable to store Magnetometer z-axis bias into.
 *
 */
void imu_getMagCalibration(int *mxBias, int *myBias, int *mzBias);


/**
 * @brief Retrieves the Accelreometer's calibration biases.
 *
 * @details This function retrieves the calibration biases for each Accelreometer axis.
 * Biases can be retrieved after a Accelreometer calibration has been performed.
 *
 * @note An Accel/Gyro Calibration must be preformed before calling this function. This function retireves
 * the biases from RAM (so they are lost if the Propeller is powered off).
 * 
 * @param *axBias variable to store Accelreometer x-axis bias into.
 *
 * @param *ayBias variable to store Accelreometer y-axis bias into.
 *
 * @param *azBias variable to store Accelreometer z-axis bias into.
 *
 */
void imu_getAccelCalibration(int *axBias, int *ayBias, int *azBias);


/**
 * @brief Retrieves the Gyroscope's calibration biases.
 *
 * @details This function retrieves the calibration biases for each Gyroscope axis.
 * Biases can be retrieved after a Gyroscope calibration has been performed.
 *
 * @note An Accel/Gyro Calibration must be preformed before calling this function. This function retireves
 * the biases from RAM (so they are lost if the Propeller is powered off).
 * 
 * @param *gxBias variable to store Gyroscope x-axis bias into.
 *
 * @param *gyBias variable to store Gyroscope y-axis bias into.
 *
 * @param *gzBias variable to store Gyroscope z-axis bias into.
 *
 */
void imu_getGyroCalibration(int *gxBias, int *gyBias, int *gzBias);


/**
 * @brief Sets the Magnetometer's calibration biases.
 *
 * @details This function sets the calibration biases for each Magnetometer axis.
 * Biases can be retrieved after the Magnetometers calibration has been set.
 *
 * @note Mag Calibration values ARE stored in the LSM9DS1 and will persist after a power cycle.
 * 
 * @param mxBias Value to set Magnetometer x-axis bias to.
 *
 * @param myBias Value to set Magnetometer y-axis bias to.
 *
 * @param mzBias Value to set Magnetometer z-axis bias tp.
 *
 */
void imu_setMagCalibration(int mxBias, int myBias, int mzBias);


/**
 * @brief Sets the Accelerometer's calibration biases.
 *
 * @details This function sets the calibration biases for each Accelerometer axis.
 * Biases can be retrieved after the Accelerometer calibration has been set.
 *
 * @note Accelerometer Calibration values ARE NOT stored in the LSM9DS1 and will not persist after a power cycle.
 * 
 * @param axBias Value to set Accelerometer x-axis bias to.
 *
 * @param ayBias Value to set Accelerometer y-axis bias to.
 *
 * @param azBias Value to set Accelerometer z-axis bias tp.
 *
 */
void imu_setAccelCalibration(int axBias, int ayBias, int azBias);


/**
 * @brief Sets the Gyroscope's calibration biases.
 *
 * @details This function sets the calibration biases for each Gyroscope axis.
 * Biases can be retrieved after the Gyroscope calibration has been set.
 *
 * @note Gyroscope Calibration values ARE NOT stored in the LSM9DS1 and will not persist after a power cycle.
 * 
 * @param gxBias Value to set Gyroscope x-axis bias to.
 *
 * @param gyBias Value to set Gyroscope y-axis bias to.
 *
 * @param gzBias Value to set Gyroscope z-axis bias tp.
 *
 */
void imu_setGyroCalibration(int gxBias, int gyBias, int gzBias);


/**
 * @brief Polls the Accelerometer status register to check
 * if new data is available.
 * 
 * @returns 1 if new data is available, 0 if no new data is available.
 */          
unsigned char imu_accelAvailable();


/**
 * @brief Polls the Gyroscope status register to check
 * if new data is available.
 * 
 * @returns 1 if new data is available, 0 if no new data is available.
 */          
unsigned char imu_gyroAvailable();


/**
 * @brief Polls the Thermometer status register to check
 * if new data is available.
 * 
 * @returns 1 if new data is available, 0 if no new data is available.
 */          
unsigned char imu_tempAvailable();


/**
 * @brief Polls the Magnetometer status register to check
 * if new data is available.
 * 
 * @returns 1 if new data is available, 0 if no new data is available.
 */          
unsigned char imu_magAvailable();


/**
 * @brief Reads the Gyroscope output registers.
 * 
 * @details This function will read all six Gyroscope output registers.
 * The readings are stored in the specified variables.
 * 
 * @param *gx Variable to store Raw x-axis Gyroscope reading into.
 * 
 * @param *gy Variable to store Raw y-axis Gyroscope reading into.
 * 
 * @param *gz Variable to store Raw z-axis Gyroscope reading into.
 */
void imu_readGyro(int *gx, int *gy, int *gz);


/**
 * @brief Reads the Accelerometer output registers.
 * 
 * @details This function will read all six Accelerometer output registers.
 * The readings are stored in the specified variables.
 * 
 * @param *ax Variable to store Raw x-axis Accelerometer reading into.
 * 
 * @param *ay Variable to store Raw y-axis Accelerometer reading into.
 * 
 * @param *az Variable to store Raw z-axis Accelerometer reading into.
 */
void imu_readAccel(int *ax, int *ay, int *az);


/**
 * @brief Reads the Magnetometer output registers.
 * 
 * @details This function will read all six Magnetometer output registers.
 * The readings are stored in the specified variables.
 * 
 * @param *mx Variable to store Raw x-axis Magnetometer reading into.
 * 
 * @param *my Variable to store Raw y-axis Magnetometer reading into.
 * 
 * @param *mz Variable to store Raw z-axis Magnetometer reading into.
 */
void imu_readMag(int *mx, int *my, int *mz);


/**
 * @brief Reads the Temperature output registers.
 * 
 * @details This function will read all six Temperature output registers.
 * The readings are stored in the specified variables.
 * 
 * @param *temperature Variable to store Raw Temperature reading into.
 */
void imu_readTemp(int *temperature);


/**
 * @brief Reads the Gyroscope output registers and scales the outputs to
 * degrees of rotation per second (DPS).
 * 
 * @details This function will read all six Gyroscope output registers.
 * The scaled readings ins DPS are stored in the specified variables.
 * 
 * @param *gx Variable to store scaled x-axis Gyroscope reading into.
 * 
 * @param *gy Variable to store scaled y-axis Gyroscope reading into.
 * 
 * @param *gz Variable to store scaled z-axis Gyroscope reading into.
 */
void imu_readGyroCalculated(float *gx, float *gy, float *gz);


/**
 * @brief Reads the Accelerometer output registers and scales the outputs to
 * g's (1 g = 9.8 m/s/s).
 * 
 * @details This function will read all six Accelerometer output registers.
 * The scaled readings in g's are stored in the specified variables.
 * 
 * @param *ax Variable to store scaled x-axis Accelerometer reading into.
 * 
 * @param *ay Variable to store scaled y-axis Accelerometer reading into.
 * 
 * @param *az Variable to store scaled z-axis Accelerometer reading into.
 */
void imu_readAccelCalculated(float *ax, float *ay, float *az);


/**
 * @brief Reads the Magnetometer output registers and scales the outputs to
 * gauss'.
 * 
 * @details This function will read all six Magnetometer output registers.
 * The scaled readings in gauss' are stored in the specified variables.
 * 
 * @param *mx Variable to store scaled x-axis Magnetometer reading into.
 * 
 * @param *my Variable to store scaled y-axis Magnetometer reading into.
 * 
 * @param *mz Variable to store scaled z-axis Magnetometer reading into.
 */
void imu_readMagCalculated(float *mx, float *my, float *mz);


/**
 * @brief Reads the Thermometer output registers and scales the outputs to
 * degrees Celsius, Fahrenheit, or Kelvin.
 * 
 * @details This function reads the Thermometer output registers.
 * The scaled reading in  are stored in the specified variables.
 * 
 * @param *temperature Variable to store scaled Thermometer reading into.
 *
 * @param tempUnit Value to set the unit to scale the output to.  
 * Acceptable values are CELSIUS (0), FAHRENHEIT (1), KELVIN (2).
 */
void imu_readTempCalculated(float *temperature, char tempUnit);

/**
 * @brief Sets the full-scale range of the Gyroscope.
 * 
 * @details This function can be called to set the scale of the Gyroscope to 
 * 245, 500, or 2000 degrees per second.
 *
 * @param gScl Value of the desired Gyroscope scale. Must be 245, 500, or 2000.
 */
void imu_setGyroScale(unsigned int gScl);


/**
 * @brief Sets the full-scale range of the Accelerometer.
 * 
 * @details This function can be called to set the scale of the Accelerometer to 
 * 2, 4, 8, or 16 g's.
 *
 * @param aScl Value of the desired Accelerometer scale. Must be 2, 4, 8, or 16.
 */
void imu_setAccelScale(unsigned char aScl);


/**
 * @brief Sets the full-scale range of the Magnetometer.
 * 
 * @details This function can be called to set the scale of the Magnetometer to 
 * 2, 4, 8, or 12 gauss.
 *
 * @param mScl Value of the desired Magnetometer scale. Must be 4, 8, 12 or 16.
 */
void imu_setMagScale(unsigned char mScl);


/**
 * @brief Retrieves the full-scale range of the Gyroscope.
 * 
 * @details This function can be called to get the scale of the Gyroscope.
 *
 * @returns Value of the Gyroscope scale. 245, 500, or 2000 DPS.
 */
int imu_getGyroScale();


/**
 * @brief Retrieves the full-scale range of the Accelerometer.
 * 
 * @details This function can be called to get the scale of the Accelerometer.
 *
 * @returns Value of the Accelerometer scale. 2, 4, 8, or 16 g's.
 */
int imu_getAccelScale();


/**
 * @brief Retrieves the full-scale range of the Magnetometer.
 * 
 * @details This function can be called to get the scale of the Magnetometer.
 *
 * @returns Value of the Magnetometer scale. 4, 8, 12, or 16 gauss.
 */
int imu_getMagScale();


/**
 * @brief Clears out any interrupts set up on the Accelerometer and resets all
 * Accelerometer interrupt registers to their default values. 
 *
 * @note Interrupt settings are non-volatile and will persist after a power-cycle or brown out.
 */
void imu_clearAccelInterrupt();


/**
 * @brief Clears out any interrupts set up on the Gyroscope and resets all
 * Gyroscope interrupt registers to their default values. 
 *
 * @note Interrupt settings are non-volatile and will persist after a power-cycle or brown out.
 */
void imu_clearGyroInterrupt();


/**
 * @brief Clears out any interrupts set up on the Magnetometer and resets all
 * Magnetometer interrupt registers to their default values. 
 *
 * @note Interrupt settings are non-volatile and will persist after a power-cycle or brown out.
 */
void imu_clearMagInterrupt();


/**
 * @brief Configures the Accelerometer interrupt output to the INT_A/G pin.
 *
 * @note Interrupt settings are non-volatile and will persist after a power-cycle or brown out.
 *
 * @param axis Sets which axis (or all axes) to be configured to send out an interrupt.  Values can be 
 * X_AXIS (0), Y_AXIS (1), Z_AXIS (2), or ALL_AXIS (3).
 *
 * @param threshold Sets the threshold magnitude (as a floating point value in g's) for triggering an 
 * interrupt.  The Accelerometer interrupt threshold is an absolute value, so it triggers on 
 * accelerations crossing the threshold in both the positive and negative directions.  The thershold 
 * can be up to 50% of the full scale value.
 * 
 * @param duration Sets how long the INT_A/G pin is held high once an interrupt is triggered.  The
 * duration is measured in samples - since samples are taken approximetly every 10ms, a duration of 100 is
 * roughly 1 second.  The duration can be any integer value from 0 to 255.
 * 
 * @param overUnder Sets whether the interrupt is triggered when the acceleration is a greater (1) or lesser (0)
 * magnitude than the threshold.
 * 
 * @param andOr If interrupts for multiple axis have been set, this sets whether the interrupts for the individual
 * axis must all be triggered (AND condition - 1), or if only one of them has to be triggered (OR condition - 0).
 */
void imu_setAccelInterrupt(char axis, float threshold, char duration, char overUnder, char andOr);


/**
 * @brief Configures the Gyroscope interrupt output to the INT_A/G pin.
 *
 * @note Interrupt settings are non-volatile and will persist after a power-cycle or brown out.
 *
 * @param axis Sets which axis (or all axes) to be configured to send out an interrupt.  Values can be 
 * X_AXIS (0), Y_AXIS (1), Z_AXIS (2), or ALL_AXIS (3).
 *
 * @param threshold Sets the threshold (as a floating point value in gauss) for triggering 
 * an interrupt.  The Gyroscope interrupt thresholds can be positive or negative, so it triggers on rotations
 * occuring in one direction.  The thershold can be up to 50% of the full scale value.
 * 
 * @param duration Sets how long the INT_A/G pin is held high once an interrupt is triggered.  The
 * duration is measured in samples - since samples are taken approximetly every 10ms, a duration of 100 is
 * roughly 1 second.  The duration can be any integer value from 0 to 255.
 * 
 * @param overUnder Sets whether the interrupt is triggered when the rotational speed is above (1) 
 * or below (0) than the threshold.
 * 
 * @param andOr If interrupts for multiple axis have been set, this sets whether the interrupts for the individual
 * axis must all be triggered (AND condition - 1), or if only one of them has to be triggered (OR condition - 0).
 */
void imu_setGyroInterrupt(char axis, float threshold, char duration, char overUnder, char andOr);


/**
 * @brief Configures the Magnetometer interrupt output to the INT_M pin.
 *
 * @note Interrupt settings are non-volatile and will persist after a power-cycle or brown out.
 *
 * @param axis Sets which axis (or all axes) to be configured to send out an interrupt.  Values can be 
 * X_AXIS (0), Y_AXIS (1), Z_AXIS (2), or ALL_AXIS (3).
 *
 * @param threshold Sets the threshold (as a floating point value in Degrees Per Second) for triggering 
 * an interrupt.  The Magnetometer interrupt threshold is an absolute value, so it sets triggers for 
 * magnetic field strengths crossing the threshold in both positive and negative directions.  The threshold 
 * can be up to 50% of the full scale value.
 * 
 * @param lowHigh When the interrupt is triggered, sets the INT_M pin high (1) or low (0).
 */
void imu_setMagInterrupt(char axis, float threshold, char lowHigh);



/**
 * @brief Writes a byte to the specified LSM9DS1 register.
 */
void imu_SPIwriteByte(unsigned char csPin, unsigned char subAddress, unsigned char data);


/**
 * @brief Reads a specified number of bytes from the specified LSM9DS1 register.
 */
void imu_SPIreadBytes(unsigned char csPin, unsigned char subAddress, unsigned char *dest, unsigned char count);



#if defined(__cplusplus)                     
}                                             // End compile for C block
#endif
/* __cplusplus */

#endif                                        // End prevent duplicate forward
/* __LSM9DS1_IMU_SENSOR_H__ */                // declarations block 


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