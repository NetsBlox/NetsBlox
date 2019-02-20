/*
  @file drive_encoderPins.c

  @author Parallax Inc

  @copyright
  Copyright (C) Parallax Inc. 2017. All Rights MIT Licensed.  See end of file.
 
  @brief 
*/
//                                            //                                //  


#include "abdrive360.h"


// Comment same as for drive_servoPins.
/*
void drive_encoderPins(int encPinLeft, int encPinRight)
{
  abd360_pinFbLeft = encPinLeft;
  abd360_pinFbRight = encPinRight;
}  
*/

//
void drive_encoderPins(int encPinLeft, int encPinRight)          // drivePins function
{
  //abd_ePinL = encPinLeft;
  //abd_ePinR = encPinRight;
  //if(!abd_us) abd_us = CLKFREQ/1000000; 

  int eeAddr = 8 + _AB360_EE_Start_  + _AB360_EE_Pins_;
  unsigned char pinInfo[8] = {'e', 'p', 'L', 14, ' ', 'R', 15, ' '};  
  pinInfo[3] = (char) encPinLeft;
  pinInfo[6] = (char) encPinRight;

  ee_putStr(pinInfo, 8, eeAddr);

  abd360_pinFbLeft = encPinLeft;
  abd360_pinFbRight = encPinRight;

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
