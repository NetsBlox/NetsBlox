/**
 * @file soundimpact.h
 *
 * @author Andy Lindsay
 *
 * @copyright
 * Copyright (C) Parallax, Inc. 2014. All Rights MIT Licensed.
 *
 * @brief Monitor sound impact occurrences from another cog. @n@n IMPORTANT: This library
 * is only for making monitoring from another cog more convenient.  Your application 
 * does not need this to check the sensor's output state.  For that, all you need is: @n@n
 * int state = input(pin); @n@n The value of pin should be Propeller I/O connected to sensor's 
 * SIG pin.  The sensor returns a 1 to state if an impact is detected, or 0 if not.
 *
 * @par Core Usage
 * Each call to soundImpact_run launches a monitoring loop into another core so that it.
 * track the number of sound impacts during a certain time.  The sensor can also be 
 * monitored without launching another core by simply checking its output state.  See
 * ...Documents/SimpleIDE/Learn/Examples/Devices/Sensor/Sound Impact for examples of both
 * approaches.
 *
 * @par Memory Models
 * Use with CMM or LMM. 
 *
 * @version 0.5
 */
 

#ifndef SOUNDIMPACT_H
#define SOUNDIMPACT_H

#if defined(__cplusplus)
extern "C" {
#endif

#include "simpletools.h"

/**
 * @brief Runs the sound impact tracking process in another cog.
 *
 * @param pin Propeller I/O pin connected to sound impact SIG pin.
 *
 * @returns *processID pointer to process identifier for use with soundImpact_end.
 */
int *soundImpact_run(int pin);


/**
 * @brief End sound impact tracking process and recovers cog and stack memory
 * for other purposes.
 *
 * @param processID process identifier returned by soundImpact_run.
 */
void soundImpact_end(int *processID);


/**
 * @brief Get number of impacts since last call to soundImpact_getCount.
 *
 * @returns number of sound impacts since last call.
 */
int soundImpact_getCount(void);

#if defined(__cplusplus)
}
#endif
/* __cplusplus */ 
#endif
/* SOUNDIMPACT_H */ 


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

