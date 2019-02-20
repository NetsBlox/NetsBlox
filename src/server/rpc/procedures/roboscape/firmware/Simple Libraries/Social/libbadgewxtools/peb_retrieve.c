#include "simpletools.h"
#include "badgewxtools.h"

int i2cLock;
volatile int eei2cLock;
volatile int eei2cLockFlag;
volatile int eeRecCount, eeNextAddr, eeBadgeOk, 
             eeNext, eeRecsAddr, eeRecs, 
             eeRecHome, eeRecOffice;
volatile int eeHome;

void retrieve(char *contact, int recIdx)
{
  if(!eeBadgeOk) ee_badgeCheck();
  if(recIdx >= eeRecs) return;
  int a = EE_BADGE_DATA_END - (4 * recIdx);
  while(lockset(eei2cLock));
  a = ee_getInt(a);
  int ss = a >> 16;
  a &= 0x0000FFFF;
  //print("ee_retireve a = %d\n", a);  
  //print("ee_retireve ss = %d\n", ss);  
  memset(contact, 0, ss);                     // ? ss +/- 1 ?
  ee_getStr((unsigned char *)contact, ss, a); 
  //stringView(contact, ss); 
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

