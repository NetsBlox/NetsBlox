/*
  libdatetime.c

  Test harness for the datetime library

  Copyright (c) Parallax Inc 2015. All rights MIT licensed;
                see end of file.
*/  

#include "simpletools.h"
#include "datetime.h"

int main()
{
  datetime dt = {2015, 10, 21, 11, 49, 56};
  dt_run(dt);  
  dt.s = 0;    
  dt_set(dt);
  int mss = dt_getms();
  pause(10);
  int mms = dt_getms();
  pause(10);
  int msms = dt_getms();
  print("\nmss = %d\n\n", mss);
  print("\nmss = %d\n\n", mms);
  print("\nmss = %d\n\n", msms);
  char s[9];
  dt = dt_get();
  print("date/time strings = ");    
  dt_toDateStr(dt, s);
  print("%s ", s);
  dt_toTimeStr(dt, s);
  print("%s\n\n", s);
  pause(2000);
  dt = dt_get();
  print("date/time strings = ");    
  dt_toDateStr(dt, s);
  print("%s ", s);
  dt_toTimeStr(dt, s);
  print("%s\n\n", s);
  
  datetime dt2 = {2000, 1, 2, 3, 4, 5};
  dt2 = dt_fromTimeStr(dt2, s);
  //s = (char[17]){"14/05/06"};
  strcpy(s, "08/03/13");
  dt2 = dt_fromDateStr(dt2, s);
  print("fromTimeStr\n");
  print("dt2.y = %d, dt2.mo = %d, dt2.d = %d, dt2.h = %d, dt2.m = %d, dt2.s = %d\n\n", 
    dt2.y, dt2.mo, dt2.d, dt2.h, dt2.m, dt2.s);
  
  //dt = dt_fromStr(s);
  while(1)
  {
    pause(500);
    dt = dt_get();
    print("dt.y = %d, dt.mo = %d, dt.d = %d, dt.h = %d, dt.m = %d, dt.s = %d\n", 
    dt.y, dt.mo, dt.d, dt.h, dt.m, dt.s);
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

