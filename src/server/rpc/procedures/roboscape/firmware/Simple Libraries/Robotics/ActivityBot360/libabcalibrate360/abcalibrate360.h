/**
 * @file abcalibrate360.h
 *
 * @author Andy Lindsay
 *
 * @copyright Copyright (C) Parallax, Inc. 2018.  See end of file for
 * terms of use (MIT License).
 *
 * @brief This library has a functions you can call to calibrate your 
 * ActivityBot 360.  Example code that uses this library to calibrate the
 * ActivityBot is here:
 * <br>
 * <br>
 * http://learn.parallax.com/activitybot
 * <br>
 * <br>
 * Calibration instructions that accompany the example code are included in the tutorial.
 *
 * @par Core Usage
 * A call to cal_activityBot launches 1 additional core, and self-terminates the
 * application when done.  
 *
 * @par EEPROM Usage
 * Writes to addresses 63418..65470. 
 *
 * @par Memory Models
 * Use with CMM. 
 *
 * @version v0.90
 * @li add cal_servoPins and cal_encoderPins to change from default
 * I/O connections to ActivityBot 360 servos and feedback lines.  Values used
 * will persist in EEPROM and be used by the abdrive360 library.
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

#include "simpletools.h"
#include "servo360.h"
#include "abdrive360.h"



#ifndef DOXYGEN_SHOULD_SKIP_THIS



#define ABD60_PIN_CTRL_L 12
#define ABD60_PIN_FB_L 14

#define ABD360_PIN_CTRL_R 13
#define ABD360_PIN_FB_R 15


#ifndef _AB360_EE_Start_
/**
 *
 * @brief ActivityBot EEPROM calibration data start address.
 */
#define _AB360_EE_Start_ 63418
#endif

#ifndef _AB360_EE_Pins_
#define _AB360_EE_Pins_ 12
#endif

#ifndef _AB360_EE_mVccwL_
#define _AB360_EE_mVccwL_ 28
#endif

#ifndef _AB360_EE_bVccwL_
#define _AB360_EE_bVccwL_ 32
#endif

#ifndef _AB360_EE_mVcwL_
#define _AB360_EE_mVcwL_ 36
#endif

#ifndef _AB360_EE_bVcwL_
#define _AB360_EE_bVcwL_ 40
#endif

#ifndef _AB360_EE_mVccwR_
#define _AB360_EE_mVccwR_ 44
#endif

#ifndef _AB360_EE_bVccwR_
#define _AB360_EE_bVccwR_ 48
#endif

#ifndef _AB360_EE_mVcwR_
#define _AB360_EE_mVcwR_ 52
#endif

#ifndef _AB360_EE_bVcwR_
#define _AB360_EE_bVcwR_ 56
#endif

#ifndef _AB360_EE_End_
/**
 *
 * @brief ActivityBot EEPROM calibration data end address.
 */
#define _AB360_EE_End_ _AB360_EE_Start_ + 60
#endif


                                               //
#define AB360_ERROR_NONE                 0     //
#define AB360_ERROR_CABLE_SWAP          -1     //
#define AB360_ERROR_NO_ENC_SIG_BOTH     -2     //
#define AB360_ERROR_NO_ENC_SIG_LEFT     -3     //
#define AB360_ERROR_NO_ENC_SIG_RIGHT    -4     //
#define AB360_ERROR_NO_MOTION_LEFT      -5     //
#define AB360_ERROR_NO_MOTION_RIGHT     -6     //
#define AB360_ERROR_NO_MOTION_BOTH      -7     //
#define AB360_ERROR_BATTERIES_TOO_LOW   -8
#define AB360_ERROR_BATTERIES_TOO_HIGH  -9
#define AB360_ERROR_XFER_OUT_OF_RANGE   -10
#define AB360_ERROR_POSSIBLE_AB_NOT_360 -11
#define AB360_ERROR_CONDITION_UNKNOWN   -12



#endif // DOXYGEN_SHOULD_SKIP_THIS



/**
  @brief Run the ActivityBot 360 calibration function.  Let it run until the
  P26 and P27 lights turn off.  It'll take about 30 seconds.
 */ 
void cal_activityBot(void);


/**
  @brief Set the ActivityBot 360's servo pin connections to values
  other than the default P12 (left servo) and P13 (right servo).
  This function stores values in EEPROM where the abdrive360 library
  can access them.  So, the abdrive360 library will expect the 
  servos to be connected to the Propeller I/O pins specified by the 
  servoPinLeft and servoPinRight parameters.
  
  @param servoPinLeft Number of I/O pin connected to the left servo.
  
  @param servoPinRight Number of I/O pin connected to the right servo.
 */ 
void cal_servoPins(int servoPinLeft, int servoPinRight);


/**
  @brief Set the ActivityBot 360's feedback pin connections to 
  something other than the default P14 (left feedback) and P15 
  (right feedback).  This function stores values in EEPROM where 
  the abdrive360 library can access them.  So, the abdrive360 library 
  will expect the feedback pins to be connected to the I/O pins 
  specified by the fbPinLeft and fbPinRight parameters.
  
  @param fbPinLeft Number of Propeller I/O pin connected to the left 
  encoder.
  
  @param fbPinRight Number of Propeller I/O pin connected to the right 
  encoder.
 */ 
void cal_encoderPins(int fbPinLeft, int fbPinRight);


/**
  @brief Display ActivityBot 360 calibration data in the terminal.  
  This data consists of I/O pin values for the servo's control and 
  feedback I/O pin connections and m and b values for a y = mx + b 
  equation that is used to calculate control pulse widths based on 
  measured calibration data.  Details about how y, m, x, and b are 
  calculated appear in the notes at the bottom of the terminal.
 */ 
void cal_displayData(void);


/**
  @brief Indicates whether the last calibration was successful or 
  had errors.  Errors can be caused by turning off the ActivityBot
  360 before the yellow lights go out, and also by incorrect servo
  control/feedback pin connections.
 */ 
void cal_displayResults(void);


/**
  @brief Clear calibration settings.  After this function is called
  the abdrive360 library will use standard default settings. 
 */ 
void cal_clear(void);



#ifndef DOXYGEN_SHOULD_SKIP_THIS



int cal_getEepromPins(void);



#endif // DOXYGEN_SHOULD_SKIP_THIS



#if defined(__cplusplus)
}
#endif
/* __cplusplus */  
#endif
/* ABCALIBRATE_H */  

/**
  TERMS OF USE: MIT License
 
  Permission is hereby granted, free of charge, to any person obtaining a
  copy of this software and associated documentation files (the "Software"),
  to deal in the Software without restriction, including without limitation
  the rights to use, copy, modify, merge, publish, distribute, sublicense,
  and/or sell copies of the Software, and to permit persons to whom the
  Software is furnished to do so, subject to the following conditions:
 
  The above copyright notice and this permission notice shall be included in
  all copies or substantial portions of the Software.
 
  THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
  IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
  FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL
  THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
  LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
  FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER
  DEALINGS IN THE SOFTWARE.
 */
