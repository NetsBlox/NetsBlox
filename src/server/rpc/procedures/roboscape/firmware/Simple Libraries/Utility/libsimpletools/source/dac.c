/*
 * @file dac.c
 *
 * @author Andy Lindsay
 *
 * @version 0.86
 *
 * @copyright Copyright (C) Parallax, Inc. 2012.  See end of file for
 * terms of use (MIT License).
 *
 * @brief dac function source, see simpletools.h for documentation.
 *
 * @detail Please submit bug reports, suggestions, and improvements to
 * this code to editor@parallax.com.
 */

#include "simpletools.h"

void dac_ctr_cog(void *par);

#ifndef DUTY_SE
#define DUTY_SE (0b110 << 26)
#endif

static unsigned int stack[44 + 16];       

static int dacCtrBits;
static unsigned int cog;
static volatile int ctra, ctrb, frqa, frqb;

void dac_ctr_res(int bits)
{
  dacCtrBits = bits;
}

void dac_ctr(int pin, int channel, int dacVal)
{
  if(dacCtrBits == 0) dacCtrBits = 8;
  int dacBitX = 32 - dacCtrBits;
  
  if(!cog) cog = cogstart(dac_ctr_cog, NULL,
                          stack, sizeof(stack)) + 1;
  if(!channel)
  {
    ctra = (DUTY_SE + pin);
    frqa = (dacVal << dacBitX);
  }
  else
  {
    ctrb = (DUTY_SE + pin);
    frqb = (dacVal << dacBitX);
  }  
}

void dac_ctr_cog(void *par)
{
  int pin;
  while(1)
  {
    if(ctra != CTRA)
    {
      if(CTRA != 0)
      {
        pin = CTRA & 0b111111;
        DIRA &= ~(1 << pin);
      }
      CTRA = ctra;

      if(ctra != 0)
      {
        pin = CTRA & 0b111111;  
        DIRA |= (1 << pin);
      }  
    }
    
    if(ctrb != CTRB)
    {
      if(CTRB != 0)
      {
        pin = CTRB & 0b111111;
        DIRA &= ~(1 << pin);
      }
      CTRB = ctrb;

      if(ctrb != 0)
      {
        pin = CTRB & 0b111111;  
        DIRA |= (1 << pin);
      }  
    }
    FRQA = frqa;    
    FRQB = frqb;              
  }
}

void dac_ctr_stop(void)
{
  if(cog) cogstop(cog - 1);
  cog = 0;
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
