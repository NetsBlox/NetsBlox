/**
  @file abdrive360.h

  @author Parallax Inc.

  @copyright
  Copyright (C) Parallax Inc. 2017.  All Rights MIT Licensed.  See end of file.

  @brief This library provides a simple set of functions for making the 
  ActivityBot 360 go certain distances and speeds.  
  <br>
  <br>
  For more information, go here:
  <br>
  <br>
  http://learn.parallax.com/activitybot/navigation-basics
  <br>
  <br>
 
  @par Core Usage
  A single additional core takes care of ActivityBot 360 servo angle monitoring, 
  control system algorithm execution, and servo control signaling.
 
  @par EEPROM Usage
  Reads from addresses 63418..65470. 
 
  @par Memory Models
  Use with CMM. 
 
  @par Help Improve this Library
  Please submit bug reports, suggestions, and improvements to this code to
  editor@parallax.com.
*/


#ifndef ABDRIVE360_H
#define ABDRIVE360_H

#if defined(__cplusplus)
extern "C" {
#endif


#include "simpletools.h"  
#include "servo360.h"


#ifndef DOXYGEN_SHOULD_SKIP_THIS

#ifndef ABD360_GOTO_BUSY 
#define ABD360_GOTO_BUSY 1
#endif

#ifndef ABD360_GOTO_CLEAR 
#define ABD360_GOTO_CLEAR 0
#endif

#ifndef ABD360_GOTO_BLOCK 
#define ABD360_GOTO_BLOCK 0
#endif

#ifndef ABD360_GOTO_SET_FORGET 
#define ABD360_GOTO_SET_FORGET 1
#endif

#ifndef AB360_NEITHER 
#define AB360_NEITHER 0
#endif

#ifndef AB360_LEFT 
#define AB360_LEFT 1
#endif

#ifndef AB360_RIGHT 
#define AB360_RIGHT 2
#endif

#ifndef FOR_GOTO 
#define FOR_GOTO 1
#endif

#ifndef FOR_SPEED 
#define FOR_SPEED 0
#endif

#ifndef OFF 
#define OFF 0
#endif

#ifndef ON  
#define ON  1
#endif

#ifndef SIDE_LEFT 
#define SIDE_LEFT 0
#endif

#ifndef SIDE_RIGHT 
#define SIDE_RIGHT 1
#endif

#ifndef SIDE_BOTH 
#define SIDE_BOTH 2
#endif

#ifndef ABD60_PIN_CTRL_L 
#define ABD60_PIN_CTRL_L 12
#endif

#ifndef ABD60_PIN_FB_L 
#define ABD60_PIN_FB_L 14
#endif

#ifndef ABD360_PIN_CTRL_R 
#define ABD360_PIN_CTRL_R 13
#endif

#ifndef ABD360_PIN_FB_R 
#define ABD360_PIN_FB_R 15
#endif

#ifndef ABD360_UNITS_REV 
#define ABD360_UNITS_REV 64
#endif

#ifndef ABD_RAMP_STEP 
#define ABD_RAMP_STEP 12
#endif

#ifndef ABD_SPEED_LIMIT 
#define ABD_SPEED_LIMIT 128
#endif

#ifndef ABD_GOTO_SPEED_LIMIT 
#define ABD_GOTO_SPEED_LIMIT 64
#endif

#ifndef ABD_GOTO_RAMP_STEP 
#define ABD_GOTO_RAMP_STEP 8
#endif


//#define ABD_NUDGE_SPEED 4
//#define ABD_STOP_50ths 5

#ifndef _AB360_EE_Start_
#define _AB360_EE_Start_ 63418
#endif

#ifndef _AB360_EE_Pins_
#define _AB360_EE_Pins_ 12
#endif

// y = mx + b for transfer function separated into above (ccw) and below (cw)
// zero speed deadband pulse width.  m sets slope, b sets transition pulse
// width from zero speed to motion.  If not found in EEPROM, default values
// from servo360 library are used.

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
#define _AB360_EE_End_ _AB360_EE_Start_ + 60
#endif


extern volatile int abd360_initialized;

extern volatile int abd360_unitsPerRev;

extern volatile int abd360_pinCtrlLeft;
extern volatile int abd360_pinCtrlRight;
extern volatile int abd360_pinFbLeft;
extern volatile int abd360_pinFbRight;

extern volatile int abd360_speedLimit;
extern volatile int abd360_rampStep;
extern volatile int abd360_setRampStep;
extern volatile int abd360_speedLimitGoto;
extern volatile int abd360_rampStepGoto;

extern volatile int abd360_gotoMode;


void drive_init(void);
void drive360_ticksPerRev(int units);



#endif // DOXYGEN_SHOULD_SKIP_THIS



/**
  @brief Set wheel speeds in "ticks" per second.  A tick is 1/64th of a 
  revolution, and makes an ActivityBot 360 wheel roll 3.25 mm.  The maximum
  speed for each wheel is +/- 128 ticks/second.  Positive values are for 
  forward motion; negative values are for reverse.  
  
  @param left Left wheel speed in ticks per second.
  
  @param right Right wheel speed in ticks per second.
*/
void drive_speed(int left, int right); 


/**
  @brief Make the wheels travel a certain distance, measured in ticks.  
  Each "tick" is a 64th of a wheel turn, and corresponds to an ActivityBot 360 
  rolling distance of about 3.25 mm.  Ramp up, cruise, ramp down and stop 
  are coordinated so that different left/right distances result in curves.  
  Same distances are straight lines, and same distances with opposite +/- 
  signs cause the ActivityBot 360 to turn in place.  This function does not 
  return until the maneuver has completed.  If needed, you change that default 
  with the drive_gotoMode function.  The default cruising speed is 64 
  ticks/second, which can be adjusted with the drive_setMaxVelocity function. 
   
  @param distLeft Left wheel distance in 1/64th revolution ticks.

  @param distRight Right wheel distance in ticks.
*/
void drive_goto(int distLeft, int distRight);


/**
  @brief Get the measured number of ticks each servo has traveled since the
  program started running.  Each "tick" is a 64th of a wheel turn, and 
  corresponds to an ActivityBot 360 rolling distance of about 3.25 mm.   
  
  @param *left Pointer to variable to receive the measured left distance.  

  @param *right Pointer to variable to receive the measured right distance.  
*/
void drive_getTicks(int *left, int *right);


/**
  @brief Get the calculated number of 1/64th wheel revolution ticks the 
  abdrive360 control system thinks each servo should have traveled. 
  
  @param *left Pointer to variable to receive the measured left distance.  
 
  @param *right Pointer to variable to receive the measured right distance.  
*/
void drive_getTicksCalc(int *left, int *right);



/**
  @}
  
  @name Settings
  @{
*/



/**
  @brief Sets servo pins to values other than the default P12 for the left 
  servo and P13 for right servo.  Stores values in EEPROM, so you only
  need to call this function at the start of one program.  Programs after that 
  will get the modified port numbers from EEPROM.  
   
  IMPORTANT: This function should be called before any adbrive360 
  control functions (drive_speed, drive_goto, etc).
  
  @param controlPinLeft I/O pin number for the left servo signal connection.
  
  @param controlPinRight I/O pin number for the right servo signal connection.
*/
void drive_servoPins(int controlPinLeft, int controlPinRight);


/**
  @brief Sets feedback pins to values other than the default P14 for left 
  and P15 for right.  Stores values in EEPROM, so you only need to call this 
  function at the start of one program.  Programs that are run after that will 
  get the modified port numbers from EEPROM.
   
  IMPORTANT This function should be called before any adbrive360 
  control functions (drive_speed, drive_goto, etc).
  
  @param encPinLeft I/O pin number for the left encoder signal connection.
  
  @param encPinRight I/O pin number for the right encoder signal connection.
*/
void drive_encoderPins(int encPinLeft, int encPinRight);


/**
  @brief Set the maximum velocity used by either drive_goto or drive_speed.  
  The defaults are 128 ticks per second for drive_speed, and 64 ticks per 
  second for drive_goto.  A tick is a 64th of a turn, and causes an ActivityBot
  360 wheel to roll for 3.25 mm.  The valid range is 32 to 128 ticks per 
  second.
  
  @param forGotoOrSpeed can be set to FOR_SPEED (0) or FOR_GOTO (1).
  
  @param ticksPerSec The ticks per second value that limits the top velocity,
  regardless of what calls to drive_speed ask for.  The default is 128 for 
  drive_speed and 64 for drive_goto.  128 is the maximum possible.
*/
void drive_setMaxVelocity(int forGotoOrSpeed, int ticksPerSec);


/**
  @brief Set the acceleration used by either drive_goto or drive_speed.  
  
  @param forGotoOrSpeed can be set to FOR_SPEED (0) or FOR_GOTO (1).
 
  @param ticksPerSecSq The ticks per second squared value to set the acceleration
  that speed and goto calls use.  The default is 600 for drive_speed and 400 for 
  drive_goto.  Use increments of 50, up to 2000.
*/
void drive_setAcceleration(int forGotoOrSpeed, int ticksPerSecSq);


/**
  @brief Set the mode of the drive_goto call to blocking (default) or 
  interruptible.  For calls in interruptible mode, sufficient time must be 
  allowed for the maneuver to complete before issuing another drive_goto or
  drive_speed call.  The drive_gotoStatus function can also be polled to find 
  when a given maneuver is done.  
  
  @param mode Interruptible (0) or blocking (1).  By default, the drive_goto
  function is set to blocking, and does not return until the maneuver has 
  completed.
*/
void drive_gotoMode(int mode);


/**
  @brief After using drive_gotoMode(0) to cause the drive_goto function to 
  not wait until the maneuver is done before returning, checking the status of 
  a given maneuver can be useful.  This function reports the status of maneuver
  initiated by the most recent drive_goto call.  
  
  @param side with options of SIDE_LEFT, SIDE_RIGHT, or SIDE_BOTH.
   
  @returns value that corresponds to the 0 (done with last drive_goto maneuver
  or 1 (maneuver still in progress).
*/
int drive_gotoStatus(int side);



/**
  @brief Enables or disables encoder feedback for speed control.  
  
  @param enabled Set to 1 to enable feedback (default) or 0 to disable.
*/
void drive_feedback(int enabled); 



/**
  @}
 
  @name Deprecated
  @{ 
*/

//void drive_calibrationResults(void);
//void drive_setErrorLimit(int maxDistDiffTicks);

/**
  @brief Modifies the default maximum top speed for Feedback 360 high speed
  servos.  For calls to drive_speed, the default is 128 ticks/second = 2 
  revolutions per second (RPS).  This value can be reduced, but not increased.
  Note: drive_setMaxVelocity is recommended in place of this function.
  
  @param speed Maximum cruising speed for drive_speed.
*/
void drive_setMaxSpeed(int speed);


/**
  @brief Overrides the default 12 ticks/second per 50th of a second for ramping.
  Note: drive_setAcceleration is recommended in place of this function.
  
  @param stepsize The size of each step in ticks/second to change every 50th of
  a second
*/
void drive_setRampStep(int stepsize);


/**
  @brief This function allows your code to ask for a speed repeatedly in a loop, 
  but each time your code asks for that speed, it takes a step toward the speed.
  This helps cushion sudden maneuvers in sensor navigation, where the conditions
  might change more rapidly than you would want your ActivityBot 360's speed to 
  change.  Note: drive_speed has built-in ramping and is recommended in place 
  of this function.  It can be called repeatedly the same way applications call
  this function.
   
  @param left Left wheel speed in ticks per second.
 
  @param right Right wheel speed in ticks per second.
*/
void drive_rampStep(int left, int right);


/**
  @brief This function ramps up to a given speed and blocks execution until the
  speed is reached.  In practice, a call to drive_speed followed by a pause to 
  reach the desired speed will have the same effect but does not have practical
  applications.  

  @param left Left wheel speed in ticks per second.
  
  @param right Left wheel speed in ticks per second.
*/
void drive_ramp(int left, int right);



/**
   @}
*/



#if defined(__cplusplus)
}
#endif
/* __cplusplus */ 
#endif
/* ABDRIVE360_H */ 


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

                                                                                //
