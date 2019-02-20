#include "badgetools.h"
#include "simpletools.h"

void ee_init();
void init_MMA7660FC(void);
int raw2g100(char gRaw);

i2c *st_eeprom;
int st_eeInitFlag;
volatile int bt_accelInitFlag = 0;
volatile int eei2cLock;
volatile int eei2cLockFlag;

void init_MMA7660FC(void)
{
  int x, y, z;
  unsigned char val = 0;
  bt_accelInitFlag = 1;
  if(!eei2cLockFlag)
  {
    leds(0b111111);
    eei2cLock = locknew();
    lockclr(eei2cLock);
    eei2cLockFlag = 1;
  }
  if(!st_eeInitFlag) ee_init();
  while(lockset(eei2cLock));  
  i2c_out(st_eeprom, MMA7660_I2C, 
          MODE, 1, &val, 1);
  i2c_out(st_eeprom, MMA7660_I2C, 
          INTSU, 1, &val, 1);
  i2c_out(st_eeprom, MMA7660_I2C, 
          SR, 1, &val, 1);
  val = 0xC1;
  i2c_out(st_eeprom, MMA7660_I2C, 
          MODE, 1, &val, 1);
  i2c_stop(st_eeprom);        
  lockclr(eei2cLock);
  accels(&x, &y, &z);        
}
  
int accel(int axis)
{
  if(!st_eeInitFlag) ee_init();
  unsigned char val = 0;
  while(lockset(eei2cLock));
  i2c_in (st_eeprom, MMA7660_I2C, 
          axis, 1, &val, 1);
  i2c_stop(st_eeprom);        
  lockclr(eei2cLock);
  int g100 = raw2g100(val);
  if(axis == AY) g100 = -g100;
  return g100;
}

void accels(int *x, int *y, int *z)
{
  //char axis[4] = {0, 0, 0, 0};
  //int g100[3] = {0, 0, 0};
  *x = accel(AX);
  *y = accel(AY);
  *z = accel(AZ);
} 

int raw2g100(char gRaw)
{
  int g100 = (int) gRaw;
  int sign = 1 & (g100 >> 5);
  if(sign) 
    g100 = 0xFFFFFFC0 | g100;
  else
    g100 = 0x3F & g100;
  g100 = g100 * 469 / 100;
  return g100;
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

