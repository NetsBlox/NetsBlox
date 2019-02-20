/*
  libmma7455.c
  
  Test Harness for the mma7455 library.
  
  P7 <-> DATA
  P8  -> CLK
  P6  -> /ENABLE
*/


#include "simpletools.h"                                      // Include simpletools lib
#include "mma7455.h"

int DATA = 7, CLK = 8, ENABLE = 6;

int main()                                                    // Main function
{
  
  MMA7455_init(DATA, CLK, ENABLE);
  
  MMA7455_setOffsetX(0);  
  MMA7455_setOffsetY(0);  
  MMA7455_setOffsetZ(0);  
  
  while(1)                                                    // Main loop
  {
    signed char x, y, z;

    MMA7455_gRange(2);
    MMA7455_getxyz8(&x, &y, &z);
    print("%c Bits = 8, Range = 2 g,  +/- 1 g = +/- 64\n",    // Display measurements
           HOME);
    print("   x = %d, y = %d, z = %d %c \n",                  // Display measurements
                 x,      y,      z, CLREOL);

    MMA7455_gRange(4);
    MMA7455_getxyz8(&x, &y, &z);
    print(" Bits = 8, Range = 4 g,  +/- 1 g = +/- 32\n");
    print("   x = %d, y = %d, z = %d %c \n",                  // Display measurements
                 x,      y,      z, CLREOL);

    MMA7455_gRange(8);
    MMA7455_getxyz8(&x, &y, &z);
    print(" Bits = 8, Range = 8 g,  +/- 1 g = +/- 16\n");
    print("   x = %d, y = %d, z = %d %c \n",                  // Display measurements
                 x,      y,      z, CLREOL);

    signed short xs, ys, zs;
    MMA7455_getxyz10(&xs, &ys, &zs);
    print(" Bits = 10, Range = 8 g,  +/- 1 g = +/- 64\n");
    print("   x = %d, y = %d, z = %d %c \n",                  // Display measurements
                 xs,      ys,      zs, CLREOL);

    pause(500);                                               // Wait 0.5 s before repeat
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

