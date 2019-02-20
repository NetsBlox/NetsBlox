/*
 * @file writeChar.c
 * Function to print a char to the terminal.
 *
 * Copyright (c) 2013, Parallax Inc.
 * Written by Steve Denson
 */

#include "simpletext.h"

void writeChar(text_t *p, char c)
{
  #ifdef ST_SLASH_ReturN
  if(c == '\n')
    p->txChar(p, '\r');
  p->txChar(p, c);
  #endif  
  
  #ifdef SIMPLETEXT_ECS
  //
  if((c != p->ecA) && (c != p->ecB))
  {
    p->txChar(p, c); 
  }
  else
  {
    if(p->ecsA) p->txChar(p, p->ecsA);
    if(p->ecsB) p->txChar(p, p->ecsB);
  }
  //

  #endif 
  
  #ifdef ST_NO_CHAR_SUBS
  p->txChar(p, c);
  #endif
}

/*
+--------------------------------------------------------------------
| TERMS OF USE: MIT License
+--------------------------------------------------------------------
Permission is hereby granted, free of charge, to any person obtaining
a copy of this software and associated documentation files
(the "Software"), to deal in the Software without restriction,
including without limitation the rights to use, copy, modify, merge,
publish, distribute, sublicense, and/or sell copies of the Software,
and to permit persons to whom the Software is furnished to do so,
subject to the following conditions:

The above copyright notice and this permission notice shall be
included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.
IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY
CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT,
TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE
SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
+--------------------------------------------------------------------
*/

