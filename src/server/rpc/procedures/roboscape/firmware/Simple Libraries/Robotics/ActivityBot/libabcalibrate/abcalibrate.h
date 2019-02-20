/**
 * @file abcalibrate.h
 *
 * @author Andy Lindsay
 *
 * @copyright Copyright (C) Parallax, Inc. 2013.  See end of file for
 * terms of use (MIT License).
 *
 * @brief This library has a function you can call to calibrate your 
 * ActivityBot.  Example code that uses this library to calibrate the
 * ActivityBot is here:
 * <br>
 * <br>
 * http://learn.parallax.com/activitybot
 * <br>
 * <br>
 * Calibration instructions that accompany the example code are included in the tutorial.
 *
 * @par Core Usage
 * A call to cal_activityBot launches 2 additional cores, and self-terminates the
 * application when done.  
 *
 * @par EEPROM Usage
 * Writes to addresses 63418..65470. 
 *
 * @par Memory Models
 * Use with CMM. 
 *
 * @version 0.91
 * @li add cal_servoPins and cal_encoderPins to change from default
 * I/O connections to ActivityBot servos and encoders.  Values used
 * will persist in EEPROM and be used by the abdrive library.
 * 
 * @version v0.90 
 *
 * @par Help Improve this Library
 * Please submit bug reports, suggestions, and improvements to this code to
 * editor@parallax.com.
 */

#ifndef ABCALIBRATE_H
#define ABCALIBRATE_H

#if defined(__cplusplus)
extern "C" {
#endif

#include "servo.h"
#include "simpletools.h"                      // Include simple tools
#include "fdserial.h"


#ifndef _ActivityBot_EE_Start_
/**
 *
 * @brief ActivityBot EEPROM calibration data start address.
 */
#define _ActivityBot_EE_Start_ 63418
#endif

#ifndef _ActivityBot_EE_Pins_
#define _ActivityBot_EE_Pins_ 12
#endif

#ifndef _ActivityBot_EE_Trims_
#define _ActivityBot_EE_Trims_ 28
#endif

#ifndef _ActivityBot_EE_Left_
#define _ActivityBot_EE_Left_ 52
#endif

#ifndef _ActivityBot_EE_Right_
#define _ActivityBot_EE_Right_ 1052
#endif

#ifndef _ActivityBot_EE_End_
/**
 *
 * @brief ActivityBot EEPROM calibration data end address.
 */
#define _ActivityBot_EE_End_ 63418 + 2052
#endif

/**
 * @brief Run the ActivityBot calibration function.  Let it run until the
 * P26 and P27 lights turn off.  It'll take about 1 minute, 20 seconds.
 */ 
void cal_activityBot();

/**
 * @brief Set the ActivityBot's servo pin connections to something
 * other than the default P12 (left servo) and P13 (right servo).
 * This function stores values in EEPROM where the abdrive library
 * can access them.  So, the abdrive library will expect the 
 * servos to be connected to the I/O pins specified by the 
 * servoPinLeft and servoPinRight parameters.
 * 
 * @param servoPinLeft Number of I/O pin connected to the left servo.
 * 
 * @param servoPinRight Number of I/O pin connected to the right servo.
 */ 
void cal_servoPins(int servoPinLeft, int servoPinRight);

/**
 * @brief Set the ActivityBot's servo pin connections to something
 * other than the default P14 (left encoder) and P15 (right encoder).
 * This function stores values in EEPROM where the abdrive library
 * can access them.  So, the abdrive library will expect the 
 * encoders to be connected to the I/O pins specified by the 
 * encPinLeft and encPinRight parameters.
 * 
 * @param encPinLeft Number of I/O pin connected to the left encoder.
 * 
 * @param encPinRight Number of I/O pin connected to the right encoder.
 */ 
void cal_encoderPins(int encPinLeft, int encPinRight);


#if defined(__cplusplus)
}
#endif
/* __cplusplus */  
#endif
/* ABCALIBRATE_H */  

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
