/*
  sonyremote.c
*/

#include "sirc.h"

static int tLimit = 0;
static int t;

void sirc_setTimeout(int ms)
{
  tLimit = (CLKFREQ / 1000) * ms;
}

int sirc_button(int pin)
{
  int button = sirc_code(pin, 7);

  //Correct for numeric keys
  if((button <= 9) && (button >=0)) button++;
  if(button == 10) button = 0;

  return button;
}
  
int sirc_device(int pin)
{
  int device = sirc_code(pin, 12);
  device >>= 7;

  return device;
}
  
int sirc_code(int pin, int bits)
{
  set_io_dt(CLKFREQ/1000000);
  set_io_timeout(CLKFREQ/50);

  unsigned int irPulse;                
  int irCode = 0;
  if(tLimit) t = CNT;
  do{
    irPulse = pulse_in(pin, 0); 
    if(tLimit)
    {
      if((CNT - t) >= tLimit) return -1;
    }  
  }while((irPulse <= 2000) || (irPulse >= 2800));
  
  for(int i = 0; i < bits; i++)
  {
    irPulse = pulse_in(pin, 0);
    if((irPulse > 1000) && (irPulse < 1400)) irCode |= (1 << i);
    if((irPulse < 300) || (irPulse > 1400)) return -1;
    if(tLimit)
    {
      if((CNT - t) >= tLimit) return -1;
    }  
  }
  return irCode;
}

/*
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

