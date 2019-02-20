#include <stdlib.h>
#include <propeller.h>
#include "badgewxtools.h"

volatile screen *self;

int32_t screen_scrollLeft(int32_t scrollStart, int32_t scrollStop)
{
  // startscrollleft
  // Activate a right handed scroll for rows start through stop
  // Hint, the display is 16 rows tall. To scroll the whole display, run:
  // display.scrollright($00, $0F) 
  screen_ssd1306_Command(SSD1306_LEFT_HORIZ_SCROLL);
  screen_ssd1306_Command(0);
  screen_ssd1306_Command(scrollStart);
  screen_ssd1306_Command(0);
  screen_ssd1306_Command(scrollStop);
  screen_ssd1306_Command(1);
  screen_ssd1306_Command(255);
  screen_ssd1306_Command(SSD1306_ACTIVATE_SCROLL);
  return 0;
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

