/*
  @file servo360.c

  @author Parallax Inc

  @copyright
  Copyright (C) Parallax Inc. 2017. All Rights MIT Licensed.  See end of file.
 
  @brief 
*/


#include "simpletools.h"  
#include "servo360.h"
//#include "patch.h"

#define couple_servos


servo360_cog_t _fb360c;
servo360_t _fs[S360_DEVS_MAX];

/*
__attribute__((constructor))
void servo360_patch(void)
{
  ping_cm(26);
}
*/

void servo360_run(void)
{
  //ping_cm(26);
  //patch360forBlockly();
  _fb360c.servoCog = cog_run(servo360_mainLoop, 512); 
  _fb360c.cntPrev = CNT;
  pause(500);
}

  
void servo360_end(void)
{
  lockret(_fb360c.lock360);
  cog_end(_fb360c.servoCog);
} 


void servo360_setup(void)
{
  for(int p = 0; p < S360_DEVS_MAX; p++)
  {
    _fs[p].pinCtrl = -1;
    _fs[p].pinFb = -1;
  } 
  
  _fb360c.devCount = 0;   
  
  _fb360c.lock360 = locknew();
  lockclr(_fb360c.lock360);
  
  _fb360c.dt360 = CLKFREQ / S360_FREQ_CTRL_SIG;  // 20 ms
  _fb360c.t360  = CNT;
  _fb360c.dt360a[0] = 16 * (CLKFREQ / 1000);      // 16 ms
  _fb360c.dt360a[1] = 18 * (CLKFREQ / 1000);      // 18 ms
}


void servo360_mainLoop()
{
  servo360_setup();
  
  while(1)
  {
    _fb360c.pulseCount++;

    //while((CNT - _fb360c.t360) < _fb360c.dt360);
    //while((CNT - _fb360c.t360) < _fb360c.dt360);

    for(int p = 0; p < S360_DEVS_MAX; p++)
    {
      if(_fs[p].pinCtrl != -1 && _fs[p].pinFb != -1)
      {
        //if(_fs[p].feedback)
        //{
          servo360_checkAngle(p);
        //}          
      }        
    }
    
    while(lockset(_fb360c.lock360));
    for(int p = 0; p < S360_DEVS_MAX; p++)
    {
      if(_fs[p].pinCtrl != -1 && _fs[p].pinFb != -1)
      {
        if(_fs[p].feedback)
        {
          if(_fs[p].dc != -1)
            servo360_outputSelector(p);
        }          
      }        
    }

    #ifdef couple_servos

    for(int p = 0; p < S360_DEVS_MAX; p++)
    {
      if((_fs[p].couple != -1) && (_fs[p].feedback))
      {
        if(_fs[p].speedTarget > 0) _fs[p].stepDir = 1;
        else if(_fs[p].speedTarget < 0) _fs[p].stepDir = -1;
        else  _fs[p].stepDir = 0;
    
        _fs[p].lag = _fs[p].stepDir * _fs[p].angleError;
      
        if(_fs[_fs[p].couple].speedTarget > 0) _fs[_fs[p].couple].stepDir = 1;
        else if(_fs[_fs[p].couple].speedTarget < 0) _fs[_fs[p].couple].stepDir = -1;
        else  _fs[_fs[p].couple].stepDir = 0;
    
        _fs[_fs[p].couple].lag = _fs[_fs[p].couple].stepDir * _fs[_fs[p].couple].angleError;
    
        if(_fs[_fs[p].couple].lag > _fs[p].lag)
        {
          int compensate = _fs[_fs[p].couple].lag - _fs[p].lag;
          compensate = _fs[p].coupleScale * compensate / S360_SCALE_DEN_COUPLE;
          //if(_fs[p].accelerating || _fs[_fs[p].couple].accelerating) 
          //  compensate *= 4;
          if(compensate > 500) compensate = 500;  
          // Limits pulse deviation to 50 us
    
          if(_fs[p].speedOut > 0) _fs[p].speedOut -= compensate;
          if(_fs[p].speedOut < 0) _fs[p].speedOut += compensate;
        }
        else if(_fs[p].lag > _fs[_fs[p].couple].lag)
        {
          int compensate = _fs[p].lag - _fs[_fs[p].couple].lag;
          compensate = _fs[p].coupleScale * compensate / S360_SCALE_DEN_COUPLE;
          //if(_fs[p].accelerating || _fs[_fs[p].couple].accelerating) 
          //  compensate *= 4;
          if(compensate > 500) compensate = 500;           
      
          if(_fs[_fs[p].couple].speedOut > 0) _fs[_fs[p].couple].speedOut -= compensate;
          if(_fs[_fs[p].couple].speedOut < 0) _fs[_fs[p].couple].speedOut += compensate;
        }
      }        
    }

    #endif
    
    lockclr(_fb360c.lock360);
    
    int target[2];
    target[0] = _fb360c.t360 + _fb360c.dt360a[0];
    target[1] = _fb360c.t360 + _fb360c.dt360a[1];

    for(int p = 0; p < S360_DEVS_MAX; p++)
    {
      if(p % 2 == 1)
      {
        //while((CNT - _fb360c.t360) <  dt360a[p/2]);
        waitcnt(target[p/2]);
        servo360_servoPulse(p - 1, p);
      }        
    }      

    _fb360c.t360 += _fb360c.dt360;
  }    
}  


void servo360_servoPulse(int p, int q)
{
  int pinA = _fs[p].pinCtrl;
  int pinB = _fs[q].pinCtrl;
  

  if(pinA != -1 && _fs[p].dc != -1 && _fs[p].enable)
  {
    if(_fs[p].speedOut > S360_PWMAX) _fs[p].speedOut = S360_PWMAX; 
    if(_fs[p].speedOut < S360_PWMIN) _fs[p].speedOut = S360_PWMIN; 

    low(pinA);
    PHSA = 0;
    FRQA = 0;
    CTRA = (4 << 26) | pinA;
    FRQA = 1;
    PHSA = -(15000 + _fs[p].speedOut) * (CLKFREQ/10000000);
  }   

  if(pinB != -1 && _fs[q].dc != -1 && _fs[q].enable)
  {
    if(_fs[q].speedOut > S360_PWMAX) _fs[q].speedOut = S360_PWMAX; 
    if(_fs[q].speedOut < S360_PWMIN) _fs[q].speedOut = S360_PWMIN; 

    low(pinB);
    PHSB = 0;
    FRQB = 0;
    CTRB = (4 << 26) | pinB;
    FRQB = 1;
    PHSB = -(15000 + _fs[q].speedOut) * (CLKFREQ/10000000);
  }    

  if(pinA != -1 && _fs[p].dc != -1)
  {
    while(get_state(pinA));
    CTRA = 0;
    PHSA = 0;
    FRQA = 0;
  }    
  
  if(pinB != -1 && _fs[q].dc != -1)
  {
    while(get_state(pinB));
    CTRB = 0;
    PHSB = 0;
    FRQB = 0;
  }    
}   
//


void servo360_waitServoCtrllEdgeNeg(int p)
{
  int mask = 1 << _fs[p].pinCtrl;
  if(!(INA & mask))
  { 
    while(!(INA & mask));
  }
  while(INA & mask);
}      


void servo360_checkAngle(int p)
{
  _fs[p].thetaP = _fs[p].theta;
  _fs[p].angleFixedP = _fs[p].angleFixed;
  _fs[p].angleP = _fs[p].angle;  
  _fs[p].dcp = _fs[p].dc;
  
  _fs[p].theta = servo360_getTheta(p);  
  
  _fs[p].turns += servo360_crossing(_fs[p].theta, _fs[p].thetaP, S360_UNITS_ENCODER);

  if(_fs[p].turns >= 0)
  {
    _fs[p].angleFixed = (_fs[p].turns * S360_UNITS_ENCODER) + _fs[p].theta;
  }      
  else if(_fs[p].turns < 0)
  {
    _fs[p].angleFixed = (S360_UNITS_ENCODER * (_fs[p].turns + 1)) + (_fs[p].theta - S360_UNITS_ENCODER);
  }

  _fs[p].angle = _fs[p].angleFixed - _fs[p].pvOffset;
}  
 

void servo360_outputSelector(int p)
{
  if(_fs[p].csop == S360_POSITION)
  {
    int output = servo360_pidA(p);
    _fs[p].pw = servo360_upsToPulseFromTransferFunction(output, p);
    _fs[p].speedOut = _fs[p].pw - 15000;
  }
  else if(_fs[p].csop == S360_SPEED)
  {
    servo360_speedControl(p);
    _fs[p].speedOut = _fs[p].opPidV;
  }   
  else if(_fs[p].csop == S360_GOTO)
  {
    _fs[p].ticksDiff = _fs[p].angleTarget - _fs[p].angle;
    
    // Use v^2 / 2a to figure out when to slow down
    _fs[p].ticksGuard = ( _fs[p].speedReq * abs(_fs[p].speedReq) ) / (100 * _fs[p].rampStep);
    // Add a certain number of pulses worth of padding to the slowdown
    // estimate
    _fs[p].ticksGuard += (S360_LATENCY  * _fs[p].speedReq / 50);
    
    //ticksGuard = ticksGuard * S360_UNITS_ENCODER / unitsRev;
    if((_fs[p].ticksDiff < 0) && (_fs[p].ticksDiff < _fs[p].ticksGuard) && (_fs[p].approachFlag == 0))
    {
      _fs[p].speedReq = -_fs[p].speedLimit;
      //servo360_speedControl(p);
      //_fs[p].speedOut = _fs[p].opPidV;
      _fs[p].approachFlag = 0;
    }
    else if((_fs[p].ticksDiff > 0) && (_fs[p].ticksDiff > _fs[p].ticksGuard) && (_fs[p].approachFlag == 0))
    {
      _fs[p].speedReq = _fs[p].speedLimit;
      //servo360_speedControl(p);
      //_fs[p].speedOut = _fs[p].opPidV;
      _fs[p].approachFlag = 0;
    }
    else if((_fs[p].ticksDiff > 0) && (_fs[p].ticksDiff <= _fs[p].ticksGuard) && (_fs[p].approachFlag == 0))
    {
      //speedReq -= rampStep;
      _fs[p].speedReq = 0;
      _fs[p].approachFlag = 1;
      //servo360_speedControl(p);
      //_fs[p].speedOut = _fs[p].opPidV;
    }    
    else if((_fs[p].ticksDiff < 0) && (_fs[p].ticksDiff >= _fs[p].ticksGuard) && (_fs[p].approachFlag == 0))
    {
      //speedReq += rampStep;
      _fs[p].speedReq = 0;
      _fs[p].approachFlag = 1;
      //servo360_speedControl(p);
      //_fs[p].speedOut = _fs[p].opPidV;
    } 
    else
    {
      //servo360_speedControl(p);
      //_fs[p].speedOut = _fs[p].opPidV;
    }       
    
    servo360_speedControl(p);
    _fs[p].speedOut = _fs[p].opPidV;
    
    //
    if
    ( 
      (abs(_fs[p].ticksDiff) < (_fs[p].rampStep / (_fs[p].unitsRev * 50))) 
      || (_fs[p].approachFlag == 1 && _fs[p].speedMeasured == 0)
    )
    {
      _fs[p].speedReq = 0;
      _fs[p].speedTarget = 0;
      _fs[p].sp = _fs[p].angleTarget;
      _fs[p].csop = S360_POSITION;
      _fs[p].approachFlag = 0;
      //return;
    } 
    //     
  }
  else if(_fs[p].csop == S360_MONITOR)
  {
    
  } 
}


int servo360_dutyCycle(int p, int scale)
{
  int t = CNT;
  int dt = 3 * (CLKFREQ/1000);
  
  int pin = _fs[p].pinFb;
  CTRA = (1000 << 26) | pin;
  CTRB = (1100 << 26) | pin;
  FRQA = 1;
  FRQB = 1;
  
  int mask = 1 << pin;
  int phsa, phsb;
  
  while(INA & mask) if(CNT - t > dt) break;
  PHSA = 0;
  while(!(INA & mask)) if(CNT - t > dt) break;
  PHSB = 0;
  while(INA & mask) if(CNT - t > dt) break;
  phsa = PHSA;
  while(!(INA & mask)) if(CNT - t > dt) break;
  phsb = PHSB;
  
  CTRA = 0;
  CTRB = 0;

  int dc = (phsa * scale) / (phsa + phsb);
  
  if(CNT - t > dt)
  {
    return -1;
  }
  else
  {    
    return dc;
  }    
}  


int servo360_getTheta(int p)
{
  _fs[p].dc = servo360_dutyCycle(p, S360_M); 
  
  if(_fs[p].angleSign == S360_CCW_POS)
  {
    _fs[p].theta = (S360_ENC_RES - 1) - (_fs[p].dc + S360_B);
  }
  else if(_fs[p].angleSign == S360_CCW_NEG)
  {    
    _fs[p].theta = _fs[p].dc + S360_B;
  }  

  _fs[p].theta &= 0xFFF;
  return _fs[p].theta;
}  


int servo360_crossing(int current, int previous, int units)
{
  int angleLow = units/3;
  int angleHigh = angleLow * 2;
  if(previous > angleHigh && current < angleLow)
  {
    return 1;
  }    
  else if(previous < angleLow && current > angleHigh)
  {
    return -1;
  }    
  else
  {
    return 0;
  }    
}      


void servo360_setPositiveDirection(int p, int direction)
{
  _fs[p].angleSign = direction;
}  


// Angular PID control
int servo360_pidA(int p)
{
  // Clear any speed control system corrections so that return to speed control
  // doesn't start with unexpected compensation.
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

    //180516 _fs[p].angleCalc = _fs[p].angle;
    //_fs[p].angleCalcP = _fs[p].angleCalc;
  }    
  
  // Angle error
  _fs[p].er = _fs[p].sp - _fs[p].angle;
  // Integral accumuliation
  _fs[p].integral += _fs[p].er;
  // Derivative difference
  _fs[p].derivative = _fs[p].er - _fs[p].erP;
  
  // Clamp itegral level
  if(_fs[p].integral > _fs[p].iMax) _fs[p].integral = _fs[p].iMax;
  if(_fs[p].integral < _fs[p].iMin) _fs[p].integral = _fs[p].iMin;

  // Calculate influences of P, I, and D.
  _fs[p].p = (_fs[p].Kp * _fs[p].er) / S360_SCALE_DEN_A;
  _fs[p].i = (_fs[p].Ki * _fs[p].integral) / S360_SCALE_DEN_A;
  _fs[p].d = (_fs[p].Kd * _fs[p].derivative) / S360_SCALE_DEN_A;
  
  // Output = sum(P, I, and D)
  _fs[p].op = (_fs[p].p + _fs[p].i + _fs[p].d);
  
  // Limit output proportional to speed limit???  This may have been intended
  // to be proportional to the current target speed.
  //int opMax = _fs[p].speedLimit / 4;
  //int opMax = _fs[p].speedLimit;
  
  if(_fs[p].op > _fs[p].opMax) _fs[p].op = _fs[p].opMax;
  if(_fs[p].op < -_fs[p].opMax) _fs[p].op = -_fs[p].opMax;
  
  _fs[p].erP = _fs[p].er;
  return _fs[p].op;
}
  
  
// Velocity PID control
// Calculated distance marches forward based on speed.  The control system 
// calculates position error at 50 Hz by subtracting actual position from 
// calcualted position.  This is the error that is the basis for the 
// P, I, and D calculations.   
int servo360_pidV(int p)  
{
  //while(lockset(_fb360c.lock360));

  //int opv;  
  int opMax = _fs[p].speedLimit;

  _fs[p].speedMeasured = (_fs[p].angle - _fs[p].angleP) * 50; 
  
  if(abs(_fs[p].angleError) < S360_UNITS_ENCODER/2)
  {



    //
    _fs[p].angleDeltaCalc = _fs[p].speedTarget / S360_CS_HZ;
    _fs[p].angleCalc += _fs[p].angleDeltaCalc;
    //



    /*
    // This could remedy the overshoot problem, but it seems to reduce
    // drive_goto accuracy.
    if(_fs[p].speedTarget == _fs[p].speedTargetP)
    {
      _fs[p].offset--;
      if(_fs[p].offset < 0) _fs[p].offset = 0;
    }
    else
    {
      _fs[p].offset++;
      if(_fs[p].offset > FB360_OFFSET_MAX) _fs[p].offset = FB360_OFFSET_MAX;
    }

    int idx = _fb360c.pulseCount % FB360_V_ARRAY;
    _fs[p].vT[idx] = _fs[p].speedTarget;

    idx -= _fs[p].offset;
    if(idx < 0) idx += FB360_V_ARRAY;
    
    _fs[p].speedTargetTemp = _fs[p].vT[_fs[p].offset];    

    _fs[p].angleDeltaCalc = _fs[p].speedTargetTemp / S360_CS_HZ;
    _fs[p].angleCalc += _fs[p].angleDeltaCalc;
    */ 



  }

  _fs[p].angleError = _fs[p].angleCalc - _fs[p].angle;

  if(abs(_fs[p].angleError) < S360_UNITS_ENCODER/2)
  {
    _fs[p].erDist = _fs[p].angleError;
    _fs[p].integralV += _fs[p].erDist;
    _fs[p].derivativeV = _fs[p].erDist - _fs[p].erDistP;
  }    
  
  if(_fs[p].integralV > _fs[p].iMaxV) _fs[p].integralV = _fs[p].iMaxV;
  if(_fs[p].integralV < _fs[p].iMinV) _fs[p].integralV = _fs[p].iMinV;

  _fs[p].pV = (_fs[p].KpV * _fs[p].erDist) / S360_SCALE_DEN_V;
  _fs[p].iV = (_fs[p].KiV * _fs[p].integralV) / S360_SCALE_DEN_V;
  _fs[p].dV = (_fs[p].KdV * _fs[p].derivativeV) / S360_SCALE_DEN_V;
  
  _fs[p].opV = _fs[p].pV + _fs[p].iV + _fs[p].dV;

  if(_fs[p].opV > opMax) _fs[p].opV = opMax;
  if(_fs[p].opV < -opMax) _fs[p].opV = -opMax;
  
  _fs[p].erDistP = _fs[p].erDist;
  
  //lockclr(_fb360c.lock360);  

  return _fs[p].opV;
}


// Select pulse width from graph of angular velocity vs. pulse width
// for the servo.  This is done once for each new speed.  After the pulse
// is delivered once, the control system adjusts upward or downward from
// that initial value.
/*
int servo360_upsToPulseFromTransferFunction(int unitsPerSec)
{
  int pw, b, mx;
  int ups = unitsPerSec/7;
  
  if(ups > 0)
  {
    mx = ups;
    b = S360_B_POS;
    pw = mx + b;
  }
  else if(ups < 0)
  {
    mx = ups;
    b = S360_B_NEG;
    pw = mx + b;
  }    
  else
  {
    pw = 15000;
  }
  return pw;    
}
*/

int servo360_upsToPulseFromTransferFunction(int unitsPerSec, int p)
{
  int y, m, x, b;
  x = unitsPerSec; 
  
  if(x > 0)
  {
    m = _fs[p].vmCcw;
    b = _fs[p].vbCcw;
  }    
  else if(x < 0)
  {
    m = _fs[p].vmCw;
    b = _fs[p].vbCw;
  }
  else
  {
     b = 0;
  }
  
  y = (m * x / 1000) + b;

  return y + 15000;    
}


void servo360_speedControl(int p)
{
  // If we switch back to position control, it doesn't
  // work well to have old settings error correction from
  // the last time position was controlled, so clear the
  // settings.
  {
    _fs[p].er = 0;
    _fs[p].integral = 0;
    _fs[p].derivative = 0;
    _fs[p].p = 0;
    _fs[p].i = 0;
    _fs[p].d = 0;
    _fs[p].op = 0;
    _fs[p].erP = 0;
    //_fs[p].pw = 0;
  }    

  // Acceleration control by taking steps in target speed 
  // toward requested speed
  if(_fs[p].speedTarget != _fs[p].speedReq)
  {
    int speedDifference = _fs[p].speedReq - _fs[p].speedTarget;
    if(abs(_fs[p].angleError) < S360_UNITS_ENCODER/2)
    {
      if( abs(speedDifference) > _fs[p].rampStep)
      {
        _fs[p].accelerating = 1;
        if(speedDifference > 0)
        {
          _fs[p].speedTarget += _fs[p].rampStep;
        }
        else if(speedDifference < 0)
        {
          _fs[p].speedTarget -= _fs[p].rampStep;
        }        
      }
      else
      {
        _fs[p].accelerating = 0;
        _fs[p].speedTarget = _fs[p].speedReq;
        //speedUpdateFlag = 0;
      }
    }      
    _fs[p].pw = servo360_upsToPulseFromTransferFunction(_fs[p].speedTarget, p);
    _fs[p].drive = _fs[p].pw - 15000;
    _fs[p].opPidV = _fs[p].drive + servo360_pidV(p);
  }
  else    
  {
    _fs[p].opPidV = _fs[p].drive + servo360_pidV(p);
  }
  _fs[p].speedTargetP = _fs[p].speedTarget;
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
