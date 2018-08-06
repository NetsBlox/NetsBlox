/**
  @file servo360.h

  @author Parallax Inc
  
  @version 0.9.1

  @copyright
  Copyright (C) Parallax Inc. 2017. All Rights MIT Licensed.  See end of file.
 
  @brief Parallax Feedback 360 High Speed Servo control and monitoring functions. 
  Uses one additional cog to control up to 4 Parallax Feedback 360 Continuous Rotation 
  Servos.  When the abdrive360 library is in use, the total drops to two, since two
  are already in use as the ActivityBot 360's differential drive servos.  
*/



//#define _servo360_monitor_



#ifndef SERVO360_H
#define SERVO360_H

#if defined(__cplusplus)
extern "C" {
#endif


#include "simpletools.h"  
//#include "patch.h"

#ifdef _servo360_monitor_
  #include "fdserial.h"
#endif



#ifndef DOXYGEN_SHOULD_SKIP_THIS



#ifndef S360_UNITS_FULL_CIRCLE
#define S360_UNITS_FULL_CIRCLE 360
#endif


#ifndef S360_MAX_SPEED
#define S360_MAX_SPEED 2 * 4096 
#endif

#ifndef S360_VM 
#define S360_VM 180
#endif
//#define S360_VB_POS 200
//#define S360_VB_NEG -200
#ifndef S360_VM_CCW
#define S360_VM_CCW S360_VM
#endif

#ifndef S360_VM_CW
#define S360_VM_CW S360_VM
#endif

#ifndef S360_VM_CCW
#define S360_VM_CCW S360_VM
#endif

#ifndef S360_VM_CW
#define S360_VM_CW S360_VM
#endif

#ifndef S360_VB_CCW
#define S360_VB_CCW 200
#endif

#ifndef S360_VB_CW
#define S360_VB_CW -200
#endif


#ifndef S360_DUTY_CYCLE_MIN
#define S360_DUTY_CYCLE_MIN 290
#endif

#ifndef S360_DUTY_CYCLE_MAX
#define S360_DUTY_CYCLE_MAX 9710
#endif


#ifndef S360_CCW_POS 
#define S360_CCW_POS 1
#endif

#ifndef S360_CCW_NEG 
#define S360_CCW_NEG -1
#endif


#ifndef S360_SPEED 
#define S360_SPEED 1
#endif

#ifndef S360_POSITION 
#define S360_POSITION 2
#endif

#ifndef S360_GOTO 
#define S360_GOTO 3
#endif

#ifndef S360_MONITOR 
#define S360_MONITOR 4
#endif

#ifndef S360_FREQ_CTRL_SIG 
#define S360_FREQ_CTRL_SIG 50
#endif

#ifndef S360_DEVS_MAX 
#define S360_DEVS_MAX 4
#endif

//#define S360_RAMP_STEP 10 * 4096 / 360;

#ifndef S360_RAMP_STEP
#define S360_RAMP_STEP 72 * 4096 / 360
#endif

// Rename to indicate encoder

#ifndef S360_M
#define S360_M 4348
#endif

#ifndef S360_B
#define S360_B -129
#endif

#ifndef S360_ENC_RES
#define S360_ENC_RES 4096
#endif

/*
#define S360_KPA 5000
#define S360_KIA 150
#define S360_KDA 0
#define S360_POS_INTGRL_MAX 150
#define S360_SCALE_DEN_A 1000
*/

//

#ifndef S360_KPA 
#define S360_KPA 12000
#endif

#ifndef S360_KIA 
#define S360_KIA 600
#endif

#ifndef S360_KDA 
#define S360_KDA 6000
#endif

#ifndef S360_POS_INTGRL_MAX 
#define S360_POS_INTGRL_MAX 600
#endif

#ifndef S360_SCALE_DEN_A 
#define S360_SCALE_DEN_A 1000
#endif
//

/*
#define S360_KPV 3000
#define S360_KIV 500
#define S360_KDV 1600
#define S360_VEL_INTGRL_MAX 325
*/

#ifndef S360_KPV 
#define S360_KPV 500
#endif

#ifndef S360_KIV 
#define S360_KIV 0
#endif

#ifndef S360_KDV 
#define S360_KDV 0
#endif

#ifndef S360_VEL_INTGRL_MAX 
#define S360_VEL_INTGRL_MAX 0
#endif

#ifndef S360_SCALE_DEN_V 
#define S360_SCALE_DEN_V 1000
#endif


#ifndef S360_PW_CENTER 
#define S360_PW_CENTER 15000
#endif

#ifndef S360_CS_HZ 
#define S360_CS_HZ 50
#endif

#ifndef S360_UNITS_ENCODER 
#define S360_UNITS_ENCODER 4096
#endif

#ifndef S360_UNITS_REV 
#define S360_UNITS_REV 360
#endif


#ifndef S360_SETTING_KPV 
#define S360_SETTING_KPV 1
#endif

#ifndef S360_SETTING_KIV 
#define S360_SETTING_KIV 2
#endif

#ifndef S360_SETTING_KDV 
#define S360_SETTING_KDV 3
#endif

#ifndef S360_SETTING_IV_MAX 
#define S360_SETTING_IV_MAX 4
#endif

#ifndef S360_SETTING_KPA 
#define S360_SETTING_KPA 5
#endif

#ifndef S360_SETTING_KIA 
#define S360_SETTING_KIA 6
#endif

#ifndef S360_SETTING_KDA 
#define S360_SETTING_KDA 7
#endif

#ifndef S360_SETTING_IA_MAX 
#define S360_SETTING_IA_MAX 8
#endif

#ifndef S360_SETTING_VB_CCW 
#define S360_SETTING_VB_CCW 9
#endif

#ifndef S360_SETTING_VB_CW 
#define S360_SETTING_VB_CW 10
#endif

#ifndef S360_SETTING_VM_CCW 
#define S360_SETTING_VM_CCW 11    
#endif

#ifndef S360_SETTING_VM_CW 
#define S360_SETTING_VM_CW 12
#endif

//#define S360_A_MAX (((1 << 31) - 1)) / S360_UNITS_FULL_CIRCLE  // 524287 degrees

#ifndef S360_A_MAX 
#define S360_A_MAX 524287  
#endif


#ifndef S360_SCALE_DEN_COUPLE 
#define S360_SCALE_DEN_COUPLE 1000        
#endif

#ifndef S360_SCALE_COUPLE 
#define S360_SCALE_COUPLE 2000   
#endif


#ifndef S360_LATENCY 
#define S360_LATENCY 3  
#endif


#ifndef S360_PWMAX 
#define S360_PWMAX 2400 
#endif

#ifndef S360_PWMIN 
#define S360_PWMIN -2400 
#endif


/*

// WIP servo calibration updates
//40564

#ifndef _AB360_EE_Start_
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

#define _AB360_EE_End_ _AB360_EE_Start_ + 60
#endif

*/



                           ////// ALL SERVOS //////
//
typedef volatile struct servo360_cog_s 
{
  int *servoCog;
  volatile int lock360;
  volatile int t360;
  volatile int t360slice;
  volatile int fbSlice;
  volatile int spSlice;
  volatile int devCount;
  volatile int pulseCount;
  volatile int cntPrev;
  volatile int dt360;
  volatile int dt360a[2];
} servo360_cog_t;

extern volatile servo360_cog_t _fb360c;
//
                            ////// PER SERVO ///  ///
  
typedef volatile struct servo360_s 
{
  // settings
  volatile int pinCtrl;                       // pinControl
  volatile int pinFb;                       // pinFeedback
  volatile int angleSign;
  volatile int rampStep;
  volatile int speedLimit;
  volatile int feedback;
  volatile int angleMax;
  volatile int angleMin;
  volatile int unitsRev;
  volatile int couple;
  volatile int coupleScale;
  volatile int enable;
  
  volatile int vmCcw;
  volatile int vmCw;
  volatile int vbCcw;    
  volatile int vbCw;

  // admin
  volatile int csop;
  volatile int speedReq;
  
  // encoders
  volatile int dc, dcp;
  volatile int theta, thetaP;
  volatile int turns;
  volatile int angleFixed, angleFixedP; 
  volatile int angle, angleP, pvOffset;
  //volatile int stalled, noSignal;
  volatile int opMax;
  
  // pulse control
  volatile int speedOut;
  volatile int pw;
  
  // velocity control system
  volatile int opPidV;
  volatile int approachFlag;
  volatile int ticksDiff;
  volatile int ticksGuard;
  volatile int angleCalc;
  volatile int angleDeltaCalc;
  volatile int angleError;
  volatile int erDist, erDistP;
  volatile int speedTarget;
  volatile int speedTargetP;
  volatile int integralV; 
  volatile int derivativeV;
  volatile int opV;
  volatile int iMaxV;
  volatile int iMinV;
  volatile int KpV;
  volatile int KiV;
  volatile int KdV;
  volatile int pV, iV, dV;
  volatile int speedMeasured;
  volatile int drive;
  volatile int stepDir;
  volatile int lag;
  volatile int accelerating;
  volatile int speedTargetTemp;
  
  /*
  // This could remedy the overshoot problem, but it seems to reduce
  // drive_goto accuracy.
  
  #define FB360_OFFSET_MAX 5
  #define FB360_V_ARRAY 8

  volatile int vT[FB360_V_ARRAY];
  volatile int offset;
  */
  
  // position control system
  volatile int Kp;
  volatile int Ki;
  volatile int Kd;
  volatile int er, erP;
  volatile int sp, integral, derivative;
  volatile int op, iMax, iMin;
  volatile int p, i, d;
  
  // goto system
  volatile int angleTarget;
} 
servo360_t;

extern volatile servo360_t _fs[S360_DEVS_MAX];

// console
#ifdef _servo360_monitor_
  fdserial *term;
  extern volatile int suppressFbDisplay;
#endif



#endif // DOXYGEN_SHOULD_SKIP_THIS



/**
  @brief Initializes a connection to a Parallax Feedback 360 servo.  The current
  position of the servo during the call will be used as the 0-degree position.
  
  @details Error codes:  
                        -4 control pin already allocated, 
                        -5 feedback pin already allocated, 
                        -6 control or feedback pin out of 0...27 range, 
                        -7 too many devices, 
                        -8 no feedback signal found on pinFeedback.
  
  @param pinControl I/O pin connected to the servo's white control signal line.
  
  @param pinFeedback I/O pin connected to the servo's yellow feedback line.
  
  @returns 0 or higher if success.  
*/  
int servo360_connect(int pinControl, int pinFeedback);



/**
  @brief Set an angle in degrees for servo to move to and hold.  The default 
  degree is 1/360th of a full circle, and the default angle limits are 
  +/- 524,287 degrees.  
  
  @details These values can be adjusted with the servo360_setUnitsFullCircle 
  and servo360_getAngleLimits functions. 

  @param pin Control pin used in servo360_connect call.  
  
  @param position Angle in degrees from zero degrees.  The zero degree value 
  is either the position when servo360_connect was called, or a custom position
  relative to mechanical zero that can be set with the servo360_setAngleOffset
  function.  
  
  @returns 0 or higher if success.
*/ 
int servo360_angle(int pin, int position);


/**
  @brief Get measured angle of servo in degree units.  
  
  @param pin Control pin used in servo360_connect call.  

  @returns The current angle in degree units.
*/ int servo360_getAngle(int pin);



/**
  @brief Set servo rotation speed in degrees per second.  The default max 
  values range from 720 degrees per second (full speed counterclockwise)
  to 0 (stop) to -720 degrees per second (full speed clockwise).  
  
  @details 
  
  Max speed can be set with servo360_setMaxSpeed.  Acceleration can be set 
  with a call to servo360_setAcceleration.  Max distance is 524,000 revolutions 
  before a turns reset is needed.  Use servo360_getTurns if your application 
  could potentially exceed this limit in a single session and 
  servo360_setTurns(pin, 0) to accommodate another half million turns!
  
  @param pin Control pin used in servo360_connect call.  
  
  @param speed Speed in degrees per second.
  
  @returns 0 or higher if success.
*/ 
int servo360_speed(int pin, int speed);


/**
  @brief Measure the current speed.  For best results, take the 
  average of multiple measurements.
  
  @param pin Control pin used in servo360_connect call.  
  
  @returns The speed in degrees per second.  
*/ int servo360_getSpeed(int pin);


/**
  @brief Go to a certain number of degrees from the current position.  Positive 
  values are counterclockwise, negative values are clockwise.  This is a "set 
  it and forget it" function that returns immediately after the maneuver has 
  been initiated.  The maneuver's progress can be monitored with 
  servo360_getCsop and also with servo360_getAngle.
  
  @param pin Control pin used in servo360_connect call.  
  
  @param position The new position in terms of degrees from the current
  position.
  
  @returns 0 or higher if the goto maneuver has been successfully initiated.
*/ 
int servo360_goto(int pin, int position);


/**
  @brief Csop is an abbreviation for control system operation, which could be
  speed, position, or goto control.  During a servo360_goto maneuver, this
  function will return S360_GOTO.  When the maneuver has completed, it will
  return S360_POSITION.
  
  @param pin Control pin used in servo360_connect call.  
  
  @returns S360_SPEED (1), S360_POSITION, (2), or S360_GOTO (3), or -1 if the
  I/O pin is not valid servo control or feedback pin.
*/ 
int servo360_getCsop(int pin);



/**
  @brief Stop servo motion if it is turning. It is equivalent to a call to 
  servo360_speed(pin, 0).   
  
  @param pin Control pin used in servo360_connect call.  
  
  @returns 0 or higher if success.
*/ 
int servo360_stop(int pin);



/**
  @name Settings - Speed Control
  @{ 
*/



/**
  @brief Set acceleration in terms of degrees per second squared. The default 
  is 3600 degrees per second squared, which allows the servo to accelerate as
  fast as it can, regardless of power supply.  To exert control over acceleration, 
  use values in the 180 to 1800 range.  
  
  @param pin Control pin used in servo360_connect call.  
  
  @param unitsPerSecSquared Acceleration in degree units per second squred.  
  
  @returns 0 or higher if success.
*/ 
int servo360_setAcceleration(int pin, int unitsPerSecSquared);


/**
  @brief Get current acceleration in terms of degrees per second squared.  
  
  @param pin Control pin used in servo360_connect call.  
  
  @returns degrees per second squared acceleration setting for servo360_speed 
  and servo360_goto.
*/ 
int servo360_getAcceleration(int pin);



/**
  @brief Set the maximum servo speed in terms of degrees per second.
  
  @param pin Control pin used in servo360_connect call.  
  
  @param speed Speed in degrees per second.
  
  @returns 0 or higher if success.
*/ 
int servo360_setMaxSpeed(int pin, int speed);


/**
  @brief Get the max speed setting.
  
  @param pin Control pin used in servo360_connect call.  
  
  @returns Current max speed setting in degrees per second.
*/ 
int servo360_getMaxSpeed(int pin);



/**
  @brief Set acceleration in terms of degrees per second per 50th of a second.  
  For a more straightforward implementation, use servo360_setAcceleration.
  
  @param pin Control pin used in servo360_connect call.  
  
  @param stepSize Max velocity change in degrees per second per 50th of a 
  second.
  
  @returns 0 or higher if success.
*/ 
int servo360_setRampStep(int pin, int stepSize);


/**
  @brief Get current acceleration setting in terms of degrees per second per 
  50th of a second.  For a more straightforward implementation, use 
  servo360_getAcceleration instead.
  
  @param pin Control pin used in servo360_connect call.  
  
  @returns stepSize Max velocity change in degrees per second per 50th of a 
  second.
*/ 
int servo360_getRampStep(int pin);



/**
  @}
 
  @name Settings - Angle Control
  @{ 
*/





/**
  @brief Set the angle limits the servo is allowed to turn to during position
  control.  These limits only affect angle control, not speed or goto control.
  The default angle limits are +/- 524287 degrees.
  
  @param pin Control pin used in servo360_connect call.  
  
  @param ccwMax Limit for counterclockwise rotation.
  
  @param cwMax Limit for clockwise rotation.
  
  @returns 0 or higher if success.
*/ 
int servo360_setAngleLimits(int pin, int ccwMax, int cwMax);


/**
  @brief Check the angle limits the servo is allowed to turn to during position
  control.  These limits only affect angle control, not speed or goto control.
  The default angle limits are +/- 524287 degrees.
  
  @param pin Control pin used in servo360_connect call.  
  
  @param *ccwMax Maximum counterclockwise degree angle limit.  
  
  @param *cwMax Maximum clockwise degree angle limit.  
  
  @returns Current angle limit.
*/ 
int servo360_getAngleLimits(int pin, int *ccwMax, int *cwMax);



/**
  @brief Set the maximum speed at which the servo is allowed to turn 
  while adjusting to a new angle set point.
  
  @param pin Control pin used in servo360_connect call.  
  
  @param speed Maximum speed in degrees per second.
  
  @returns 0 or higher if success.
*/ 
int servo360_setAngleCtrlSpeedMax(int pin, int speed);


/**
  @brief Check the maximum speed at which the servo is allowed to turn 
  while adjusting to a new angle set point.
  
  @param pin Control pin used in servo360_connect call.  
  
  @returns speed Maximum speed in degrees per second.
*/ 
int servo360_getAngleCtrlSpeedMax(int pin);



/**
  @brief Set the offset from the servo's mechanical 0 degree position.  If this
  function is not called, the 0 degree position is the angle measured when 
  servo_connect is called.
  
  @param pin Control pin used in servo360_connect call.  
  
  @param angle Degree offset from the mechanical 0 degrees (0 to 360).
  
  @returns 0 or higher if success.
*/ 
int servo360_setAngleOffset(int pin, int angle);


/**
  @brief Check the offset from the servo's mechanical 0-degree position.  If 
  servo360_setAngleOffset has not been called, the 0-degree position will be 
  whatever angle was measured when servo_connect was called.
  
  @param pin Control pin used in servo360_connect call.  
  
  @returns Degree offset from the mechanical 0 degrees (0 to 360).
*/ 
int servo360_getAngleOffset(int pin);



/**
  @}
 
  @name Settings - General
  @{ 
*/





/**
  @brief Set the number of units in a full circle.  By default, this value is 360.  
  This function does not actually change acceleration or other settings.
  IMPORTANT: This function DOES change the degrees value in any function called
  after the new degree value has been set.  For example, the default max speed
  setting is 720 degrees per second = 2 revolutions per second.  If you change 
  the units to 64 degrees per full circle, the max speed will still be 2 
  revolutions per second, but for max speed, the speed supplied to 
  servo360_speed will have to be 128 instead of 720.  This applies to all other 
  control, setting, and monitoring functions -they will be in terms of 64 (or 
  whatever value you choose) instead of 360.
  
  @param pin Control pin used in servo360_connect call.  
  
  @param units Number of degrees in a full circle.  The valid range is 32
  to 360. 
  
  @returns 0 or higher if success.
*/ 
int servo360_setUnitsFullCircle(int pin, int units);


/**
  @brief Get the number of units in a full circle.  By default, this value is
  360, but it can be changed with servo360_setUnitsFullCircle, and checked
  with this function.  See servo360_setUnitsFullCircle for more info.
  
  @param pin Control pin used in servo360_connect call.  
  
  @returns units The number of degrees in a full circle.  The valid range is 
  32 to 360. 
*/ 
int servo360_getUnitsFullCircle(int pin);



/**
  @brief The servo360.h library is designed to use Proportional, Integral and
  Derivative (PID) control to maintain both speed and position.  The default 
  values are mainly for no load or a light load.  This function can be used to 
  change those settings to accommodate different loads or make the responses 
  more peppy (at the expense of possible oscillations when the set point has
  been reached).  An example of calling this function to restore the original 
  proportional control setting would be 
  servo360_setControlSys(pin, S360_SETTING_KPV, 500).
  
  @details <b>Control System Settings</b> <br>

  Error units are in terms of 4096ths of a full circle, and the settings listed
  below multiply by 1000ths.  For example, if the angular distance error during
  a 1/50th of a second speed measurement is 128 4096ths of a circle, the 
  effect of proportional control with the default setting will be 
  (500 * 128) / 1000 = 64.  The result is that the control system will try to 
  increase the speed by 64/4096ths of a full circle per second.

  <b>Velocity Control System Constants</b><br>
  
  Proportional <br>
  constant name: S360_SETTING_KPV, default value: 500. <br>
  Integral <br>
  constant name: S360_SETTING_KIV, default value: 0. <br>
  Derivative <br>
  constant name: S360_SETTING_KDV, default value: 0. <br>
  Max Integral Output <br>
  constant name: S360_SETTING_KIV_MAX, default value: 0. <br>

  <b>Angular Control System Constants</b><br>
  
  Proportional <br>
  constant name: S360_SETTING_KPA, default value: 12000. <br>
  Integral <br>
  constant name: S360_SETTING_KIA, default value: 600. <br>
  Derivatively <br>
  constant name: S360_SETTING_KDA, default value: 6000. <br>
  Max Integral Output <br>
  constant name: S360_SETTING_KIA_MAX, default value: 1000. <br>

  @param pin Control pin used in servo360_connect call.  
  
  @param constant Constant name of value to change.
  
  @param value New control system constant.  
  
  @returns 0 or higher if success.
*/ 
int servo360_setControlSys(int pin, int constant, int value);


/**
  @brief Check control system constant.  See the servo360_setControlSys
  function for more info.
  
  @param pin Control pin used in servo360_connect call.  
  
  @param constant Constant name of value to change.
  
  @returns value Value of the control system constant.  
*/ 
int servo360_getControlSys(int pin, int constant);



/**
  @brief Change the number of turns that have elapsed since the application has
  started.  Use this function to reset to zero if the number of revolutions 
  since the application started running approaches 524,000 under speed and/or
  goto control.  For angular control, use it if the angle approaches +/- 524,287
  degrees.  When the application is restarted with either RESET or by turning
  power off and back on, the turns return to zero automatically.
  
  @param pin Control pin used in servo360_connect call.  
  
  @param turns The new number of turns that have elapsed since the start of
  the application.
  
  @returns 0 or higher if success.
*/ 
int servo360_setTurns(int pin, int turns);


/**
  @brief Get the number of times the output shaft has turned in a full 
  circle since the application started (either by power-on or press/release 
  RESET).  The turns value is positive for counterclockwise turns or negative
  for clockwise.
  
  @param pin Control pin used in servo360_connect call.  
  
  @returns 360 degree turns since the application started.
*/ 
int servo360_getTurns(int pin);



/**
  @}
 
  @name Settings - Differential Drive
  @{ 
*/





/**
  @brief This function is used by the abdrive360 library to reduce the drive on 
  a servo whose position is further ahead in relation to the calculated target 
  position during a given 50th of a second.
  
  @param pinA The control pin of one of the two coupled servos.  
  
  @param pinB The control pin of the other coupled servo.  
  
  @returns 0 or higher if success.
*/ 
int servo360_couple(int pinA, int pinB);


/**
  @brief Change the scale factor in a pair of servos that were coupled 
  with the servo360_couple call.  The scale factor is how much the control 
  system subtracts from the faster servo's drive level in response to 
  differences between two coupled servos distances from their respective 
  distance set points during a given 50th of a second.  The default scale 
  value is 2000, which multiplies a distance error in 4096ths of a circle 
  by 2 and adds/subtracts it to/from the requested drive speed to reduce 
  the faster servos lead in its progress to the final angle. 
  
  @param pinA Control pin of one of the two coupled servos.  
  
  @param pinB Control pin of the other coupled servo.  
  
  @param scale value by which the faster servo is slowed down.  
  
  @returns 0 or higher if success.
*/ 
int servo360_setCoupleScale(int pinA, int pinB, int scale);



/**
  @}
 
  @name Settings - Advanced
  @{ 
*/





/**
  @brief Enable or disable the control system signal.  
  
  @param pin Control pin used in servo360_connect call.  
  
  @param state 1 enabled, 0 disabled
  
  @returns 0 or higher if success.
*/ 
int servo360_enable(int pin, int state);


/**
  @brief Enable or disable the feedback system.  If the feedback system is
  disabled, the servo should only be controlled with servo360_set.  
  
  @param pin Control pin used in servo360_connect call.  
  
  @param state 1 enabled, 0 disabled.
  
  @returns 0 or higher if success.
*/ 
int servo360_feedback(int pin, int state);


/**
  @brief Use pulse width control to set servo speed without feedback.  Make
  sure to call serov360_feedback(pin, 0) before making any calls to this 
  function.
  
  @param pinControl pinControl used in servo360_connect call.  
  
  @param time Control pulse time in microseconds (1280 to 1720) of high time 
  that will be repeated every 20 ms.  
  
  @returns 0 or higher if success.
*/ 
int servo360_set(int pinControl, int time);



/**
  @}
*/



#ifndef DOXYGEN_SHOULD_SKIP_THIS



/* Private */
void servo360_run(void);
void servo360_end();
void servo360_setup(void);
void servo360_mainLoop();
void servo360_outputSelector(int p);

void servo360_servoPulse(int p, int q);
void servo360_waitServoCtrllEdgeNeg(int p);
int servo360_dutyCycle(int p, int scale);
int servo360_crossing(int current, int previous, int units);
int servo360_getTheta(int p);
void servo360_checkAngle(int p);
void servo360_captureOffset(int p);
void servo360_setPositiveDirection(int p, int direction);

int servo360_setRampStep(int p, int stepSize);

int servo360_upsToPulseFromTransferFunction(int unitsPerSec, int p);
void servo360_pulseControl(int p, int speedUps);

void servo360_speedControl(int p);
int servo360_pidA(int p);
int servo360_pidV(int p);  

int servo360_findServoIndex(int pin);

int servo360_unitsAngleToEncoder(int value, int unitsRev);
int servo360_unitsEncoderToAngle(int value, int unitsRev); 
int servo360_checkDistanceRemaining(int pin, int speed, int finalAngle);

int servo360_setMaxSpeedEncoded(int pin, int speed);

void servo360_monitorRun(void);
void servo360_monitorEnd(void);

int servo360_setTransferFunction(int pin, int constant, int value);


int servo360_getAngle12Bit(int pin);
int servo360_getAngleFixedOrigin(int pin);
int servo360_getAngleCalc(int pin);

/*
__attribute__((constructor))
void servo360_patch(void);
*/

#ifdef _servo360_monitor_
void console();
void servo360_monitor_start(void);
void servo360_monitor_stop();
int terminal_checkForValue(fdserial *connection, int *value);
#endif



#endif // DOXYGEN_SHOULD_SKIP_THIS



#if defined(__cplusplus)
}
#endif
/* __cplusplus */ 
#endif
/* SERVO360_H */ 


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
