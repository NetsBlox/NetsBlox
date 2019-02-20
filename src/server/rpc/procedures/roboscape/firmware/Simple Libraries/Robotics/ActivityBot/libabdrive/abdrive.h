//#define _monitor_

/**
 * @file abdrive.h
 *
 * @author Andy Lindsay
 *
 * @copyright 
 * Copyright (C) Parallax, Inc. 2017. All Rights MIT Licensed.
 *
 * @brief This library takes care of encoder monitoring and servo signaling, 
 * and provides a simple set of functions for making the ActivityBot go certain
 * distances and speeds.
 * <br>
 * <br>
 * For more information, go here:
 * <br>
 * <br>
 * http://learn.parallax.com/activitybot/navigation-basics
 * <br>
 * <br>
 *
 * @par Core Usage
 * A single additional core takes care of ActivityBot encoder monitoring, control system
 * algorithm execution and servo control.
 *
 * @par EEPROM Usage
 * Reads from addresses 63418..65470. 
 *
 * @par Memory Models
 * Use with CMM. 
 *
 * @version 0.9.95
 * @li Prevent control system from getting completely confused after a
 * stall condition by preventing calculated distance from getting too
 * far ahead of actual distance.
 * @li New function drive_setErrorLimit(int maxDistDiffTicks) for
 * configuration how far ahead of the measured distance the calculated
 * distance is allowed to get.  The twitch response after a stall is
 * released gets smaller with smaller values, but the acceleration may
 * also get dampened.  For now, the default is 10 ticks.  Opinions on
 * values for best performance would be appreciated.
 *
 * @version 0.9.82
 * @li Move most control logic into the control system cog.
 * @li Arc support with drive_goto(left, right), where left != right.
 * @li Background target calculation for better acceleration/deceleration.
 * @li drive_acceleration(forGotoOrSpeed, ticksPerSecondSquared).
 * @li drive_ramp can be interrupted with a new direction.
 * @li drive_goto can be interrupted after calling drive_gotoMode(0).
 * @li drive_gotoStatus added for monitoring when a maneuver is finished.
 * @li All acceleration (a.k.a. ramping) is done in the background.
 * @li Sampling rate increased from 400 to 800 Hz.
 * @li Default speed for drive_goto set to 64 ticks per second with 
 * a default acceleration of 200 ticks per second.
 * @li Default speed limit for drive_speed is 128 ticks per second, 
 * with a default acceleration of 600 ticks/second squared.
 * @li Trim support was removed.
 *
 * @version 0.5.6
 * @li Adjust drive_servoPins and drive_encoderPins documentation.
 *
 * @version 0.5.4
 * @li drive_getTicksCalc
 * @li drive_getTicks
 * @li drive_open
 * @li drive_encoderPins
 * @li drive_servoPins
 * @li Values outside interpolation table ranges do not result in
 * rotation halt. 
 * @li Turning off feedback now allows full servo speed operation
 *
 * @version 0.5.1
 * @li Trim enabled by default.
 * @li Clear trim settings during calibration. (v0.5.1)
 * @li Make trim for a direction mutually exclusive to one side. (v0.5.1)
 *
* @par Help Improve this Library
 * Please submit bug reports, suggestions, and improvements to this code to
 * editor@parallax.com.
 */

//#ifndef DOXYGEN_SHOULD_SKIP_THIS
#ifndef ABDRIVE_H
#define ABDRIVE_H
//#endif

#if defined(__cplusplus)
extern "C" {
#endif

#include "simpletools.h"
#include "simpletext.h"
#include "fdserial.h"
#ifndef ABD_RAMP_STEP 
/**
 *
 * @brief This default corresponds 600 ticks/second^2 acceleration and 
 * can be adjusted with the drive_setAcceleration function.
 */
#define ABD_RAMP_STEP 12
#endif


#ifndef ABD_SPEED_LIMIT
/**
 *
 * @brief The default drive_speed limit is +/-128 ticks/second.  This can 
 * be adjusted at runtime with the drive_setSpeed and drive_setMaxVelocity 
 * functions. 
 */
#define ABD_SPEED_LIMIT 128
#endif


#ifndef ABD_GOTO_SPEED_LIMIT
/**
 *
 * @brief This default defines the speed limit when the drive_goto function
 * is called and can be adjusted with the drive_setMaxVelocity function. 
 */
#define ABD_GOTO_SPEED_LIMIT 64
#endif


#ifndef ABD_GOTO_RAMP_STEP
/**
 *
 * @brief This default corresponds 200 ticks/second^2 acceleration and 
 * can be adjusted with the drive_setAcceleration function.
 */
#define ABD_GOTO_RAMP_STEP 4
#endif


#ifndef ABD_NUDGE_SPEED 
/**
 *
 * @brief Ticks per second to nudge to the final position do complete a drive_goto
 * call.
 */
#define ABD_NUDGE_SPEED 4
#endif


#ifndef ABD_STOP_50ths 
/**
 *
 * @brief This is the number of 50ths of a second that the ActivityBot
 * delays when it crosses the zero speed threshold when executing 
 * drive_goto calls.
 */
#define ABD_STOP_50ths 5
#endif




#ifndef _ActivityBot_EE_Start_
/**
 *
 * @brief ActivityBot EEPROM calibration data start address.
 */
#define _ActivityBot_EE_Start_ 63418
#endif


#ifndef _ActivityBot_EE_End_
/**
 *
 * @brief ActivityBot EEPROM calibration data end address.
 */
#define _ActivityBot_EE_End_ 63418 + 2052
#endif


#ifndef FOR_GOTO
/**
 *
 * @brief This constant can be used in place of 0 to tell drive_setAcceleration 
 * and drive_setMaxVelocity to set maximum velocity/acceleration for calls to 
 * drive_goto.
 */
#define FOR_GOTO 1
#endif


#ifndef FOR_SPEED
/**
 *
 * @brief This constant can be used in place of 0 to tell drive_setAcceleration 
 * and drive_setMaxVelocity to set maximum velocity/acceleration for calls to 
 * drive_speed.
 */
#define FOR_SPEED 0
#endif


#ifndef OFF
/**
 * @brief OFF can be used in place of zero to enabled parameters in
 * functions like drive_feedback and drive_trim.
 */
#define OFF 0
#endif

#ifndef ON
/**
 * @brief ON can be used in place of a nonzero value to enabled
 * parameters in functions like drive_feedback and drive_trim.
 */
#define ON  1
#endif


#ifndef SIDE_LEFT
/**
 *
 * @brief Parameter option for drive_gotoStatus(int side).
 */
#define SIDE_LEFT 0
#endif


#ifndef SIDE_RIGHT
/**
 *
 * @brief Parameter option for drive_gotoStatus(int side).
 */
#define SIDE_RIGHT 1
#endif


#ifndef SIDE_BOTH
/**
 *
 * @brief Parameter option for drive_gotoStatus(int side).
 */
#define SIDE_BOTH 2
#endif



/**
 * @}
 */



/**
 * @brief Make each wheel go a particular distance.  Recommended for straight forward,
 * backward, turns, pivots, and curves/arcs.  This function ramps up to full speed if 
 * the distance is long enough.  It holds that speed until it needs to 
 * ramp down.  After ramping down it applies compensation.  By default, this function
 * does not return until the maneuver has completed. 
 *
 * @param distLeft Left wheel distance in ticks (spoke to space and space to spoke
 * transitions).  Each "tick" transition is 1/64th of a wheel revolution, causing the
 * wheel to roll approximately 3.25 mm.
 *
 * @param distRight Right wheel distance in ticks.
 */
void drive_goto(int distLeft, int distRight);



/**
 * @brief Set wheel speeds in encoder ticks per second.  An encoder tick is
 * 1/64th of a revolution, and makes causes the wheel to roll 3.25 mm.
 *
 * @param left Left wheel speed in ticks per second.
 *
 * @param right Left wheel speed in ticks per second.
 */
void drive_speed(int left, int right); 


/**
 * @brief Get the measured number of ticks the have traveled. 
 *
 * @details The system samples the encoders at 400 times per second.
 *
 * @param *left Pointer to variable to receive the measured left distance.  
 *
 * @param *right Pointer to variable to receive the measured right distance.  
 */
void drive_getTicks(int *left, int *right);


/**
 * @brief Uses the calibration settings to find common circuit mistakes that 
 * prevent the ActivityBot from operating normally.  This function will
 * either display a success message or information about one or more problems.
 * Make sure to re-run the ActivityBot calibration after fixing each problem.
 * Do not try to continue with any of the ActivityBot tutorials until you have 
 * run the calibration, and then run a program with this function call and it
 * displays a message that the ActivitiyBot has been successfully calibrated.
 * <br><br> Instructions: (BlocklyProp)
 * <br>     http://learn.parallax.com/blockly/calibrate-your-activitybot
 * <br><br> Instructions: (Propeller C)
 * <br>     http://learn.parallax.com/activitybot/test-and-tune-your-activitybot
 */
void drive_calibrationResults(void);



/**
 * @name More Info
 * @{
 */


/**
 * @brief Displays the interpolation table stored in EEPROM by the calibration
 * step.  For more info, see:
 *<br>
 *<br> http://learn.parallax.com/activitybot/test-and-tune-your-activitybot.
 *<br>
 */
void drive_displayInterpolation(void);


/**
 * @brief Get the calculated number of ticks the encoders should have traveled. 
 *
 * @details The system samples the encoders at 400 times per second.
 *
 * @param *left Pointer to variable to receive the calculated left distance.  
 *
 * @param *right Pointer to variable to receive the calculated right distance.  
 */
void drive_getTicksCalc(int *left, int *right);


/**
 * @brief Can be used after drive_gotoMode(OFF) to check if a maneuver
 * has been completed.  
 *
 * @param side with options of SIDE_LEFT, SIDE_RIGHT, or SIDE_BOTH.
 * 
 * @returns value that corresponds to the 0, 1, 2 status of a maneuver
 */
int drive_gotoStatus(int side);


/**
 * @}
 *
 * @name Settings
 * @{
 */


/**
 * @brief Set encoder pins to values other than the default P14 for left 
 * encoder and P15 for right encoder.  Stores values in EEPROM, so you only
 * need to call this function at the start of one program.  Programs that are 
 * after that will get the values from EEPROM.
 * 
 * IMPORTANT This function should be called first, before any 
 * adbrive control functions (drive_speed, drive_goto, etc).
 *
 * @param encPinLeft I/O pin number for the left encoder signal connection.
 *
 * @param encPinRight I/O pin number for the right encoder signal connection.
 */
void drive_encoderPins(int encPinLeft, int encPinRight);


/**
 * @brief Enables or disables encoder feedback for speed control.  
 *
 * @param enabled Set to 1 to enable feedback (default) or 0 to disable.
 */
void drive_feedback(int enabled);                      


/**
 * @brief Set the mode (blocking or interruptible) of the drive_goto call.
 * For calls in interruptible mode, sufficient time must be allowed for
 * the maneuver to complete.  The drive_gotoStatus function can be polled 
 * to find when a maneuver is done.  
 *
 * @param mode interruptible  (0) or blocking (1).  By default the drive_goto
 * function blocks until the maneuver has completed.
 */
void drive_gotoMode(int mode);


/**
 * @brief Set servo pins to values other than the default P12 for left 
 * servo and P13 for right servo.  Stores values in EEPROM, so you only
 * need to call this function at the start of one program.  Programs that are 
 * after that will get the values from EEPROM.
 * 
 * IMPORTANT This function should be called first, before any 
 * adbrive control functions (drive_speed, drive_goto, etc).
 *
 * @param servoPinLeft I/O pin number for the left servo signal connection.
 *
 * @param servoPinRight I/O pin number for the right servo signal connection.
 */
void drive_servoPins(int servoPinLeft, int servoPinRight);


/**
 * @brief Set the acceleration used by either drive_goto or drive_speed.  
 *
 * @param forGotoOrSpeed can be set to FOR_SPEED (0) or FOR_GOTO (1).
 *
 * @param ticksPerSecSq The ticks per second squared value to set the acceleration
 * speed and goto calls use.  The default is 600 for drive_speed and 200 for 
 * drive_goto.  Use increments of 50.
 */
void drive_setAcceleration(int forGotoOrSpeed, int ticksPerSecSq);


/**
 * @brief Sets the maximum accumulated error between target and actual
 * distance traveled.  
 *
 * @param maxDistDiffTicks The maximum number of error ticks the control system can
 * accumulate.  The default is 10.  Lower values mean less twitch when released from a 
 * stall condition, but may override acceleration settings.
 */
void drive_setErrorLimit(int maxDistDiffTicks);


/**
 * @brief Modifies the default maximum top speed for use with encoders.  The default
 * is 128 ticks/second = 2 revolutions per second (RPS).  This is the full speed that
 * drive_distance and drive_goto use.  This value can currently be reduced, but not 
 * increased.  Speeds faster than 128 ticks per second are "open loop" meaning the control
 * system does not use the encoders to correct distance/speed. 
 *
 * @param speed Maximum cruising speed for drive_distance and drive_goto.
 */
void drive_setMaxSpeed(int speed);


/**
 * @brief Set the maximum velocity used by either drive_goto or drive_speed.  
 *
 * @param forGotoOrSpeed can be set to FOR_SPEED (0) or FOR_GOTO (1).
 *
 * @param ticksPerSec The ticks per second value that limits the top velocity,
 * regardless of what calls to drive_speed ask for.  The default is 128 for 
 * drive_speed and 64 for drive_goto.
 */
void drive_setMaxVelocity(int forGotoOrSpeed, int ticksPerSec);



/**
 * @}
 *
 * @name Deprecated
 * @{
 */



/**
 * @brief Overrides the default 12 ticks/second per 50th of a second for ramping.
 *
 * @param stepsize The size of each step in ticks/second to change every 50th of
 * a second
 */
void drive_setRampStep(int stepsize);


/**
 * @brief This function allows your code to ask for a speed repeatedly in a loop, 
 * but each time your code asks for that speed, it takes a step toward the speed.
 * This helps cushion sudden maneuvers in sensor navigation, where the conditions
 * might change more rapidly than you would want your ActivityBot's speed to 
 * change.  (Note: This is now built into drive_speed.)
 * 
 * @param left Left wheel speed in ticks per second.
 *
 * @param right Left wheel speed in ticks per second.
 */
void drive_rampStep(int left, int right);

/**
 * @brief This function ramps up to a given speed and blocks execution until the
 * speed is reached.  In practice, a call to drive_speed followed by a pause to 
 * reach the desired speed will have the same affect but does not have practical
 * applications.
 * 
 * @param left Left wheel speed in ticks per second.
 *
 * @param right Left wheel speed in ticks per second.
 */

void drive_ramp(int left, int right);

/**
 * @}
 */


/*
  void drive_getSpeedCalc(int *left, int *right);
  void drive_getSpeedActual(int *left, int *right);
*/

#ifndef DOXYGEN_SHOULD_SKIP_THIS

/* =========================================================================== */
//                        PRIVATE FUNCTIONS/MACROS
/* =========================================================================== */

/**
 * @name Private (used by abdrive library)
 * @{
 */

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

#ifndef ABD_L 
#define ABD_L 0
#endif

#ifndef ABD_R 
#define ABD_R 1
#endif

#ifndef ABD_B 
#define ABD_B 2
#endif

#ifndef ABD_T 
#define ABD_T 3
#endif


#ifndef ABD_FOR_BOTH
#define ABD_FOR_BOTH 2
#endif

#ifndef AB_RIGHT  
#define AB_RIGHT  1
#endif

#ifndef AB_LEFT
#define AB_LEFT -1
#endif

/*
 #ifndef interactive_development_mode
 #define interactive_development_mode
 void display_control_sys(int start, int end);
 #endif
*/

#ifdef _monitor_
void monitor_start(int monitorReps);
void monitor_stop();
int *encoderLeds_start(int pinLeft, int pinRight);
#endif

#ifndef AB_RIGHT  
#define AB_RIGHT  1
#endif

#ifndef AB_LEFT
#define AB_LEFT -1
#endif

#ifndef AB_FORWARD
/**
 *
 * @brief Text.
 */
#define AB_FORWARD 1
#endif

#ifndef AB_BACKWARD
/**
 *
 * @brief Text.
 */
#define AB_BACKWARD -1
#endif

void monitor_start(int monitorReps);
void monitor_stop(void);


/**
 * @}  // /Private
 */

#endif // DOXYGEN_SHOULD_SKIP_THIS





#if defined(__cplusplus)
}
#endif
/* __cplusplus */  
#endif
/* ABDRIVE_H */  

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
