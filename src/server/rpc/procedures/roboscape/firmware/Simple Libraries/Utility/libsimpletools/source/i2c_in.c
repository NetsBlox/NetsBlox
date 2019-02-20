/*
 * @file i2c_in.c
 *
 * @author Andy Lindsay
 *
 * @version 0.86
 *
 * @copyright Copyright (C) Parallax, Inc. 2013.  See end of file for
 * terms of use (MIT License).
 *
 * @brief i2c function source, see simpletools.h for documentation.
 *
 * @detail Please submit bug reports, suggestions, and improvements to
 * this code to editor@parallax.com.
 */

#include "simpletools.h"
#include "simplei2c.h"

HUBTEXT int  i2c_in(i2c *busID, int i2cAddr, 
                     int memAddr, int memAddrCount, 
                     unsigned char *data, int dataCount)
{
  int n  = 0;
  i2cAddr <<= 1;
  i2cAddr &= -2;                                        // Clear i2cAddr.bit0 (write)
  i2c_start(busID);
  if(i2c_writeByte(busID, i2cAddr)) return n; else n++;
  if(memAddrCount) 
  {
    int m;
    if(memAddrCount)
    {
      if(memAddrCount > 0)
      {
        endianSwap(&m, &memAddr, memAddrCount);
      }  
      else 
      {
        m = memAddr;
        memAddrCount = - memAddrCount;
      }  
      n += i2c_writeData(busID, (unsigned char*) &m, memAddrCount);
    }  
  }  
  i2cAddr |= 1;                                       // Set i2cAddr.bit0 (read)
  i2c_start(busID);
  if(i2c_writeByte(busID, i2cAddr)) return n; else n++;
  n += i2c_readData(busID, data, abs(dataCount));
  i2c_stop(busID);
  if(dataCount < 0)
  {
    dataCount = -dataCount;
    char temp[dataCount];
    memcpy(temp, data, dataCount);
    endianSwap(data, temp, dataCount);
  }
  return n;  
}

/**
 * TERMS OF USE: MIT License
 *
 * Permission is hereby granted, free of charge, to any person obtaining a
 * copy of this software and associated documentation files (the "Software"),
 * to deal in the Software without restriction, including without limitation
 * the rights to use, copy, modify, merge, publish, distribute, sublicense,
 * and/or sell copies of the Software, and to permit persons to whom the
 * Software is furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL
 * THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
 * FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER
 * DEALINGS IN THE SOFTWARE.
 */

