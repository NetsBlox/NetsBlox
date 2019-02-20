/*
  @file drive_servoPins.c

  @author Parallax Inc

  @copyright
  Copyright (C) Parallax Inc. 2017. All Rights MIT Licensed.  See end of file.
 
  @brief 
*/
//                                            //                                //  


#include "abdrive360.h"


// Importrant, must call before anything that controls motion.
// (...as in before the cog is launched.  We are assuming users do 
// not intend to hot-swap their ActivityBot connections!)
/*
void drive_servoPins(int servoPinLeft, int servoPinRight)
{
  abd360_pinCtrlLeft = servoPinLeft;
  abd360_pinCtrlRight = servoPinRight;
}
*/

//
void drive_servoPins(int controlPinLeft, int controlPinRight)          // drivePins function
{
  //abd_sPinL = servoPinLeft;                                       // Local to global assignments
  //abd_sPinR = servoPinRight;
  //if(!abd_us) abd_us = CLKFREQ/1000000; 

  int eeAddr = _AB360_EE_Start_  + _AB360_EE_Pins_;
  unsigned char pinInfo[8] = {'s', 'p', 'L', 12, ' ', 'R', 13, ' '};  
  pinInfo[3] = (char) controlPinLeft;
  pinInfo[6] = (char) controlPinRight;

  ee_putStr(pinInfo, 8, eeAddr);

  abd360_pinCtrlLeft = controlPinLeft;
  abd360_pinCtrlRight = controlPinRight;

  //
  //if(!abd_intTabSetup)
  //{
  //  interpolation_table_setup();
  //}
  //
}
//
 

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
