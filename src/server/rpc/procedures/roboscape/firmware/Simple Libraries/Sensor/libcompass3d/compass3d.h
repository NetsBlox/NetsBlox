/**
 * @file compass3d.h
 *
 * @author Andy Lindsay
 *
 * @version v0.85
 *
 * @copyright
 * Copyright (C) Parallax, Inc. 2013. All Rights MIT Licensed.
 *
 * @brief This library provides convenience 
 * functions for reading measurements from the Parallax Compass Module
 * 3-Axis HMC5883L.
 * @n @n <b><i>CONSTRUCTION ZONE:</i></b> This library is preliminary, major revisions 
 * pending. 
 */

#ifndef COMPASS3D_H
#define COMPASS3D_H

#if defined(__cplusplus)
extern "C" {
#endif

#include "simplei2c.h"
#include "simpletools.h"

/**
 * @brief Initialize the Compass
 *
 * @details This function initializes the compass, but
 * before calling it, you have to set up an I2C bus.  
 * Example: Assuming the your program is using the 
 * simpletools library, you can use:
 *
 *   @code
 *   i2c mybus = i2c_init(sclPin, sdaPin)
 *   @endcode
 *
 * ... where sclPin is the number of the I/O pin
 * connected to the compass module's SCL line and sdaPin
 * is the number of the pin connected to the module's
 * SDA line. 
 *
 * @param I2C bus pointer.  In the example above, the pointer
 * is mybus.  
 *
 * @returns void, but it will display an error message if the
 * compass module does not respond. 
 */
void compass_init(i2c *bus);

/**
 * @brief Read values from compass.
 *
 * @details This function finds a compass on the specified
 * bus, reads its x, y, and z values and loads them into
 * variables that are passed by address.
 *
 * @param *bus A pointer to the I2C bus (mybus in the 
 * example above).
 *
 * @param *px A pointer to a variable to receive the 
 * x-value measurement.
 *
 * @param *py A pointer to a variable to receive the 
 * y-value measurement.
 *
 * @param *pz A pointer to a variable to receive the 
 * z-value measurement.
 *
 * @returns void, but it will display an error message if the
 * compass module does not respond. 
 */
void compass_read(i2c *bus, int *px, int *py, int *pz);

#if defined(__cplusplus)
}
#endif
/* __cplusplus */  
#endif
/* COMPASS3D_H */  

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
