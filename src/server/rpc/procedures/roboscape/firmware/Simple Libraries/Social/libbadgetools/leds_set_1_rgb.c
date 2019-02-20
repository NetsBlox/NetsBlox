#include <propeller.h>
#include "badgetools.h"

light badgeLight;
light *ledsself;

int32_t 	cpcog;

void set_1_rgb(int idx)
{
  //int32_t result = 0;
  // LOCKED 30 JUN 2015  
  // Set one of the LEDs within the RGB modules
  // -- connections designed for Charlieplexing
  //    * make one high, one low, the other high-z (input)
  // -- for multiple LEDs/colors use Charlieplex driver methods
  if (cpcog) {
    // Charlieplex driver loaded?      
    if ((idx >= RGB_B1) && (idx <= RGB_R2)) {
      // valid element?                  
      // set via mask                    
      light_set_rgb((1 << idx));
    } else {
      // clear all                       
      light_set_rgb(0);
    }
    return;
  }
  // if no driver loaded, use direct control
  if (idx == RGB_B1) {
    // CP2 = H, CP1 = Z, CP0 = L 
    OUTA = ((OUTA & 0xfffffff1) | 0x8);
    DIRA = ((DIRA & 0xfffffff1) | 0xa);
  } else if (idx == RGB_G1) {
    // CP2 = Z, CP1 = H, CP0 = L 
    OUTA = ((OUTA & 0xfffffff1) | 0x4);
    DIRA = ((DIRA & 0xfffffff1) | 0x6);
  } else if (idx == RGB_R1) {
    // CP2 = L, CP1 = H, CP0 = Z     
    OUTA = ((OUTA & 0xfffffff1) | 0x4);
    DIRA = ((DIRA & 0xfffffff1) | 0xc);
  } else if (idx == RGB_B2) {
    // CP2 = L, CP1 = Z, CP0 = H  
    OUTA = ((OUTA & 0xfffffff1) | 0x2);
    DIRA = ((DIRA & 0xfffffff1) | 0xa);
  } else if (idx == RGB_G2) {
    // CP2 = Z, CP1 = L, CP0 = H 
    OUTA = ((OUTA & 0xfffffff1) | 0x2);
    DIRA = ((DIRA & 0xfffffff1) | 0x6);
  } else if (idx == RGB_R2) {
    // CP2 = H, CP1 = L, CP0 = Z
    OUTA = ((OUTA & 0xfffffff1) | 0x8);
    DIRA = ((DIRA & 0xfffffff1) | 0xc);
  } else if (1) {
    // disable all
    OUTA &= ~(7<<RGB_CP0);
    DIRA &= ~(7<<RGB_CP0);
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

