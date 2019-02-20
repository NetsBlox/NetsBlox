#include "simpletools.h"
#include "badgewxtools.h"

int i2cLock;
volatile int eei2cLock;
volatile int eei2cLockFlag;
volatile int eeRecCount, eeNextAddr, eeBadgeOk, 
             eeNext, eeRecsAddr, eeRecs, 
             eeRecHome, eeRecOffice;
volatile int eeHome;

void contacts_eraseAll()
{
  //printi("EEPROM erase takes 20 seconds...");
  unsigned char str[128];
  for(int i = 32768; i < 65536; i += 128)
  {
    memset(str, 255, 128);
    ee_putStr(str, 128, i);
  }    
  //ee_badgeCheck();
  eeRecCount = 0;
  eeNextAddr = 0;
  eeBadgeOk = 0;
  eeNext = 0;
  eeRecsAddr = 0;
  eeRecs = 0;
  eeRecHome = 32768;
  eeRecOffice = 0;
  //printi("Done!\n\n");
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

