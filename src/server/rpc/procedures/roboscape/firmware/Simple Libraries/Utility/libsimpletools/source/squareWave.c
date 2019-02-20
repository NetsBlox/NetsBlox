/*
 * @file squareWave.c
 *
 * @author Andy Lindsay
 *
 * @version 0.85
 *
 * @copyright Copyright (C) Parallax, Inc. 2012.  See end of file for
 * terms of use (MIT License).
 *
 * @brief squareWave function source, see simpletools.h for documentation.
 *
 * @detail Please submit bug reports, suggestions, and improvements to
 * this code to editor@parallax.com.
 */

#include "simpletools.h"

// Counter module values
#ifndef CTR_NCO
#define CTR_NCO (0b100 << 26);
#endif
#ifndef CTR_PLL
#define CTR_PLL (0b10 << 26);
#endif

static unsigned int stack[44 + 20];       

static volatile unsigned int cog = 0;
static volatile int ctra, ctrb, frqa, frqb;

void square_wave_cog(void *par);
void square_wave_setup(int pin, int freq, int* ctr, int* frq);
int int_fraction(int a, int b, int shift);

//char s[40];

void square_wave(int pin, int channel, int freq)
{
  if(!cog)     cog = cogstart(square_wave_cog, NULL,
                   stack, sizeof(stack)) + 1;

  int ctr, frq;
  square_wave_setup(pin, freq, &ctr, &frq);
  if(!channel)
  {
    ctra = ctr;
    frqa = frq;
    if(pin < 0)
    {
      pin = -pin;
      ctra = 0;
      frqa = 0;
    }
  }
  else 
  {
    ctrb = ctr;
    frqb = frq;
    if(pin < 0)
    {
      pin = -pin;
      ctrb = 0;
      frqb = 0;
    }
    //print("ctrb = %s\n", itoa(ctrb, s, 2));
    //print("frqb = %s\n", itoa(frqb, s, 2));
  }  
}


void square_wave_stop(void)
{
  if(cog)
  {
    cogstop(cog - 1);
    cog = 0;
    ctra = 0;
    ctrb = 0;
    frqa = 0;
    frqb = 0;
  }  
}


void square_wave_cog(void *par)
{
  int pin;
  while(1)
  {
    if(ctra != CTRA)
    {
      if((CTRA & 0b111111) != (ctra & 0b111111))
      {
        pin = CTRA & 0b111111;
        DIRA &= ~(1 << pin);
      }

      CTRA = ctra;
      FRQA = frqa;    

      if(ctra != 0)
      {
        pin = CTRA & 0b111111;  
        DIRA |= (1 << pin);
      }  
    }

    if(FRQA != frqa)
      FRQA = frqa;
    
    if(ctrb != CTRB)
    {
      if((CTRB & 0b111111) != (ctrb & 0b111111))
      {
        pin = CTRB & 0b111111;
        DIRA &= ~(1 << pin);
      }

      CTRB = ctrb;
      FRQB = frqb;              

      if(ctrb != 0)
      {
        pin = CTRB & 0b111111;  
        DIRA |= (1 << pin);
      }  
    }
    if(FRQB != frqb)
      FRQB = frqb;
  }
}

void square_wave_setup(int pin, int freq, int* _ctr, int* _frq)
{
  int ctr;
  int frq;
  int s;
  int d;
  if(freq < 500000)
  {
    ctr = CTR_NCO;
    s = 1;
    d = 0;
  }
  else
  {
    ctr = CTR_PLL;
    d = (freq - 1) / 1000000;
    int i;
    for(i = 32; i>0; i--)
    {
      if(d < 0) break;
      d <<= 1;
    }
    d = i;
    s = 4 - d;
    ctr += (d << 23);
  }
  frq = int_fraction(freq, CLKFREQ, s);
  ctr += pin;
  *_ctr = ctr;
  *_frq = frq;
}


int int_fraction(int a, int b, int shift)
{
  if (shift > 0)
  {
    a <<= shift;
  }
  if(shift < 0)
  {
    b <<= -shift;
  }
  int f = 0;
  int i;
  for(i = 0; i < 32; i++)
  {
    f <<= 1;
    if(a >= b)
    {
      a -= b;
      f++;
    }
    a <<= 1;
  }
  return f;
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
