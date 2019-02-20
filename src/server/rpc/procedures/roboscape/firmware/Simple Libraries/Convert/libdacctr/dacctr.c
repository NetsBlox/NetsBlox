/**
 * @file dac.c
 *
 * @author Andy Lindsay
 *
 * @version 0.86
 *
 * @copyright Copyright (C) Parallax, Inc. 2012.  See end of file for
 * terms of use (MIT License).
 *
 * @brief dac function source, see simpletools.h for documentation.
 *
 * @detail Please submit bug reports, suggestions, and improvements to
 * this code to editor@parallax.com.
 */

#include "dacctr.h"

void dac_loop(void *par);


dac dac_setup(int pin, int channel, int bits)
{
  dac tda;
  if(channel > 1) tda.daCog = -1; else tda.daCog = cogid(); 
  tda.daPin = pin;
  tda.daBitX = 32 - bits;
  tda.daCh = channel;
  tda.daCtr = DUTY_SE | pin;
  return tda;
}


void dac_set(dac* da, int value)
{
  if(cogid() != da->daCog)
  {
    da->daVal = value;
  }
  else
  {
    if(da->daCh == 0) CTRA = da->daCtr; else CTRB = da->daCtr;
    if(da->daCh == 0) FRQA = value << da->daBitX; else FRQB = value << da->daBitX;
    DIRA |= (1 << da->daPin);
  }  
} 


int dac_start(dacmem mem, int sampleRate, dac* da0, dac* da1)
{
  daca temp;
  
  // print("%d   %d\n", da0, da1);
  
  temp.daDt = CLKFREQ/sampleRate;
  
  if(da0)
  {
    temp.da0 = da0;
    da0->daCog = -1;
    da0->daCh = 0;
    if(da0->daBitX < 0) da0->daBitX = - da0->daBitX;
  }  
  if(da1)
  {
    temp.da1 = da1;
    da1->daCog = -1;
    da1->daCh = 1;
    if(da1->daBitX < 0) da1->daBitX = - da1->daBitX;
  }
  int mycog = cogstart(dac_loop, &temp, mem.stack, sizeof(mem.stack));
  if(da0) while(da0->daCog == -1);
  if(da1) while(da1->daCog == -1); 
  // print("done!\n");
  return mycog;
}


void dac_loop(void *par)
{
  daca* dacAddr = (daca*) par; 

  unsigned int dt = dacAddr -> daDt;
  
  dac* da0 = dacAddr->da0;
  dac* da1 = dacAddr->da1;
  
  if(da0) da0->daCog = cogid();
  if(da1) da1->daCog = cogid();
  
  if(da0->daVal < 0) da0->daVal = -da0->daVal;
  if(da1->daVal < 0) da1->daVal = -da1->daVal;

  if(da0) 
  {
    CTRA = da0->daCtr;
    DIRA |= (1 << da0->daPin);
  }  
  if(da1) 
  {
    CTRB = da1->daCtr;
    DIRA |= (1 << da1->daPin);
  }  
  
  int t = CNT;
  
  while(1)
  {
    //Sampling rate is approx 111 kHz with 80 Mhz clock without waitcnt.
    //Minimum dt is CLKFREQ/46269 at 80 MHz.
    //The tf - ti test code takes 464 clock ticks (subtract from your result).
    //ti = CNT;
    waitcnt(t+=dt);
    FRQA = da0->daVal << da0->daBitX;
    FRQB = da1->daVal << da1->daBitX;
    //tf = CNT - ti;
  }  
}


void dac_close(dac* da)
{
   DIRA &= ~(1<<da->daPin);
   if(da->daCh == 0)
   {
     CTRA = 0;
     FRQA = 0;
   }
   else
   {
     CTRB = 0;
     FRQB = 0;
   }
}


int dac_stop(int cogid)
{
  cogstop(cogid);  
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
