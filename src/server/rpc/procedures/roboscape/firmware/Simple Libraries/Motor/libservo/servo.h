/**
 * @file servo.h
 *
 * @author Andy Lindsay
 *
 * @copyright Copyright (C) Parallax, Inc. 2013.  See end of file for
 * terms of use (MIT License).
 *
 * @brief Control up to 14 servos in another core.  For up to 28, add the 
 * servoAux library to your project.  Control the first 14 with servo_set,
 * servo_speed, servo_angle, and other servo_ function calls.  Control servos
 * 15 and up with the same function calls, but starting with servoAux_ instead
 * of servo_.  
 *
 * @details This library automatically delivers control pulses to up to 14 servos 
 * every 20 ms.  All your code has to do is use servo_angle, servo_speed, or servo_set, 
 * to pick the pin the servo is connected to and  set its angle (standard servo)
 * or speed (continuous rotation servo).  
 *
 * @note
 * Parallax standard servos have a position range from approximately 0 to 180
 * degrees.  
 *
 * @par Core Usage
 * Launches 1 core that controls up to 14 servos on the first call to 
 * servo_set, servo_angle or servo_speed.  Additional calls to any of these functions
 * will not launch more cores.  Additional servos are controlled by supplying different
 * pin arguments to these functions.  For example, servo_angle(12, 900) followed by 
 * servo_angle(13, 300) will cause the other core sending servo control signals to set
 * a servo connected to P12 to 90 degrees, and a servo connected to P13 to 30 degrees.
 * If servo_angle(12, 900) was the first call to this library, it would automatically
 * launch a core before making that core send control signals to the servo connected to
 * P12.  The servo_angle(13, 300) call would cause the same core controlling the P12 
 * servo to also send control signals to a servo connected to P13. 
 *
 * @par Memory Models
 * Use with CMM or LMM. 
 *
 * @version v0.91
 * Add servo_disable, make servo, servo_start, and servo_Pulse private, and fix lock 
 * bug that can occur if the process is stopped and then restarted. 
 *
 * @version v0.90 
 *
 * @par Help Improve this Library
 * Please submit bug reports, suggestions, and improvements to this code to
 * editor@parallax.com.
 */

#ifndef servo_H
#define servo_H

#if defined(__cplusplus)
extern "C" {
#endif

#include "simpletools.h"


/**
 * @brief Set Parallax Standard Servo to angle from 0 to 180 in tenths of
 * a degree.
 *
 * @details Examples:
 *
 * @code
 * servo_angle(pin, 0);     // for 0 degrees
 * servo_angle(pin, 900);   // for 90 degrees
 * servo_angle(pin, 1800);  // for 180 degrees
 * @endcode
 *
 * 0 to 1800 corresponds to control pulses ranging from 500 to 2300 with 1400
 * at center (90 degrees), which is slightly different from the 1500 center
 * convention, but it places the Parallax Standard Servo's range of motion neatly 
 * between its mechanical limits.
 *
 * @param pin Number of the I/O pin connected to servo
 * @param degreeTenths Tenths of a degree from 0 to 1800
 *
 * @returns pin number = success, -1 = no cogs available, -2 = no locks available, -3 = 
 * all 14 servo slots already filled.
 */
int servo_angle(int pin, int degreeTenths);


/**
 * @brief Set Parallax Continuous Rotation servo speed.
 *
 * @details Examples:
 *
 * @code
 * servo_speed(pin, 200);    // Twice full speed counterclockwise
 * servo_speed(pin, 100);    // Full speed counterclockwise
 * servo_speed(pin, 0);      // Stay still
 * servo_speed(pin, -100);   // Full speed clockwise
 * servo_speed(pin, -200);   // Twice full speed clockwise
 * @endcode
 *
 * 100 to -100 corresponds to the linear speed control range.  For example,
 * servo_speed(pin, 75) will set the speed to roughly 75% of full speed
 * counterclockwise.  This is a very rough approximation.
 *
 * @param pin Number of the I/O pin connected to servo
 * @param speed Speed from -100 to 100
 *
 * @returns pin number = success, -1 = no cogs available, -2 = no locks available, -3 = 
 * all 14 servo slots already filled.
 */
int servo_speed(int pin, int speed);


/**
 * @brief Set the maximum change in control signal a servo will change
 * in a given 20 ms time period.
 *
 * @details This function allows you to make a Parallax Continuous Rotation
 * servo ramp up to and down from whatever speed or position it was previously set to.  
 * It also allows you to set the rate at which a Parallax Standard servo turns
 * from its previous position to a new position.
 *
 * @param pin Number of the I/O pin the servo is connected to
 * @param stepSize The number of microseconds per 20 ms of time that the servo's
 * control signal is allowed to change.  This equates to the number of tenths of
 * a degree a Parallax Standard servo is allowed to change, or the number of
 * 100ths of full speed the a Parallax Continuous Rotation servo is allowed to
 * change per 20 ms.
 *
 * @returns pin if successful, -4 if pin not found.
 */
int servo_setramp(int pin, int stepSize);


/**
 * @brief Sets servo control signal to servo connected to a given pin for 
 * microsecond pulse durations.
 *
 * @details This function directly controls the number of microseconds servo
 * control pulses last.
 *
 * Examples for Parallax Standard Servo:
 *
 * @code
 * servo_set(pin, 500);    //   0 degrees
 * servo_set(pin, 1400);   //  90 degrees
 * servo_set(pin, 2300);   // 180 degrees
 * @endcode
 *
 * 500, 1400, and 2300 are the number of microseconds (us) the control pulses
 * stay high.  More generally, a microsecond above 500 corresponds to 1/10
 * of a degree counterclockwise of 0 degrees.  So, for a given degree position, use:
 *
 *   degree position = 500 + (number of 10ths of a degree)
 *
 * For setting Parallax Continuous Rotation Servo speed, use:
 *
 * @li Full speed clockwise        -> servo_set(pin, 1400);
 * @li Stay still                  -> servo_set(pin, 1500);
 * @li Full speed counterclockwise -> servo_set(pin, 1600);
 *
 * Values in the 1400 to 1600 range are (roughly) proportional to speed for a 
 * Parallax Continuous Rotation Servo, but it's not nearly as precise as position 
 * control.  Setting full speeds at 1300 and 1700 is a common practice to make sure 
 * both servos are going as fast as they possibly can.
 *
 * @param pin Number of the I/O pin that sends signals to the servo.
 *
 * @param time Microsecond servo pulse time.
 *
 * @returns pin number = success, -1 = no cogs available, -2 = no locks available, -3 = 
 * all 14 servo slots already filled.
 */
int servo_set(int pin, int time);


/**
 * @brief Reports the number of microseconds of the pulse most recently sent
 * to a given servo.
 *
 * @param pin Number of the I/O pin the servo is connected to
 *
 * @returns tp[i] The value stored by the array element that keeps duration
 * of the most recent pulse sent to the servo. (Or -4 if an entry is not found
 * for the pin argument.
 */
int servo_get(int pin);


/**
 * @brief Temporarily or permanently disable a servo by stopping its control 
 * signals, setting its I/O pin to input, and removing its settings from the servo
 * library code's control list.  To re-enable a servo's position/speed control, 
 * simply call servo_angle, servo_speed, or servo_set.  Make sure to use the I/O 
 * pin of the servo you want to "wake back up".  If the servo had ramp settings,
 * they will have to be restored too.
 * 
 * @details This function can be useful for an application that has to make the
 * servo "relax", but either stopping its position or speed control.  It also 
 * opens up another entry in the servo control list for applications that use
 * more than 14 servos, but only use 14 or fewer at any given time.  For 
 * applications that need to use more than 14 servos, add the servoAux library.
 * 
 * @param pin Number of the I/O pin the servo is connected to.
 *
 * @returns pin number = success, -1 = no cogs available, -2 = no locks available,
 * -3 = all 14 servo slots already filled.
 */
int servo_disable(int pin);


/**
 * @brief Stops the servo process and frees a cog.
 */
void servo_stop(void);


#if defined(__cplusplus)
}
#endif
/* __cplusplus */  
#endif

/* servo_H */  

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
