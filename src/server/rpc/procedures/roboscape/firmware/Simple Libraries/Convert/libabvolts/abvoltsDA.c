#include "simpletools.h"
#include "abvolts.h"

void da_ctr_cog(void *par);

#ifndef DUTY_SE
#define DUTY_SE (0b110 << 26)
#endif

static unsigned int stack[(176 + (20*4)) / 4];       

int abvolts_daCtrBits;
static unsigned int cog;
static volatile int ctra, ctrb, frqa, frqb;
static int pinCh0 = 26, pinCh1 = 27;

void da_res(int bits)
{
  abvolts_daCtrBits = bits;
}


void da_init(int pinDA0, int pinDA1)
{
  pinCh0 = pinDA0;
  pinCh1 = pinDA1;
}


void da_out(int channel, int daVal)
{
  if(abvolts_daCtrBits == 0) abvolts_daCtrBits = 8;
  int daBitX = 32 - abvolts_daCtrBits;

  if(!cog)
  {
    cog = cogstart(da_ctr_cog, NULL,
                  stack, sizeof(stack)) + 1;
  }

  if(!channel)
  {
    ctra = (DUTY_SE + pinCh0);
    frqa = (daVal << daBitX);
  }
  else
  {
    ctrb = (DUTY_SE + pinCh1);
    frqb = (daVal << daBitX);
  }  
}

void da_ctr_cog(void *par)
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


void da_ctr_stop(void)
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

