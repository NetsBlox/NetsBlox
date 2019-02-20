/*
 * @file count.c
 *
 * @author Andy Lindsay
 *
 * @version 0.85
 *
 * @copyright Copyright (C) Parallax, Inc. 2012.  See end of file for
 * terms of use (MIT License).
 *
 * @brief count function source, see simpletools.h for documentation.
 *
 * @detail Please submit bug reports, suggestions, and improvements to
 * this code to editor@parallax.com.
 */

#include "simpletools.h"                      // simpletools function prototypes

long count(int pin, long duration)            // count function definition
{
  /*
  if(!st_pauseTicks)                             // If global dt not initialized
  {
    //set_io_dt(CLKFREQ/1000000);             // Initialize dt
    if(st_pauseTicks == 0) set_pause_dt(CLKFREQ/1000);
    set_io_timeout(CLKFREQ/4);                // Initialize timeout
  }
  */
  int state = 1;                              // Initialize state to 1
  long transitions;                           // Declare transitions var
  int ctr = (10 << 26) + pin;                 // Positive edge ctr config
  long tf = duration * st_pauseTicks;            // Set timeout
  int t = CNT;                                // Mark current time
  // Wait until pin matches state or timeout.
  while((input(pin) == state) && (CNT - t < tf));
  if(CTRA == 0)                               // If counter A unused
  {
    CTRA = ctr;                               // Start counter module
    FRQA = 1;                                 // Increment PHSA by 1 per edge
    t = CNT;                                  // Reset current time
    PHSA = 0;                                 // Clear phase accumulator
    while(CNT - t < tf);                      // Wait for timeout
    CTRA = 0;                                 // Stop the counter
    transitions = PHSA;                       // Record pos edge crossings
  }
  else if(CTRB == 0)                          // If CTRA in use, use CTRB
  {
    CTRB = ctr;                               // Equivalent to CTRA block
    FRQB = 1;
    t = CNT;
    PHSB = 0;
    while(CNT - t < tf);
    CTRB = 0;
    transitions = PHSB;
  }
  else                                        // If both counters in use
  {
    transitions = -1;                         // Return -1.
  }
  return transitions;                         // Return transitions
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
