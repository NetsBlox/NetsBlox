#include "abvolts.h"
#include "simpletools.h"

static int pinCh0 = 26, pinCh1 = 27;
float abvolts_scale[2];

void da_setupScale()
{
  high(pinCh0);
  high(pinCh1);

  pause(5);

  float vA = ad_volts(0);
  float vB = ad_volts(1);

  //print("%f %f\n", vA, vB);

  if( (vA > 3.1 && vA < 3.5 && vB > 3.1 && vB < 3.5))
  {
    for(int i = 0; i < 39; i++)
    {
      vA += ad_volts(0);
      vB += ad_volts(1);
    }
    vA /= 40;
    vB /= 40;

    vA = 3.3 / vA;
    vB = 3.3 / vB;

    int addr = _abvolts_EE_start_;

    ee_putStr("abvolts", 8, addr);
    addr += 8;

    ee_putFloat32(vA, addr);
    addr += 4;

    ee_putFloat32(vB, addr);
    addr += 4;

    low(pinCh0);
    low(pinCh1);

    input(pinCh0);
    input(pinCh1);

    putStr("Ch0 scalar = ");
    putFloat(vA);
    putStr("\nCh1 scalar = ");
    putFloat(vB);
    putChar('\n');
    putChar('\n');

    abvolts_scale[0] = vA;
    abvolts_scale[1] = vB;
  }
  else
  {
    putStr("Error! Something went wrong. Check your circuit and power source.");
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
