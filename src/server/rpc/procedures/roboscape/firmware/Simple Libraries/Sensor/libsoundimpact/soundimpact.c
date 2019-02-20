/*
  soundimpact.c

  Source for sound impact library.

  By Andy Lindsay, Parallax Inc., 3/11/14.

  Copyright (C) Parallax, Inc. 2014. All Rights MIT Licensed.
*/

#include "soundimpact.h"

void soundImpact();

static volatile int reps = 0; 
static volatile int repsOld = 0;
static volatile int pinSountImpact;

int *soundImpact_run(int pin)
{
  int *cog = cog_run(soundImpact, 20);
  pinSountImpact = pin;
  return cog;
}

void soundImpact_end(int *processID)
{
  cog_end(processID);
}

int soundImpact_getCount(void)
{
  reps -= repsOld;
  repsOld = reps;
  return reps;
}

void soundImpact()
{
  int state = input(pinSountImpact);
  int stateOld = state;

  while(1)
  {
    state = input(pinSountImpact);
    if(state != stateOld)
    {
      if(state == 1)
      {
        reps++;
      }
    }
    stateOld = state;
  }
}

/**
 * TERMS OF USE: MIT License
 *
 * Permission is hereby granted, free of charge, to any person obtaining a
 * copy of this software and associated documentation files (the "Software"),
 *  to deal in the Software without restriction, including without limitation
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
