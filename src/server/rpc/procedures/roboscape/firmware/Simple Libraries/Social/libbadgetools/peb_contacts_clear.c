#include "simpletools.h"
#include "badgetools.h"

/*  BROKEN  */

/*

int i2cLock;
volatile int eei2cLock;
volatile int eei2cLockFlag;
volatile int eeRecCount, eeNextAddr, eeBadgeOk, 
             eeNext, eeRecsAddr, eeRecs, 
             eeRecHome, eeRecOffice;
volatile int eeHome;

void contacts_clear(void)
{
  if(!eeBadgeOk) ee_badgeCheck();
  eeRecOffice +=4;
  eeRecs--;
  while(lockset(eei2cLock));
  while(eeRecs >= 0)
  {
    print("eeRecs = %d\n", eeRecs);
    print("eeRecOffice = %d\n", eeRecOffice);
    int a = ee_getInt(eeRecOffice);
    ee_putInt(0xFFFFFFFF, eeRecOffice);
    int ss = a >> 16;
    a &= 0x0000FFFF;
    print("ss = %d\n", ss);
    print("a = %d\n", a);
    char s[ss];
    ee_getStr((unsigned char *) s, ss, a);  
    print("s = %s\n\n", s);    
    memset(s, 0xFF, ss);                           // ? ss +/- 1 ?
    ee_putStr((unsigned char *) s, ss, a);  
    eeRecs--;    
    eeRecOffice += 4;
  }    
  ee_putInt(0, eeRecsAddr);
  ee_putInt(eeHome, eeRecsAddr + 4);
  lockclr(eei2cLock);
//  ee_putStr("erased", 7, eeHome);
  eeBadgeOk = 0;
  ee_badgeCheck();
}

*/


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

