/*
 * @file rcTime.c
 *
 * @author Andy Lindsay
 *
 * @version 0.85
 *
 * @copyright Copyright (C) Parallax, Inc. 2012.  See end of file for
 * terms of use (MIT License).
 *
 * @brief rcTime function source, see simpletools.h for documentation.
 *
 * @detail Please submit bug reports, suggestions, and improvements to
 * this code to editor@parallax.com.
 */

#include "simpletools.h"                      // simpletools function prototypes

long rc_time(int pin, int state)              // rcTime function definition
{
  /*
  if(st_iodt == 0)                               // If dt not initialized
  {
    set_io_dt(CLKFREQ/1000000);               // Set up timed I/O time increment
    set_io_timeout(CLKFREQ/4);                // Set up timeout
  }
  */
  long tDecay;                                // Declare tDecay variable
  int ctr = ((8 + ((!state & 1) * 4)) << 26); // POS detector counter setup
  ctr += pin;                                 // Add pin to setup
  long tf = st_timeout;                        // Set up timeout
  long t = CNT;                               // Mark current time
  if(CTRA == 0)                               // If CTRA unused
  {
    CTRA = ctr;                               // Configure CTRA
    FRQA = 1;                                 // FRQA increments PHSA by 1
    input(pin);                               // Set I/O pin to input
    PHSA = 0;                                 // Clear PHSA
    // Wait for decay or timeout
    while((input(pin) == state) && (CNT - t <= tf));
    CTRA = 0;                                 // Stop the counter module
    tDecay = PHSA/st_iodt;                       // Copy result to tDecay
  }
  else if(CTRB == 0)                          // If CTRA used, try CTRB
  {
    CTRB = ctr;                               // Same procedure as for CTRA
    FRQB = 1;
    input(pin); 
    PHSB = 0;
    while((input(pin) == state) && (CNT - t <= tf));
    CTRB = 0;
    tDecay = PHSB/st_iodt;
  }
  else                                        // If CTRA & CTRB in use
  {
    tDecay = -1;                              // Return -1
  }
  return tDecay;                              // Return measurement
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
