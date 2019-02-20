/*
 * @file pulseIn.c
 *
 * @author Andy Lindsay
 *
 * @version 0.85
 *
 * @copyright Copyright (C) Parallax, Inc. 2012.  See end of file for
 * terms of use (MIT License).
 *
 * @brief pulseIn function source, see simpletools.h for documentation.
 *
 * @detail Please submit bug reports, suggestions, and improvements to
 * this code to editor@parallax.com.
 */

#include "simpletools.h"                      // simpletools function prototypes

long pulse_in(int pin, int state)              // pulseIn function definition
{
  /*
  if(st_iodt == 0)
  {
    set_io_dt(CLKFREQ/1000000);
    set_io_timeout(CLKFREQ/4);
  }
  */
  long tPulse;
  int ctr = ((8 + ((!state & 1) * 4)) << 26) + pin;
  input(pin);
  long tf = st_timeout;
  long t = CNT;
  while((get_state(pin) == state) && (CNT - t < tf));
  if(CTRA == 0)
  {
    CTRA = ctr;
    FRQA = 1;
    PHSA = 0;
    while((PHSA == 0) && (CNT - t < tf));
    while((get_state(pin) == state) && (CNT - t < tf));
    CTRA = 0;
    tPulse = PHSA/st_iodt;
  }
  else if(CTRB == 0)
  {
    CTRB = ctr;
    FRQB = 1;
    PHSB = 0;
    while((PHSB == 0) && (CNT - t < tf));
    while((get_state(pin) == state) && (CNT - t < tf));
    CTRB = 0;
    tPulse = PHSB/st_iodt;
  }
  else
  {
    tPulse = -1;
  }
  return tPulse;
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
