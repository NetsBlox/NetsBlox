#include "simpletools.h"
#include "badgetools.h"

int i2cLock;
volatile int eei2cLock;
volatile int eei2cLockFlag;
volatile int eeRecCount, eeNextAddr, eeBadgeOk, 
             eeNext, eeRecsAddr, eeRecs, 
             eeRecHome, eeRecOffice;
volatile int eeHome;

void ee_badgeCheck(void)
{
  char s[17];
  memset(s, 0, sizeof(s));
  char p[] = "Parallax eBadge";
  int ss = 1 + strlen(p);
  int a = eeHome;
  while(lockset(eei2cLock));
  ee_getStr((unsigned char *)s, ss, a);
  lockclr(eei2cLock);
  if(!strcmp(s, p))
  {
    //print("strcmp true\n");
    a += ss;
    eeRecsAddr = a;
    while(lockset(eei2cLock));
    eeRecs = ee_getInt(a);
    a += 4;
    eeNextAddr = a;
    eeNext = ee_getInt(a);
    lockclr(eei2cLock);
    a += 4;
    eeRecHome = a;
  }
  else
  {    
    //print("strcmp false\n");
    a = eeHome;
    while(lockset(eei2cLock));
    ee_putStr((unsigned char *)p, ss, a);                      // p = "Parallax eBadge"
    a += ss;
    eeRecsAddr = a;
    eeRecs = 0;
    ee_putInt(eeRecs, a);
    a += 4;
    eeNext = a + 4;
    eeRecHome = eeNext;
    eeNextAddr = a;
    ee_putInt(eeNext, eeNextAddr);
    lockclr(eei2cLock);
  } 

  eeRecOffice = EE_BADGE_DATA_END - (eeRecs * 4);

  //print("eeHome = %d\n", eeHome);
  //print("eeRecsAddr = %d\n", eeRecsAddr);
  //print("eeNextAddr = %d\n", eeNextAddr);
  //print("eeRecHome = %d\n", eeRecHome);
  //print("eeNext = %d\n", eeNext);
  //print("eeRecOffice = %d\n", eeRecOffice);
  //print("eeRecs = %d\n", eeRecs);
  
  eeBadgeOk = 1; 
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

