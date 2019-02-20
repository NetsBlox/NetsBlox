/*
 * @file eeprom.c
 *
 * @author Andy Lindsay
 *
 * @version 0.85
 *
 * @copyright Copyright (C) Parallax, Inc. 2013.  See end of file for
 * terms of use (MIT License).
 *
 * @brief eeprom functions source, see simpletools.h for documentation.
 *
 * @detail Please submit bug reports, suggestions, and improvements to
 * this code to editor@parallax.com.
 */

#include "simpletools.h"                      // simpletools function prototypes

i2c *st_eeprom;
int st_eeInitFlag;

void ee_init();

int ee_getInt(int addr)
{
  if(!st_eeInitFlag) ee_init();
  //unsigned char val[4] = {0, 0, 0, 0};
  int value;
  // const unsigned char addrArray[] = {(char)(addr >> 8), (char)(addr&0xFF)};
  // i2c_in(st_eeprom, 0xA0, addrArray, 2, val, 4);
  i2c_in(st_eeprom, 0x50, addr, 2, (unsigned char*) &value, 4);
  // int value = (int)((int)(val[0]) | (int)(val[1] << 8) | (int)(val[2] << 16) | (int)(val[3] << 24));
  return value;
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
