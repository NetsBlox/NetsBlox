/**
* @file ping.h
*
* @author Andy Lindsay
*
* @version 0.85
*
* @copyright
* Copyright (C) Parallax, Inc. 2012. All Rights MIT Licensed.
*
* @brief Measure Ping))) Ultrasonic Distance Sensor values in cm, inches, 
* or microsecond echo return times.
*/

#ifndef PING_H
#define PING_H

#if defined(__cplusplus)
extern "C" {
#endif

#include "simpletools.h"

/**
* @brief Measure echo time in terms of Propeller system clock
* ticks.
*
* @param pin Number of the I/O pin to set to connected to the
* Ping))) sensor's SIG line.
*
* @returns the number of clock ticks it took for the Ping)))'s
* echo to return to it.
*/
int ping(int pin);

/**
* @brief Report Ping))) measurement as a centimeter distance.
*
* @param pin Number of the I/O pin to set to connected to the
* Ping))) sensor's SIG line.
*
* @returns measured centimeter distance.
*/
int ping_cm(int pin);

/**
* @brief Report Ping))) measurement as an inch distance.
*
* @param pin Number of the I/O pin to set to connected to the
* Ping))) sensor's SIG line.
*
* @returns measured inch distance.
*/
int ping_inches(int pin);

#if defined(__cplusplus)
}
#endif
/* __cplusplus */ 
#endif
/* PING_H */ 

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

