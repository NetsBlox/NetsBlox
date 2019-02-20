/**
 * @file simplei2c.c
 * Provides simple i2c start, stop, send, and receive functions
 *
 * Copyright (c) 2013, Parallax Inc.
 */
#include "simplei2c.h"

static inline HUBTEXT void all_low(i2c *dev)
{
  OUTA &= (dev->scl_mask_inv | dev->sda_mask_inv);
  DIRA |= (dev->scl_mask     | dev->sda_mask);
}

static inline HUBTEXT void all_high(i2c *dev)
{
  int dirmask = 0;
  OUTA &= dev->sda_mask_inv;
  OUTA |= dev->scl_mask;

  if(dev->drivescl) {
    dirmask = (dev->scl_mask | dev->sda_mask);
  }
  else {
    dirmask = (dev->scl_mask_inv & dev->sda_mask);
  }
  DIRA |= dirmask;
}

static inline HUBTEXT void scl_low(i2c *bus)
{
  OUTA &= bus->scl_mask_inv;
  DIRA |= bus->scl_mask;
}

static inline HUBTEXT void sda_low(i2c *bus)
{
  OUTA &= bus->sda_mask_inv;
  DIRA |= bus->sda_mask;
}

static inline HUBTEXT void scl_high(i2c *bus)
{
  if(bus->drivescl) {
    OUTA |= bus->scl_mask;
    DIRA |= bus->scl_mask;
  }
  else {
    OUTA &= bus->scl_mask_inv;
    DIRA &= bus->scl_mask_inv;
  }
}

static inline HUBTEXT void sda_high(i2c *bus)
{
  DIRA &= bus->sda_mask_inv;
}


HUBTEXT i2c *i2c_open(i2c *bus, int sclPin, int sdaPin, int sclDrive)
{
  bus->scl_mask = (1 << sclPin);
  bus->sda_mask = (1 << sdaPin);
  bus->scl_mask_inv = ~(1 << sclPin);
  bus->sda_mask_inv = ~(1 << sdaPin);
  bus->drivescl = sclDrive;
  i2c_stop(bus);
  return bus;
}

HUBTEXT void i2c_start(i2c *bus)
{
  all_high(bus);
  sda_low(bus);
  scl_low(bus);
}

HUBTEXT void i2c_stop(i2c *bus)
{
  all_low(bus);
  scl_high(bus);
#ifndef __PROPELLER_CMM__
  /* second scl_high call gives delay for sda_high to make timing */
  scl_high(bus);
#endif
  sda_high(bus);
}

#ifdef SPLIT_WRITE_DRIVE

static HUBTEXT int i2c_writeByteDrive(i2c *bus, int byte)
{
  int result;
  int count = 8;

  /* send the byte, high bit first */
  do {
    if (byte & 0x80)
      DIRA &= bus->sda_mask_inv;
    else
      DIRA |= bus->sda_mask;
    OUTA |= bus->scl_mask;
    DIRA |= bus->scl_mask;
    byte <<= 1;
    scl_low(bus);
  } while(--count > 0);
  DIRA &= bus->sda_mask_inv;
  /* get ack */
  scl_high(bus);
  result = (INA & bus->sda_mask);
  scl_low(bus);
  return result != 0;
}

static HUBTEXT int i2c_writeBytePullup(i2c *bus, int byte)
{
  int result;
  int count = 8;

  /* send the byte, high bit first */
  do {
    if (byte & 0x80)
      DIRA &= bus->sda_mask_inv;
    else
      DIRA |= bus->sda_mask;
    byte <<= 1;
    DIRA &= bus->scl_mask_inv;
    /* use call instead of DIRA |= for timing */
    scl_low(bus);
  } while(--count > 0);
  DIRA &= bus->sda_mask_inv;
  /* receive the acknowledgement from the slave */
  DIRA &= bus->scl_mask_inv;
  result = (INA & bus->sda_mask);
  DIRA |= bus->scl_mask;
  return result != 0;
}

HUBTEXT int i2c_writeByte(i2c *dev, int byte)
{
  int result;
  if(dev->drivescl)
    return i2c_writeByteDrive(dev, byte);
  else
    return i2c_writeBytePullup(dev, byte);
  return result;
}

#else

HUBTEXT int i2c_writeByte(i2c *bus, int byte)
{
  int result;
  int count = 8;

  /* send the byte, high bit first */
  do {
    if (byte & 0x80)
      DIRA &= bus->sda_mask_inv;
    else
      DIRA |= bus->sda_mask;
    scl_high(bus);
    byte <<= 1;
    scl_low(bus);
  } while(--count > 0);
  DIRA &= bus->sda_mask_inv;
  /* get ack */
  scl_high(bus);
  result = (INA & bus->sda_mask);
  scl_low(bus);
  return result != 0;
}
#endif

HUBTEXT int i2c_readByte(i2c *bus, int ackState)
{
  int byte = 0;
  int count = 8;

  DIRA &= bus->sda_mask_inv;

  for (count = 8; --count >= 0; ) {
    byte <<= 1;
    scl_high(bus);
    byte |= (INA & bus->sda_mask) ? 1 : 0;
    while(!(INA & bus->scl_mask));  /* clock stretching */
    /* scl_low(bus); // slow */
    OUTA &= bus->scl_mask_inv;
    DIRA |= bus->scl_mask;
  }

  /* acknowledge */
  if (ackState)
    DIRA &= bus->sda_mask_inv;
  else
    DIRA |= bus->sda_mask;
  scl_high(bus);
  scl_low(bus);

  return byte;
}

HUBTEXT int  i2c_writeData(i2c *bus, const unsigned char *data, int count)
{
  int n  = 0;
  int rc = 0;
  while(count-- > 0) {
    rc |= i2c_writeByte(bus, (int) data[n]);
    if(rc)
      return n;
    n++;
  }
  return n;
}

HUBTEXT int  i2c_readData(i2c *bus, unsigned char *data, int count)
{
  int n = 0;
  while(--count > 0) {
    data[n] = (unsigned char) i2c_readByte(bus, 0);
    n++;
  }
  data[n] = (unsigned char) i2c_readByte(bus, 1);
  return n;
}

HUBTEXT int  i2c_poll(i2c *bus, int devaddr)
{
  int ack = 0;
  i2c_start(bus);
  ack = i2c_writeByte(bus, devaddr);
  return ack;
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

