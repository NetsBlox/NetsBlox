/*
 * @file pulseOut.c
 *
 * @author Andy Lindsay
 *
 * @version 0.85
 *
 * @copyright Copyright (C) Parallax, Inc. 2012.  See end of file for
 * terms of use (MIT License).
 *
 * @brief pulseOut function source, see simpletools.h for documentation.
 *
 * @detail Please submit bug reports, suggestions, and improvements to
 * this code to editor@parallax.com.
 */

#include "simpletools.h"                      // simpletools function prototypes

void pulse_out(int pin, int time)              // pulseOut function definition
{
  /*
  if(st_iodt == 0)
  {
    set_io_dt(CLKFREQ/1000000);
    set_io_timeout(CLKFREQ/4);
  }
  */
  signed long phsVal = -time * st_iodt;
  //int ctr = 0;
  int frq = 1;
  int phs = 0;
  int state = get_output(pin);
  if(state == 1)
  {
    phsVal = -phsVal;
    phs = -1;
    frq = -1;
  }
  if (CTRA == 0)
  {
    PHSA = phs;
    FRQA = frq;
    CTRA = pin;
    CTRA += (4 << 26);
    low(pin);
    PHSA = phsVal;
    while(get_state(pin) != state);
    set_output(pin, state);
    CTRA = 0;
  }
  else if (CTRB == 0)
  {
    PHSA = phs;
    FRQA = frq;
    CTRA = pin;
    CTRA += (4 << 26);
    low(pin);
    PHSA = phsVal;
    while(get_state(pin) != state);
    set_output(pin, state);
    CTRA = 0;
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
