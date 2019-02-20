/*
  @file drive_goto.c

  @author Parallax Inc

  @copyright
  Copyright (C) Parallax Inc. 2017. All Rights MIT Licensed.  See end of file.
 
  @brief 
*/
//                                            //                                //  


#include "abdrive360.h"


void drive_goto(int distLeft, int distRight)
{
  /*
  #ifdef _servo360_monitor_
    dprint(term, "\r\rdrive_goto(%d, %d)\r\r", distLeft, distRight);
  #endif  
  */

  int abd360_rampStepTemp, speedMaxTemp, 
      ratio, slowerSide,
      abd360_rampStepEnc, abd360_speedLimitEnc;
  
  if(!abd360_initialized) drive_init();
  
  servo360_setAcceleration(abd360_pinCtrlLeft, abd360_rampStepGoto * 50);
  servo360_setAcceleration(abd360_pinCtrlRight, abd360_rampStepGoto * 50);
  servo360_setMaxSpeed(abd360_pinCtrlLeft, abd360_speedLimitGoto);
  servo360_setMaxSpeed(abd360_pinCtrlRight, abd360_speedLimitGoto);

  if(abs(distRight) > abs(distLeft))
  {
    abd360_rampStepEnc = servo360_getRampStep(abd360_pinCtrlLeft);
    abd360_speedLimitEnc = servo360_getMaxSpeed(abd360_pinCtrlLeft);

    ratio = 1000 * abs(distLeft) / abs(distRight);
    
    abd360_rampStepTemp = abd360_rampStepEnc * ratio / 1000;
    speedMaxTemp = abd360_speedLimitEnc * ratio / 1000;
    
    servo360_setRampStep(abd360_pinCtrlLeft, abd360_rampStepTemp); 
    servo360_setMaxSpeed(abd360_pinCtrlLeft, speedMaxTemp);
    
    slowerSide = AB360_LEFT;
  }
  else if(abs(distLeft) > abs(distRight))
  {
    abd360_rampStepEnc = servo360_getRampStep(abd360_pinCtrlRight);
    abd360_speedLimitEnc = servo360_getMaxSpeed(abd360_pinCtrlRight);

    ratio = 1000 * abs(distRight) / abs(distLeft);
    
    abd360_rampStepTemp = abd360_rampStepEnc * ratio / 1000;
    speedMaxTemp = abd360_speedLimitEnc * ratio / 1000;
    
    servo360_setMaxSpeed(abd360_pinCtrlRight, speedMaxTemp);
    servo360_setRampStep(abd360_pinCtrlRight, abd360_rampStepTemp); 
    
    slowerSide = AB360_RIGHT;
  }
  else
  {
    slowerSide = AB360_NEITHER;
  }
  
  servo360_goto(abd360_pinCtrlLeft, distLeft);
  servo360_goto(abd360_pinCtrlRight, -distRight);
  
  if(abd360_gotoMode == ABD360_GOTO_BLOCK)
  { 
    while(servo360_getCsop(abd360_pinCtrlLeft) == S360_GOTO && servo360_getCsop(abd360_pinCtrlRight) == S360_GOTO);
  }    
  
  /*
  servo360_setAcceleration(abd360_pinCtrlLeft, abd360_rampStep * 50);
  servo360_setAcceleration(abd360_pinCtrlRight, abd360_rampStep * 50);
  servo360_setMaxSpeed(abd360_pinCtrlLeft, abd360_speedLimit);
  servo360_setMaxSpeed(abd360_pinCtrlRight, abd360_speedLimit);
  */

  pause(1000);
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
