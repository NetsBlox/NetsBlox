#include "simpletools.h"
#include "badgetools.h"

int i2cLock;
volatile int eei2cLock;
volatile int eei2cLockFlag;
volatile int eeRecCount, eeNextAddr, eeBadgeOk, 
             eeNext, eeRecsAddr, eeRecs, 
             eeRecHome, eeRecOffice;
volatile int eeHome;

void dev_ee_show(int byteCount, int address)                            //changed 8/23 4:54 PM
{
  while(lockset(eei2cLock));
  for(int i = address; i < address + byteCount; i++)
  {
    int c = ee_getByte(i);
    if((c >= ' ' && c <= 'z'))
    {
      printi("%c", c);
    }
    else
    {
      printi("[%x]", c);
    }
  } 
  lockclr(eei2cLock);  
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

