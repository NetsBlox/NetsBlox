/*
  datetime.c

  Copyright (c) Parallax Inc 2015. All rights MIT licensed;
                see end of file.
*/  

#include "simpletools.h"
#include "datetime.h"

static volatile int dt_sec;
static volatile int dt_ticks;
static volatile int dt_cog = 0;
static volatile int dt_ets_sys;

static int stack[174+20];

void secondctr(void *par)
{
  dt_ets_sys = (int) par;
  dt_ticks = CNT;
  while(1)
  {
    dt_ticks += CLKFREQ;
    waitcnt(dt_ticks);
    dt_ets_sys++;
  }
}

datetime dt_get()
{
  int et = dt_ets_sys;
  datetime dt = dt_fromEt(et);
  return dt;
}  

void dt_set(datetime dt)
{
  dt_ets_sys = dt_toEt(dt);
}  

void dt_run(datetime dt)
{
  int et = dt_toEt(dt);
  dt_cog = 1 + cogstart(secondctr, (int*) et, stack, sizeof(stack));
}

void dt_end()
{
  if(dt_cog)
  {
    cogstop(dt_cog);
    dt_cog = 0;
  }
}

int dt_getms()
{
  int cnt = CNT;
  int t = dt_ticks - CLKFREQ;
  return (cnt - t) / (CLKFREQ / 1000);
}

/*
  TERMS OF USE: MIT License
 
  Permission is hereby granted, free of charge, to any person obtaining a
  copy of this software and associated documentation files (the "Software"),
   to deal in the Software without restriction, including without limitation
  the rights to use, copy, modify, merge, publish, distribute, sublicense,
  and/or sell copies of the Software, and to permit persons to whom the
  Software is furnished to do so, subject to the following conditions:
 
  The above copyright notice and this permission notice shall be included in
  all copies or substantial portions of the Software.
 
  THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
  IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
  FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL
  THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
  LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
  FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER
  DEALINGS IN THE SOFTWARE.
*/

