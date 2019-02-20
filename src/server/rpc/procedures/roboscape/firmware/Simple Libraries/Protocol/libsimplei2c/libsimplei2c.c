/*
* @file libsimplei2c.c
*
* @author Steve Denson 
*
* @copyright
* Copyright (C) Parallax, Inc. 2013. All Rights MIT Licensed.
*
* @brief Project and test harness for the simplei2c library.
*/

#include "simplei2c.h"
#include "simpletext.h"
#include "simpletools.h"
#include <math.h>

#if 0
int ee_writeBuffer(i2c *bus, int devaddr, int address, unsigned char *buffer, int count)
{
  int result = 0;
  int upaddr = ((address >> 16) & 0x07) << 1;

  i2c_start(bus);
  i2c_writeByte(bus, devaddr | upaddr);
  i2c_writeByte(bus, (address >> 8) & 0xff);
  i2c_writeByte(bus, address & 0xff);
  result = i2c_writeData(bus, buffer, count);
  i2c_stop(bus);
  do {
  } while(i2c_poll(bus, 0xA0));
  return result;
}

int ee_readBuffer(i2c *bus, int devaddr, int address, unsigned char *buffer, int count)
{
  int result = 0;
  int upaddr = ((address >> 16) & 0x07) << 1;
  i2c_start(bus);
  i2c_writeByte(bus, devaddr | upaddr);
  i2c_writeByte(bus, (address >> 8) & 0xff);
  i2c_writeByte(bus, (address) & 0xff);
  i2c_start(bus);
  i2c_writeByte(bus, devaddr | 1);
  result = i2c_readData(bus, buffer, count);
  i2c_stop(bus);
  return result;
}
#endif

int main(void)
{
  uint8_t buffer[81];
  int n = 0;
  int ack = 0;
  int nack = 1;
  int addr1 = 64000;
  int addr2 = 0xff00;

  text_t *termp = simpleterm_pointer();

  i2c eebus;
  i2c_open(&eebus, 28, 29, 1);

/*/// Compass (I2C data operations) ///*/
#if 0                                
  unsigned char x16, y16, z16;
  uint8_t data[6];

  i2c compass;
  i2c_open(&compass, 3, 2, 0);

  i2c_start(&compass);
  const unsigned char cont_mode[] = {0x3C, 0x02, 0x00};
  i2c_writeData(&compass, cont_mode, 3);
  i2c_stop(&compass);
  //pause(500);

  for(int i = 0; i < 5; i++)
  {
    i2c_start(&compass);
    const unsigned char read_dat_reg[] = {0x3C, 0x03};
    i2c_writeData(&compass, read_dat_reg, 2);
    i2c_stop(&compass);
    //pause(500);

    i2c_start(&compass);
    ack = i2c_writeByte(&compass, 0x3D);
    print("ack = %d\n", ack);
    ack = i2c_readData(&compass, data, 6);
    print("ack = %d\n", ack);
    i2c_stop(&compass);

    /* assemble the return values */
    print("ack = %d\n", ack);
    x16 = (data[0] << 8) | data[1];
    z16 = (data[2] << 8) | data[3];
    y16 = (data[4] << 8) | data[5];

    int x, y, z;
    int *px, *py, *pz;

    px = &x;
    py = &y;
    pz = &z;
 
    *px = x16;
    *py = y16;
    *pz = z16;

    float heading = atan2(x16, y16);
    if(heading < 0)
    {
      heading += 2.0 * 3.14;
    }
     
    float headingDegrees = heading * 180/3.14; 

    //print("ack = %d\n", ack);
    print("%c\nx=%d, y=%d, z=%d%c\n",              // Display raw compass values
          HOME, x, y, z, CLREOL);
    print("heading = %f, \n",              // Display raw compass values
          headingDegrees);
    waitcnt(CLKFREQ/2+CNT);
  }    
#endif  

/*/// Write a value and test reading to make sure it picks up the first byte ///*/
#if 0
  i2c_start(&eebus);
  char cmd[4] = {0xA0, 0xFF, 0x00, 0xFE};
  int bytecnt = i2c_writeData(&eebus, cmd, 4);
  i2c_stop(&eebus);
  print("bytecnt = %d\n", bytecnt);
  //pause(4);
  for(int i = -2; i < 3; i++)
  {
    ee_readBuffer(&eebus, 0xA0, addr2 + i, buffer, 64);
    writeHexDigits(termp, addr2 + i, 4);
    putStr(": ");
    for(n = 0; n < 12; n++) 
    {
      writeHexDigits(termp, buffer[n], 2);
      putChar(' ');
    }
    putStr("\n");
  }
#endif

/*/// Test poll count ///*/
#if 0
  sprint(buffer, "Hello World");
  ee_writeBuffer(&eebus, 0xA0, addr2, buffer, 64);
  ee_readBuffer(&eebus, 0xA0, addr2, buffer, 64);

  for(int i = -2; i < 3; i++)
  {
    ee_readBuffer(&eebus, 0xA0, addr2 + i, buffer, 64);
    writeHexDigits(termp, addr2 + i, 4);
    putStr(": ");
    for(n = 0; n < 12; n++) {
      writeHexDigits(termp, buffer[n], 2);
      putChar(' ');
    }
    putStr("\n");
  }
#endif

/*//// Read values and make sure it picks up the first byte ///*/
#if 0
  for(int i = -2; i < 3; i++)
  {
    ee_readBuffer(&eebus, 0xA0, addr1, buffer, 64);
    writeHexDigits(termp, addr1, 4);
    putStr(": ");
    for(n = 0; n < 12; n++) {
      writeHexDigits(termp, buffer[n], 2);
      putChar(' ');
    }
    putStr("\n");
  }
#endif



  while(1)
  {
#if 0
    if(i2c_poll(&eebus, 0xA0) != 0)
      putStr("No ACK! ");
#endif

#if 0
    i2c_start(&eebus);
    i2c_writeByte(&eebus, 0xA0);
    i2c_writeByte(&eebus, 0);
    i2c_writeByte(&eebus, 0);

    i2c_start(&eebus);
    i2c_writeByte(&eebus, 0xA1);
    i2c_start(&eebus);
    i2c_readByte(&eebus, 1);
    i2c_stop(&eebus);
    waitcnt(CLKFREQ/500+CNT);
    continue;
#endif

#if 0
    i2c_start(&eebus);
    i2c_writeByte(&eebus, 0xA1);
    i2c_stop(&eebus);
    waitcnt(CLKFREQ/2000+CNT);
    continue;
#endif

#if 0
    ee_readBuffer(&eebus, 0xA0, addr2, buffer, 64);
    writeHexDigits(termp, addr2, 4);
    putStr(": ");
    for(n = 0; n < 12; n++) {
      writeHexDigits(termp, buffer[n], 2);
      putChar(' ');
    }
    putLine((char*)buffer);
    waitcnt(CLKFREQ/2+CNT);
#endif

#if 0
    sprint(buffer, "Hello World");
    ee_writeBuffer(&eebus, 0xA0, addr2, buffer, 64);
    ee_readBuffer(&eebus, 0xA0, addr2, buffer, 64);

    putStr("\n");
    writeHexDigits(termp, addr2, 4);
    putStr(": ");
    for(n = 0; n < 12; n++) {
      writeHexDigits(termp, buffer[n], 2);
      putChar(' ');
    }
    putLine("");
    pause(500);
#endif
    waitcnt(CLKFREQ/500+CNT);
  }
  return 0;
}

/*
+--------------------------------------------------------------------
| TERMS OF USE: MIT License
+--------------------------------------------------------------------
Permission is hereby granted, free of charge, to any person obtaining
a copy of this software and associated documentation files
(the "Software"), to deal in the Software without restriction,
including without limitation the rights to use, copy, modify, merge,
publish, distribute, sublicense, and/or sell copies of the Software,
and to permit persons to whom the Software is furnished to do so,
subject to the following conditions:

The above copyright notice and this permission notice shall be
included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.
IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY
CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT,
TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE
SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
+--------------------------------------------------------------------
*/
