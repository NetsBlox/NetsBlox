/**
 * @file adcACpropab.c
 *
 * @author Andy Lindsay
 *
 * @copyright
 * Copyright (C) Parallax, Inc. 2013. All Rights MIT Licensed.
 *
 * @brief Launch ADC124S021 process into cogc cog.
 * @n @n <b><i>CONSTRUCTION ZONE:</i></b> This library is preliminary, major revisions
 * pending, not for release.
 */

#include "simpletools.h"
#include "adcACpropab.h"

static int cog = 0;
static AdcBox_st adcbox;

int adc_start(int doPin, int diPin, int clkPin, int csPin, int pattern, int* arrayAddr)
{
  adcbox.mailbox.addr = arrayAddr;
  adcbox.mailbox.dout = doPin;
  adcbox.mailbox.din = diPin;
  adcbox.mailbox.clk = clkPin;
  adcbox.mailbox.cs = csPin;
  adcbox.mailbox.mask = pattern;
  int i;
  for(i = 0; i < 4; i++)
  {
    *(arrayAddr+i) = -1;
  }
  for(i = 0; i < 4; i++)
  {
    if((pattern>>i)&1) break;
  }
  adcbox.mailbox.stidx = i;

  extern const unsigned int *adcACpropab_code;
  cog = cognew(adcACpropab_code, &adcbox.mailbox) + 1;

  int temp;
  while(1)
  {
    if(*(arrayAddr+i) != -1) return cog;
    input(adcbox.mailbox.dout);
  }
}

void adc_stop(void)
{
  if(cog)
  {
    cogstop(cog - 1);
    cog = 0;
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
