/**
 * @file simplei2c.h
 *
 * @version 0.85
 *
 * @copyright
 * Copyright (c) 2013, Parallax Inc. All Rights MIT Licensed.
 *
 * @brief Provides simple i2c start, stop, read, and write functions.
 * See simpletools library for additional I2C functions.
 *
 * Copyright (c) 2013, Parallax Inc.
 */
#ifndef __i2c_H
#define __i2c_H

#ifdef __cplusplus
extern "C"
{
#endif

#include <propeller.h>


typedef struct i2c_st
{
  volatile int scl_mask;
  volatile int scl_mask_inv;
  int sda_mask;
  int sda_mask_inv;
  int drivescl;  /* flag to force scl if non-zero */
} i2c;

/**
 * @brief Open an i2c device.
 * @param [in] *bus is a pointer to an i2c storage variable.
 * @param sclPin is the number of the Propeller I/O pin connected to the 
 * I2C bus' SCL line.  
 * @param sdaPin is the number of the Propeller I/O pin connected to the 
 * I2C bus' SDA line.  
 * @param sclDrive says drive SCL (1) or not (0).  No SCL drive is by far
 * the most common arrangement.  Some Propeller boards do not apply a pull-
 * up resistor to the EEPROM's SCL line, and driving the SCL pin is useful
 * in for communicating with EEPROMs on those particular boards.  
 * @return Copy of the bus address.
 */
HUBTEXT i2c *i2c_open(i2c *bus, int sclPin, int sdaPin, int sclDrive);

/**
 * @brief Signal i2c start condition on bus.
 *
 * @param *bus is the bus pointer returned by i2c_open.
 */
HUBTEXT void i2c_start(i2c *bus);

/**
 * @brief Send Signal i2c stop condition on bus.
 *
 * @param *bus is the bus pointer returned by i2c_open.
 */
HUBTEXT void i2c_stop(i2c *bus);

/**
 * @brief Send i2c byte and return acknowledgement from device.  Does not
 *  set start or stop.  
 *  Drives SCL line if i2c device opened using sclDrive = 1.
 *
 * @param *bus is the bus pointer returned by i2c_open.
 * @param byte is the data byte the Propeller chip sends to the I2C device.
 * @returns Acknowledge bit value (ACK = 0) or no-acknowledge (NACK = 1) 
 *  from receiving device.
 */
HUBTEXT int  i2c_writeByte(i2c *bus, int byte);

/**
 * @brief Receive i2c byte and reply with ack state. Does not set start or stop.
 * Drives SCL line if i2c device opened using sclDrive = 1.
 *
 * @param *bus is the bus pointer returned by i2c_open.
 * @param ackState sets or clears the acknowledge bit that follows the
 *  data byte in I2C. Acknowledge is ACK = 0, and no-acknowledge (NACK = 1). 
 * @returns The byte Propeller chip reads from I2C device.
 */
HUBTEXT int  i2c_readByte(i2c *bus, int ackState);

/**
 * @brief Send a block of i2c data. Does not set start or stop.
 *
 * If the device replies with NACK after receiving a particular data byte, 
 * the transmit will terminate.  
 * Drive scl if i2c device opened using sclDrive.
 *
 * @param *bus is the bus pointer returned by i2c_open.
 * @param *data is a pointer to the array of data to send.  
 * @param count is the number of bytes to send.
 * @returns the number of bytes sent (including address byte).
 */
HUBTEXT int  i2c_writeData(i2c *bus, const unsigned char *data, int count);

/**
 * @brief Receive a block of i2c data. Does not send start or stop conditions.
 *
 * The Propeller replies with ACK after each byte received.  After the last byte, 
 * it replies with NACK to tell the I2C device that it's done receiving bytes.  
 *
 * Drive scl if i2c device opened using sclDrive.
 *
 * @param *bus is the bus pointer returned by i2c_open.
 * @param data is a pointer to an array of unsigned char bytes.
 * @param count is the number of bytes to receive.
 * @returns the number of bytes sent.
 */
HUBTEXT int  i2c_readData(i2c *bus, unsigned char *data, int count);

/**
 * @brief Send i2c start and addr byte. Looks for ACK (0) or NACK (1).
 * This is useful for checking if a device is responding or
 * starting a new i2c packet.  No stop is sent.  
 *
 * @param *bus is the bus pointer returned by i2c_open.
 * @param addr is the I2C device address.
 * @returns (ACK = 0_ if device has responded.
 */
HUBTEXT int  i2c_poll(i2c *bus, int addr);

#ifdef __cplusplus
}
#endif

#endif
/* __i2c_H */

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
