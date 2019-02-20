/**
* @file mstimer.c
*
* @author Andy Lindsay
*
* @copyright
* Copyright (C) Parallax, Inc. 2013. All Rights MIT Licensed.
*
* @brief Code for tracking milliseconds elapsed in another cog.  This is part of
* a tutorial on adding a Simple Library to the project.
*/

#include "simpletools.h"                      // Include simpletools
#include "mstimer.h"

static volatile int t, dt, cog;               // Global var for cogs to share
static unsigned int stack[40 + 25];           // Stack vars for other cog

void ms_timer(void *par);                 

int mstime_start()
{
  mstime_stop();
  cog = 1 + cogstart(ms_timer, NULL, stack, sizeof(stack));
}

void mstime_stop()
{
  if(cog)
  {
    cogstop(cog -1);
    cog = 0;
  }    
}

int mstime_get()
{
  return t;
}

void mstime_reset()
{
  t = 0;
}

void mstime_set(int newTime)
{
  t = newTime;
}

// Function runs in another cog
void ms_timer(void *par)                      
{
  dt = CLKFREQ/1000;
  int ticks = CNT;
  while(1)                                   
  {
    waitcnt(ticks+=dt);                              
    t++;                                     
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
