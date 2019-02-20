
#include "simpletools.h"
#include "badgetools.h"

void ee_init();
void init_MMA7660FC(void);
int raw2g100(char gRaw);

i2c *st_eeprom;
int st_eeInitFlag;
//volatile int bt_accelInitFlag = 0;
volatile int eei2cLock;
volatile int eei2cLockFlag;

int accel_shaken(void)
{
  if(!st_eeInitFlag) ee_init();
  unsigned char axis = 3;                     // TILT status reg
  unsigned char val = 0;
  while(lockset(eei2cLock));
  i2c_in (st_eeprom, MMA7660_I2C, 
          axis, 1, &val, 1);
  i2c_stop(st_eeprom);        
  lockclr(eei2cLock);
  //print("val = %08b, ", val);
  val >>= 7;                                  // TILT reg SHAKEN bit
  val &= 1;
  return val;
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

