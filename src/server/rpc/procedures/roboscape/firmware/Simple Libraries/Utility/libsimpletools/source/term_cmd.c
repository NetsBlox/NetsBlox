/*
 * @file term_cmd.c
 *
 * @author Andy Lindsay
 *
 * @version 0.85
 *
 * @copyright Copyright (C) Parallax, Inc. 2012.  See end of file for
 * terms of use (MIT License).
 *
 * @brief Send commands (0...14) to the SimpleIDE for various cursor
 * control and miscellaneous commands.
 *
 * @detail Please submit bug reports, suggestions, and improvements to
 * this code to editor@parallax.com.
 */

#include "simpletools.h"

/*
void term_cmd(int termConst, ...)
{
  terminal *term = simpleterm_pointer();
  serial_txChar(term, (char) termConst);  
    
  int max;
  if(termConst == CRSRXY)
    max = 2;
  else if((termConst == CRSRX) || (termConst == CRSRY))
    max = 1;
  else
    max = 0;
    
  va_list arg_ptr;
  va_start(arg_ptr, termConst);
  for(int args = 0; args < max; args++)
  {
    serial_txChar(term, (char) va_arg(arg_ptr, int));
  }
  va_end(arg_ptr); 
}
*/

void term_cmd(int termConst, ...)
{
  terminal *term = simpleterm_pointer();

  int max;
  if(termConst == CRSRXY)
    max = 2;
  else if((termConst == CRSRX) || (termConst == CRSRY))
    max = 1;
  else
    max = 0;
    
  //putChar(termConst);  
  serial_txChar(term, (char) termConst);  
    
  va_list arg_ptr;
  va_start(arg_ptr, termConst);
  for(int args = 0; args < max; args++)
  {
    //putChar(va_arg(arg_ptr, int));
    serial_txChar(term, (char) va_arg(arg_ptr, int));  
  }
  va_end(arg_ptr); 
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
