#include "servodiffdrive.h"                   // Include servo lib funct defs
#include "servo.h"

static int pinLeft, pinRight, rampLeft, rampRight;   // Variables shared by functions

void drive_pins(int left, int right)          // drivePins function
{
  pinLeft = left;                             // Local to global assignments
  pinRight = right;
}

void drive_speeds(int left, int right)        // driveSpeeds function
{
  servo_speed(pinLeft, left);                 // Use vals in servoSpeed calls
  servo_speed(pinRight, -right);
}

void drive_setramp(int left, int right)       // driveRampSteps function
{
  servo_setramp(pinLeft, left);               // Use vals in rampStep calls
  servo_setramp(pinRight, right);
}

void drive_sleep()                            // driveSleep function
{
  servo_set(pinLeft, 0);                      // Put servos to sleep
  servo_set(pinRight, 0);
}

void drive_stop()                             // driveStop function
{
  servo_stop();                               // Stop the servo processor
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
