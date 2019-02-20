#include "abvolts.h"
#include "simpletools.h"

float abvolts_scale[2] = {1.0, 1.0};
int abvolts_daCtrBits;

void da_volts(int channel, float daVal)
{
  if(!abvolts_daCtrBits)
  {
    da_out(channel, 0);
  }
  int levels = (1<<abvolts_daCtrBits);
  daVal *= ((float) levels / 3.3);
  daVal *= abvolts_scale[channel];
  if((daVal - (float)(int)daVal) >= 0.5) daVal += 1.0;
  int dacVal = (int) daVal;
  if(dacVal >= levels) dacVal = levels - 1;
  if(dacVal < 0) dacVal = 0;
  da_out(channel, dacVal);
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

