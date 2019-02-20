/*
  libsoundimpact.c

  Test harness for the sound impact library.

  By Andy Lindsay, Parallax Inc., 3/11/14.

  Copyright (C) Parallax, Inc. 2014. All Rights MIT Licensed.
*/

#include "simpletools.h"                      // Include simpletools
#include "soundimpact.h"                      // Include soundimpact

int main()                                    // Main function
{
  print("Tracks sound impacts and \n");       // User prompt
  print("updates every 3 seconds.\n");

  int *cog = soundImpact_run(4);              // Run in other cog

  // Check 10 times, every 3 seconds.
  for(int s = 0; s < 30; s += 3)              // Count to 30 in steps of 3        
  {
    int count = soundImpact_getCount();       // Get impact count
    print("count = %d\n", count);             // Display
    pause(3000);                              // Wait 3 seconds
  }

  print("Ending sound impact cog.\n");        // User info
  print("Cog is now free for other\n");
  print("process.\n");

  soundImpact_end(cog);                       // Stop sound impact cog
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

