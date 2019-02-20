/*
  @file servo360_goto.c

  @author Parallax Inc

  @copyright
  Copyright (C) Parallax Inc. 2017. All Rights MIT Licensed.  See end of file.
 
  @brief 
*/


#include "simpletools.h"  
#include "servo360.h"

int servo360_goto(int pin, int position)
{
  int target, offset;
  if(!_fb360c.servoCog) servo360_run();
  int p = servo360_findServoIndex(pin);
  if(p == -1)return -1;

  while(lockset(_fb360c.lock360));

  //offset = _fs[p].angleTarget;
  //print("%d, %d\r", p, _fs[p].angleCalc);
  //180516 offset = _fs[p].angleCalc;


  if(_fs[p].csop == S360_POSITION) 
  {
    offset = _fs[p].sp;
    _fs[p].angleCalc = _fs[p].sp;
  }
  else if(_fs[p].csop == S360_GOTO)
  {
    offset = _fs[p].angleTarget;
  }    
  else
  {
    offset = _fs[p].angleCalc;
  }    

  //print("%d, %d\r", p, _fs[p].angleCalc);
  target = position * S360_UNITS_ENCODER / _fs[p].unitsRev;

  _fs[p].angleTarget = target + offset;

  // print("%d, %d\r", p, _fs[p].angleTarget);

  if(_fs[p].csop != S360_GOTO)
  {
    _fs[p].csop = S360_GOTO;
  }    
  else
  {
    _fs[p].approachFlag = 0;
  }    
  
  lockclr(_fb360c.lock360);
  
  return p;
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
