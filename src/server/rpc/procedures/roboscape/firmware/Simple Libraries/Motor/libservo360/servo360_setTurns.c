/*
  @file servo360_setTurns.c

  @author Parallax Inc

  @copyright
  Copyright (C) Parallax Inc. 2017. All Rights MIT Licensed.  See end of file.
 
  @brief 
*/


#include "simpletools.h"  
#include "servo360.h"


int servo360_setTurns(int pin, int turns)
{
  if(!_fb360c.servoCog) servo360_run();
  int p = servo360_findServoIndex(pin);
  if(p == -1)return -1;

  int delta = turns * S360_ENC_RES;
  
  while(lockset(_fb360c.lock360));
  
  _fs[p].angle += delta;  
  _fs[p].angleP += delta;
  _fs[p].angleFixed += delta;
  _fs[p].angleFixedP += delta;
  _fs[p].turns += turns;


  if(_fs[p].csop == S360_POSITION)
  {
    _fs[p].sp += delta;
    _fs[p].angleTarget += delta;
  }
  //
  else if(_fs[p].csop == S360_SPEED)
  {
    _fs[p].angleCalc += delta;
    _fs[p].angleTarget += delta;
  }
  //
  else if(_fs[p].csop == S360_GOTO)
  {
    _fs[p].angleTarget += delta;
    _fs[p].sp += delta;
    _fs[p].angleCalc += delta;
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
