/*
 * @file abvolts.c
 *
 * @author Andy Lindsay
 *
 * @copyright
 * Copyright (C) Parallax, Inc. 2013. All Rights MIT Licensed.
 *
 * @brief Initialize ADC124S021 and measure voltage as a raw, 12-bit5 adc value.
 * @n @n <b><i>CONSTRUCTION ZONE:</i></b> This library is preliminary, revisions 
 * pending.
 */

#include "simpletools.h"
#include "abvolts.h"

static int cs = 21, scl= 20, dout = 19, din = 18;

int adc124S021dc(int channel);

void ad_init(int csPin, int sclPin, int doPin, int diPin)
{
  cs = csPin;  
  scl = sclPin;
  dout = doPin;
  din = diPin;
}

int ad_in(int channel)
{
  adc124S021dc(channel);
  int val = adc124S021dc(channel);
  return val;
}

int adc124S021dc(int channel)
{
  channel = (channel & 3) << 12;
  high(cs);
  high(scl);
  low(din);
  input(dout);
  low(cs);
  int val = 0;
  for(int i = 15; i >= 0; i--)
  {
    val = val << 1;
    low(scl);
    high(scl);
    set_output(din, (channel >> i) & 1);
    val = val + (get_state(dout) & 1);
  }
  high(cs);
  return val;
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
