/*
  dte_toCal.c

  Ported from Bob Belleville's date_time_epoch.spin from
  http://obex.parallax.com/object/191

  Copyright (c) Parallax Inc 2015. All rights MIT licensed;
                see end of file.
*/  

#include "simpletools.h"
#include "datetime.h"

int dte_toCal(int jd)
{
  int l, n, i, j, d, m, y;
  /*
    Henry F. Fliegel and Thomas C. Van Flandern

        l = jd + 68569
        n = ( 4 * l ) / 146097
        l = l - ( 146097 * n + 3 ) / 4
        i = ( 4000 * ( l + 1 ) ) / 1461001
        l = l - ( 1461 * i ) / 4 + 31
        j = ( 80 * l ) / 2447
        d = l - ( 2447 * j ) / 80
        l = j / 11
        m = j + 2 - ( 12 * l )
        y = 100 * ( n - 49 ) + i + l

    converts a Julian Day Number to year, month and day
  */
                         
  l = jd + 68569;
  n = ( 4 * l ) / 146097;
  l = l - ( 146097 * n + 3 ) / 4;
  i = ( 4000 * ( l + 1 ) ) / 1461001;
  l = l - ( 1461 * i ) / 4 + 31;
  j = ( 80 * l ) / 2447;
  d = l - ( 2447 * j ) / 80;
  l = j / 11;
  m = j + 2 - ( 12 * l );
  y = 100 * ( n - 49 ) + i + l;
  
  return (y<<16) | (m<<8) | d;
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

