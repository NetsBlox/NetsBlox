/**
* @file mx2125.h
*
* @author Andy Lindsay
*
* @version 0.85
*
* @copyright
* Copyright (C) Parallax, Inc. 2012. All Rights MIT Licensed.
*
* @brief Measure acceleration, tilt, and rotation with the Memsic MX2125 Dual-axis Accelerometer.
*
*/

#ifndef MX2125_H
#define MX2125_H

#if defined(__cplusplus)
extern "C" {
#endif

#include "simpletools.h"

/**
 * @brief Approximation of PI for converting g to angular values like
 * rotation and tilt.
 */
#ifndef PI 
#define PI 3.141592653589793 
#endif

/**
 * @brief Measure acceleration in terms of g (acceleration due to earth's 
 * gravity). A measurement of +/-1250 corresponds to approximately +/- 1 g.
 *
 * @param axisPin Number of I/O pin connected to either MX2125's X- or Y-
 * axis pins.
 *
 * @returns Value that represents 1250ths of a g acting on the
 * axis. 1250ths is a nominal value, the accelerometer is not that 
 * precise. 
 */
int mx_accel(int axisPin);

/**
 * @brief Measure clockwise rotation assuming accelerometer is held vertical.
 * Zero degree rotation is when the triangle on the MX2125 chip is pointing
 * up.
 *
 * @param xPin Number of I/O pin connected to MX2125's x-axis pin.
 *
 * @param yPin Number of I/O pin connected to MX2125's y-axis pin.
 *
 * @returns Integer degree value (0 to 359) that represents the clockwise 
 * angle of rotation. 
 */
int mx_rotate(int xPin, int yPin); 

/**
 * @brief Measure the level of tilt in terms of +/- 90 degrees. 0 degrees 
 * is when the top surface of the accelerometer chip is parallel to the 
 * ground.
 *
 * @param axisPin Number of I/O pin connected to either of MX2125's X- or Y-
 * axis pins.
 *
 * @returns Value from 0 to 90 that represents the tilt of that axis. 
 */
int mx_tilt(int axisPin);

#if defined(__cplusplus)
}
#endif
/* __cplusplus */ 
#endif
/* MX2125_H */ 

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

