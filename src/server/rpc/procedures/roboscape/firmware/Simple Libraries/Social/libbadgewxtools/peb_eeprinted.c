#include "simpletools.h"
#include "badgewxtools.h"

int i2cLock;
volatile int eei2cLock;
volatile int eei2cLockFlag;
volatile int eeRecCount, eeNextAddr, eeBadgeOk, 
             eeNext, eeRecsAddr, eeRecs, 
             eeRecHome, eeRecOffice;
volatile int eeHome;

int eeprinted(const char *fmt, ...)
{
  if(!eeBadgeOk) ee_badgeCheck();
  char buf[128];
  va_list args;
  va_start(args, fmt);
  _dosprnt(fmt, args, buf);
  va_end(args);
  char s[128];
  int numRecs = contacts_count();
  for(int i = 0; i < numRecs; i++)
  {
    retrieve(s, i);
    if(!strcmp(buf, s)) return  1;
  }
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


