/*
  @file abdrive360.c

  @author Parallax Inc

  @copyright
  Copyright (C) Parallax Inc. 2017. All Rights MIT Licensed.  See end of file.
 
  @brief 
*/


#include "abdrive360.h"


//                                            //                                //  


int abdrive360_getEepromPins();
int abdrive360_getEepromTransfer();

volatile int abd360_initialized = 0;

volatile int abd360_unitsPerRev = ABD360_UNITS_REV;

volatile int abd360_pinCtrlLeft = ABD60_PIN_CTRL_L;
volatile int abd360_pinCtrlRight = ABD360_PIN_CTRL_R;
volatile int abd360_pinFbLeft = ABD60_PIN_FB_L;
volatile int abd360_pinFbRight = ABD360_PIN_FB_R;

volatile int abd360_speedLimit = ABD_SPEED_LIMIT;
volatile int abd360_rampStep = ABD_RAMP_STEP;
volatile int abd360_speedLimitGoto = ABD_GOTO_SPEED_LIMIT;
volatile int abd360_rampStepGoto = ABD_GOTO_RAMP_STEP;

volatile int abd360_gotoMode = ABD360_GOTO_BLOCK;


void drive_init(void)
{

  abdrive360_getEepromPins();
  
  int result, flag = 0;
  do
  {
    result = servo360_connect(abd360_pinCtrlLeft, abd360_pinFbLeft);
    if(result < 0) flag = 1;
  }    
  while(result < 0);

  do
  {
    result = servo360_connect(abd360_pinCtrlRight, abd360_pinFbRight);
    if(result < 0) flag = 1;
  }    
  while(result < 0);
  
  if(flag) pause(200);  // PWR 1 -> 2, let servos engergize

  servo360_setUnitsFullCircle(abd360_pinCtrlLeft, ABD360_UNITS_REV);
  servo360_setUnitsFullCircle(abd360_pinCtrlRight, ABD360_UNITS_REV);

  servo360_setAcceleration(abd360_pinCtrlLeft, abd360_rampStep * 50);
  servo360_setAcceleration(abd360_pinCtrlRight, abd360_rampStep * 50);

  servo360_setMaxSpeed(abd360_pinCtrlLeft, abd360_speedLimit);
  servo360_setMaxSpeed(abd360_pinCtrlRight, abd360_speedLimit);

  servo360_couple(abd360_pinCtrlLeft, abd360_pinCtrlRight);
  
  /*
  #define S360_KPA 5000
  #define S360_KIA 150
  #define S360_KDA 0
  #define S360_POS_INTGRL_MAX 150
  #define S360_SCALE_DEN_A 1000
  */

  servo360_setControlSys(abd360_pinCtrlLeft, S360_SETTING_KPA, 5000);             // KPV
  servo360_setControlSys(abd360_pinCtrlRight, S360_SETTING_KPA, 5000);             // KPV
  servo360_setControlSys(abd360_pinCtrlLeft, S360_SETTING_KIA, 150);               // KIV
  servo360_setControlSys(abd360_pinCtrlRight, S360_SETTING_KIA, 150);               // KIV
  servo360_setControlSys(abd360_pinCtrlLeft, S360_SETTING_KDA, 0);               // KDV
  servo360_setControlSys(abd360_pinCtrlRight, S360_SETTING_KDA, 0);               // KDV
  servo360_setControlSys(abd360_pinCtrlLeft, S360_SETTING_IA_MAX, 150);            // FB360_VEL_INTGRL_MAX
  servo360_setControlSys(abd360_pinCtrlRight, S360_SETTING_IA_MAX, 150);            // FB360_VEL_INTGRL_MAX
  
  abdrive360_getEepromTransfer();
  
  abd360_initialized = 1;
}


int abdrive360_getEepromPins()
{
  int eeAddr = _AB360_EE_Start_  + _AB360_EE_Pins_;
  unsigned char pinInfo[16];

  for(int i = 0; i < 16; i++) 
  {
    pinInfo[i] = ee_getByte(eeAddr + i);
    /*
    if(pinInfo[i] <= 'z' && pinInfo[i] >= ' ')
    {
      print("%c", pinInfo[i]);
    }
    else
    {
      print("[%d]", pinInfo[i]);
    }
    */
  }    

  if(pinInfo[0] == 's' && pinInfo[1] == 'p' && pinInfo[2] == 'L' && pinInfo[5] == 'R')
  {
    abd360_pinCtrlLeft = (int) pinInfo[3];
    abd360_pinCtrlRight = (int) pinInfo[6];
  }
  /*
  else
  {
    print("!!! AB360 CONTROL PIN SETTINGS NOT FOUND !!!\r");
  }  
  */  
    
  if(pinInfo[8] == 'e' && pinInfo[9] == 'p' && pinInfo[10] == 'L' && pinInfo[13] == 'R')
  {
    abd360_pinFbLeft = (int) pinInfo[11];
    abd360_pinFbRight = (int) pinInfo[14];
  }
  /*
  else
  {
    print("!!! AB360 FEEDBACK PIN SETTINGS NOT FOUND !!!\r");
  } 
  */   
}

int abdrive360_getEepromTransfer()
{
  //if(!abd_us) abd_us = CLKFREQ/1000000; 
  
  unsigned char str[12];
  ee_getStr(str, 12, _AB360_EE_Start_);
  str[11] = 0;
  
  if(strcmp(str, "AB360      "))
  {
    //print("!!! AB360 SETTINGS NOT FOUND, RETURNING !!!\r");
    return -1;
  }   
  /*
  else
  for(int i = 0; i < 12; i++)
  {
    if(str[i] <= 'z' && str[i] >= ' ')
    {
      print("%c", str[i]);
    }
    else
    {
      print("[%d]", str[i]);
    }
  }    
  */
 
    
  int mVccwL = ee_getInt(_AB360_EE_Start_ + _AB360_EE_mVccwL_);
  int bVccwL = ee_getInt(_AB360_EE_Start_ + _AB360_EE_bVccwL_); 
  int mVcwL = ee_getInt(_AB360_EE_Start_ + _AB360_EE_mVcwL_); 
  int bVcwL = ee_getInt(_AB360_EE_Start_ + _AB360_EE_bVcwL_); 

  int mVccwR = ee_getInt(_AB360_EE_Start_ + _AB360_EE_mVccwR_); 
  int bVccwR = ee_getInt(_AB360_EE_Start_ + _AB360_EE_bVccwR_); 
  int mVcwR = ee_getInt(_AB360_EE_Start_ + _AB360_EE_mVcwR_); 
  int bVcwR = ee_getInt(_AB360_EE_Start_ + _AB360_EE_bVcwR_); 

  servo360_setTransferFunction(abd360_pinCtrlLeft, S360_SETTING_VM_CCW, mVccwL);
  servo360_setTransferFunction(abd360_pinCtrlLeft, S360_SETTING_VB_CCW, bVccwL);
  servo360_setTransferFunction(abd360_pinCtrlLeft, S360_SETTING_VM_CW, mVcwL);
  servo360_setTransferFunction(abd360_pinCtrlLeft, S360_SETTING_VB_CW, -bVcwL );

  servo360_setTransferFunction(abd360_pinCtrlRight, S360_SETTING_VM_CCW, mVccwR );
  servo360_setTransferFunction(abd360_pinCtrlRight, S360_SETTING_VB_CCW, bVccwR);
  servo360_setTransferFunction(abd360_pinCtrlRight, S360_SETTING_VM_CW, mVcwR);
  servo360_setTransferFunction(abd360_pinCtrlRight, S360_SETTING_VB_CW, -bVcwR);
  /*
  print("\r=== Summary ===\r"); 
  print("mVccwL = %d\r", mVccwL); 
  print("bVccwL = %d\r", bVccwL); 
  print("mVcwL = %d\r", mVcwL); 
  print("bVcwL = %d\r", bVcwL); 
  print("mVccwR = %d\r", mVccwR); 
  print("bVccwR = %d\r", bVccwR); 
  print("mVcwR = %d\r", mVcwR); 
  print("bVcwR = %d\r", bVcwR);  
  */ 
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
