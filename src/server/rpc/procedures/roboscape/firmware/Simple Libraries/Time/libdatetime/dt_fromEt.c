/*
  dt_fromEt.c

  Copyright (c) Parallax Inc 2015. All rights MIT licensed;
                see end of file.
*/  

#include "simpletools.h"
#include "datetime.h"

datetime dt_fromEt(int et)
{
  datetime dt;
  int date = dte_dateETV(et);
  int time = dte_timeETV(et);

  dt.y = date >> 16;
  dt.mo = (date >> 8) & 0xFF;
  dt.d = date & 0xFF;
  dt.h = time >> 16;
  dt.m = (time >> 8) & 0xFF;
  dt.s = time & 0xFF;
  
  return dt;
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

