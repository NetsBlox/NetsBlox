/**
 * @file servodiffdrive.h
 *
 * @author Andy Lindsay
 *
 * @version 0.85
 *
 * @copyright Copyright (C) Parallax, Inc. 2012.  See end of file for
 * terms of use (MIT License).
 *
 * @brief Adds a layer over servo library for 
 * use with a differential servo drive robot.  You have to add the 
 * simpletools and servo libraries to your project (with the Add Simple
 * Libraries button) for this to work.
 *
 * @detail Functions that control servo speeds and directions automatically
 * reverse servo speed on the right side to make intuitive functions that 
 * involve positive values for forward and negative ones for backward.  
 * speed control calls typically set up once with drivePins(left, right).
 * After that driveSpeeds(speedLeft, speedRight) control servo speed and
 * direction.  Example: driveSpeed(200, 200) is full speed forward.  Likewise,
 * driveSpeed(-200, -200) is full speed reverse.
 *
 * Please submit bug reports, suggestions, and improvements to
 * this code to editor@parallax.com.
 */

#ifndef SERVODIFFDRIVE_H
#define SERVODIFFDRIVE_H

#if defined(__cplusplus)
extern "C" {
#endif

#include "simpletools.h"                      // Include simple tools
#include "servo.h"

/**
 * @brief Set up left and right wheel servo pin connections.
 *
 * @detail Call this function once to tell the library which pins the left and
 * right continuous rotation drive servos are connected to. 
 *
 * @param left Left servo pin
 * @param right Right servo pin
 */
void drive_pins(int left, int right);

/**
 * @brief Set the servo drive speeds.
 *
 * @detail Speeds range from 100 for full speed forward to -100 for full speed
 * reverse.  To ensure that both servos are turning at full speeds, 200 is typically
 * used for forward and -200 for backward.  Then, linear speed control happens in the
 * -100...0...100 range.
 *
 * @param left Left srvo speed 
 * @param right Right servo speed
 */
void drive_speeds(int left, int right);

/**
 * @brief Set the maximum ramp step size.
 *
 * @detail Call this function if you want a large change in speed to be reached 
 * incrementally for a ramping effect.  Default is 2000 (no ramping whatsoever).
 * values in the 4 to 10 range tend to have a visible effect.  4 is a little sluggish
 * but works well for gradual speed changes that are useful in hill climbing applications.
 *
 * @param left Left sevo maximum ramp step
 * @param right Right servo maximum ramp step
 */
void drive_setramp(int left, int right);

/**
 * @brief Stops the drive wheel servo signals without stopping the processor that controls
 * them.
 *
 * @detail This function is useful for stopping the control signals to the drive wheel 
 * servos without stopping signals to the rest of the servos.  You can call driveSpeeds to
 * wake the servos back up.  This can save some power if your application needs to operate
 * other servos while giving the continuous rotation drive servos a rest.
 *
 * @param left Left sevo maximum ramp step
 * @param right Right servo maximum ramp step
 */
void drive_sleep();

/**
 * @brief Stops the processor that controls all servos in the application.  
 *
 * @detail This function takes all servos in the application out of commission, and all 
 * settings will be lost.  Use at the end of the program for maximum power savings.
 *
 * @param left Left sevo maximum ramp step
 * @param right Right servo maximum ramp step
 */
void drive_stop();

#if defined(__cplusplus)
}
#endif
/* __cplusplus */  
#endif
/* SERVPDIFFDRIVE_H */  

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
