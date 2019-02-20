#include <propeller.h>
#include "badgetools.h"

light badgeLight;
light *ledsself;

int32_t 	cpcog;

void set_1_blue(int32_t idx)
{
  //int32_t result = 0;
  // LOCKED 30 JUN 2015  
  // Set one of the six blue LEDs
  // -- connections designed for Charlieplexing
  //    * make one high, one low, the other high-z (input)
  // -- for multiple LEDs use Charlieplex driver methods
  
  if (cpcog) {
    // Charlieplex driver loaded?
    if ((idx >= BLUE_0) && (idx <= BLUE_5)) {
      // valid element?
      // set via mask
      led_on((1 << idx));
    } else {
      // clear all 
      leds(0b000000);
    }
    return;
  }
  // if no driver loaded, use direct control
  if (idx == BLUE_0) {
    // CP2 = L, CP1 = H, CP0 = Z     
    OUTA = ((OUTA & 0xfffffe3f) | 0x80);
    DIRA = ((DIRA & 0xfffffe3f) | 0x180);
  } else if (idx == BLUE_1) {
    // CP2 = H, CP1 = Z, CP0 = L    
    OUTA = ((OUTA & 0xfffffe3f) | 0x100);
    DIRA = ((DIRA & 0xfffffe3f) | 0x140);
  } else if (idx == BLUE_2) {
    // CP2 = L, CP1 = Z, CP0 = H 
    OUTA = ((OUTA & 0xfffffe3f) | 0x40);
    DIRA = ((DIRA & 0xfffffe3f) | 0x140);
  } else if (idx == BLUE_3) {
    // CP2 = H, CP1 = L, CP0 = Z  
    OUTA = ((OUTA & 0xfffffe3f) | 0x100);
    DIRA = ((DIRA & 0xfffffe3f) | 0x180);
  } else if (idx == BLUE_4) {
    // CP2 = Z, CP1 = H, CP0 = L 
    OUTA = ((OUTA & 0xfffffe3f) | 0x80);
    DIRA = ((DIRA & 0xfffffe3f) | 0xc0);
  } else if (idx == BLUE_5) {
    // CP2 = Z, CP1 = L, CP0 = H
    OUTA = ((OUTA & 0xfffffe3f) | 0x40);
    DIRA = ((DIRA & 0xfffffe3f) | 0xc0);
  } else if (1) {
    // disable all
    OUTA &= ~(7<<BLU_CP0);
    DIRA &= ~(7<<BLU_CP0);
  }
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

