/*
  @file servo360_feedback.c

  @author Parallax Inc

  @copyright
  Copyright (C) Parallax Inc. 2017. All Rights MIT Licensed.  See end of file.
 
  @brief 
*/



#include "simpletools.h"  
#include "servo360.h"

int servo360_feedback(int pin, int state)
{
  if(!_fb360c.servoCog) servo360_run();
  int p = servo360_findServoIndex(pin);
  if(p == -1)return -1;
  
  if(state == 1 && _fs[p].feedback == 0)
  {
    /*
    servo360 fbtemp = _fs[p];
    _fs[p].pinCtrl = -1;
    _fs[p].pinFb = -1;
    servo360_connect(fbtemp.pinCtrl, fbtemp.pinFb);
    _fs[p].unitsRev = _fs[p].unitsRev;
    _fs[p].KpV = fbtemp.KpV;
    _fs[p].KiV = fbtemp.KiV;
    _fs[p].KdV = fbtemp.KdV;
    _fs[p].Kp = fbtemp.Kp;
    _fs[p].Ki = fbtemp.Ki;
    _fs[p].Kd = fbtemp.Kd;
    _fs[p].iMax = fbtemp.iMax;
    _fs[p].iMin = fbtemp.iMin;
    _fs[p].iMaxV = fbtemp.iMaxV;
    _fs[p].iMinV = fbtemp.iMinV;
    _fs[p].speedLimit = fbtemp.speedLimit;
    _fs[p].rampStep = fbtemp.rampStep;
    //_fs[p].csop = 0;
    */
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
  
      _fs[p].angleCalc = _fs[p].angle;
      //_fs[p].angleCalcP = _fs[p].angleCalc;
    }  
    {
      _fs[p].er = 0;
      _fs[p].integral = 0;
      _fs[p].derivative = 0;
      _fs[p].p = 0;
      _fs[p].i = 0;
      _fs[p].d = 0;
      _fs[p].op = 0;
      _fs[p].erP = 0;
      _fs[p].pw = 0;
    }    
      
    //

    //
    servo360_setPositiveDirection(p, S360_CCW_POS);

    _fs[p].theta = servo360_getTheta(p);  
    _fs[p].thetaP = _fs[p].theta;
    _fs[p].angleFixed = _fs[p].theta; 
  
    _fs[p].pvOffset = _fs[p].angleFixed;
    
    _fs[p].angle = (_fs[p].angleSign) * (_fs[p].angleFixed - _fs[p].pvOffset);
    _fs[p].angleCalc = _fs[p].angle;
    _fs[p].angleP = _fs[p].angle;
    _fs[p].feedback = state;
    //
  }
  else
  {
    //while(lockset(_fb360c.lock360));
    _fs[p].feedback = state;
    
    #ifdef _servo360_monitor_
      _fs[p].csop = S360_MONITOR;
    #endif
    
    //while(lockset(_fb360c.lock360));
  }    
        

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
