/*
  @file servo360_angle.c

  @author Parallax Inc

  @copyright
  Copyright (C) Parallax Inc. 2017. All Rights MIT Licensed.  See end of file.
 
  @brief 
*/


#include "simpletools.h"  
#include "servo360.h"


int servo360_angle(int pin, int position)
{
  if(!_fb360c.servoCog) servo360_run();
  int p = servo360_findServoIndex(pin);
  if(p == -1)return -1;
  
  if(position >= _fs[p].angleMax) position = _fs[p].angleMax;
  if(position <= _fs[p].angleMin) position = _fs[p].angleMin;

  while(lockset(_fb360c.lock360));
  
  _fs[p].sp = position * S360_UNITS_ENCODER / _fs[p].unitsRev;
  _fs[p].csop = S360_POSITION;

  {
    _fs[p].speedTarget  = 0;
    _fs[p].angleError = 0;
    _fs[p].erDist = 0;
    _fs[p].erDistP = 0;
    _fs[p].integralV = 0;
    _fs[p].derivativeV = 0;
    _fs[p].pV = 0;
    _fs[p].iV = 0;
    _fs[p].dV = 0;
    _fs[p].opPidV = 0;
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
