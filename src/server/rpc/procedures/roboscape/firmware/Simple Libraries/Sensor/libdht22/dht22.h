/**
 * @file dht22.h
 *
 * @author Matthew Matz
 *
 * @version 0.6
 *
 * @copyright
 * Copyright (C) Parallax, Inc. 2017. All Rights MIT Licensed.
 *
 * @brief This Propeller C library was created for the DHT22 temperature 
 * and humidity sensor module.
 */


#ifndef  __DHT22_SENSOR_H__                                  // Prevents duplicate
#define  __DHT22_SENSOR_H__                                  // declarations

#if defined(__cplusplus)                                     // If compiling for C++
extern "C" {                                                 // Compile for C
#endif


// Units of temperature
#ifndef  CELSIUS 
#define  CELSIUS            0
#endif

#ifndef  FAHRENHEIT 
#define  FAHRENHEIT         1
#endif

#ifndef  KELVIN 
#define  KELVIN             2
#endif


/**
 * @brief Triggers a reading of the temperature and relative humidity from the sensor module.
 *
 * @details This function instructs the temperature and humidity sensor module  
 * to take a reading.  
 *
 * @note The sensor can be read every 500ms.  If this function is called
 * before 500ms from the previous call has elapsed, the function waits unless the
 * dht22_set_timeout_ignore() function was used to instruct modules on that pin to
 * ignore the 0.5 second minimum timeout.
 * 
 * @param dht_pin defines which Propeller MCU I/O pin the sensor is attached to.  
 * Requires a 10 kOhm pullup resistor to 3.3V when connecting to the Propeller MCU.
 *
 * @returns 1 if a valid checksum was recieved, 0 if the checksum is invalid.
 */

char dht22_read(int dht_pin);


/**
 * @brief The function is used to set or clear an ignore timeout instruction for
 * modules connected to the specified pin.
 *
 * @param dht_pin defines which pin the sensor is attached to.
 *
 * @param ignore_timeout when true (1), the function instructs the Propeller MCU to
 * ignore the protective timeout that prevents the sensor from being read before 
 * it is ready.  This parameter is set to false (0) by default.
 */

void dht22_set_timeout_ignore(int dht_pin, char ignore_timeout);


/**
 * @brief Retrieves the last temperature reading made by the dht22_read() function.
 *
 * @param temp_units allows the temperature unit to be specified in (0) Celsius,
 * (1) Fahrenheit, or (2) Kelvin.
 *
 * @returns the temperature read in degree-tenths of the unit specified.
 */

int dht22_getTemp(char temp_units);


/**
 * @brief Retrieves the last humidity reading made by the dht22_read() function.
 *
 * @returns the last relative humidity read in tenths of a percent.
 */

int dht22_getHumidity();



#if defined(__cplusplus)                     
}                                             // End compile for C block
#endif
/* __cplusplus */

#endif                                        // End prevent duplicate forward
/* __DHT22_SENSOR_H__ */                      // declarations block 


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