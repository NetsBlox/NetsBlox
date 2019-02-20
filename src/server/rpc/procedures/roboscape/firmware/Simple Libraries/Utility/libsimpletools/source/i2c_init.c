/*
 * @file i2c_init.c
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

#define MAX_I2C_BUS 8

unsigned int st_buscnt = 0;

static i2c list[MAX_I2C_BUS];

i2c *i2c_newbus(int sclPin, int sdaPin, int sclDrive)
{
  i2c *busID = i2c_open(&list[st_buscnt++], sclPin, sdaPin, sclDrive);
  busID = &list[st_buscnt-1];
  return busID;
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

