/*
 * @file pwm.c
 *
 * @author Andy Lindsay
 *
 * @version 0.85
 *
 * @copyright Copyright (C) Parallax, Inc. 2012.  See end of file for
 * terms of use (MIT License).
 *
 * @brief pwm function source, see simpletools.h for documentation.
 *
 * @detail Please submit bug reports, suggestions, and improvements to
 * this code to editor@parallax.com.
 */

#include "simpletools.h"

#ifndef NCO_PWM_1
#define NCO_PWM_1 0b00100 << 26
#endif

void pw(void *par);
static unsigned int pwstack[(160 + (50 * 4)) / 4];

static volatile unsigned int tCycle, ticksA, ticksB, ctra, ctrb;
//static volatile int us;

static int pwcog = 0;

//static int ctraPin = -1;
//static int ctrbPin = -1;

int pwm_start(unsigned int cycleMicroseconds)
{
  //us = CLKFREQ/1000000;
  tCycle = cycleMicroseconds * st_usTicks;
  pwcog = cogstart(pw, NULL, pwstack, sizeof(pwstack)) + 1;  
  return pwcog;
}

void pwm_set(int pin, int channel, int tHigh)
{
  if(!channel)
  {
    ctra = NCO_PWM_1;
    ctra |= pin;
    ticksA = tHigh * st_usTicks;
  }
  else
  {
    ctrb = NCO_PWM_1;
    ctrb |= pin;
    ticksB = tHigh * st_usTicks;
  }
}

void pwm_stop(void)
{
  if(pwcog) cogstop(pwcog - 1);  
  pwcog = 0;
}

void pw(void *par)
{
  FRQA = 1;
  FRQB = 1;
  int pin;
  unsigned int dt = tCycle;
  unsigned int t = CNT;
  while(1)
  {
    waitcnt(t+=dt);
    if(ctra != CTRA)
    {
      if(ctra != 0)
      {
        pin = CTRA & 0b111111;
        DIRA &= ~(1 << pin);
      }
      CTRA = ctra;
      pin = CTRA & 0b111111;      
      DIRA |= (1 << pin);
    }
    if(ctrb != CTRB)
    {
      if(ctrb != 0)
      {
        pin = CTRB & 0b111111;
        DIRB &= ~(1 << pin);
      }
      CTRB = ctrb;
      pin = CTRB & 0b111111;      
      DIRA |= (1 << pin);
    }
    PHSA = -ticksA;    
    PHSB = -ticksB;    
  }
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
