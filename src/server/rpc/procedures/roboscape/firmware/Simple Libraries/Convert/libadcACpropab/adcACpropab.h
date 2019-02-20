/**
 * @file adcACpropab.h
 *
 * @author Andy Lindsay
 *
 * @version 0.85
 *
 * @copyright
 * Copyright (C) Parallax, Inc. 2013. All Rights MIT Licensed.
 *
 * @brief Measure ADC124S021 for signal recording and measurements.  
 * For the voltmeter version, check out the DC version of this library: 
 * adcACpropab.
 *
 * @par Core Usage 
 * A call to adc_start will launch 1 additional core that repeatedly updates ADC
 * measurements. 
 *
 * @par Help Improve this Library
 * Please submit bug reports, suggestions, and improvements to this code to
 * editor@parallax.com.
 */

#ifndef PROPAB_ADC_AC_H
#define PROPAB_ADC_AC_H

#if defined(__cplusplus)
extern "C" {
#endif

#include <stdint.h>

/**
 * @brief structure for exchanging information with cogc program running in other cog.
 */  
typedef struct AdcMailbox 
{
  unsigned int* addr;
  int dout;
  int din;
  int clk;
  int cs;
  int mask;
  int stidx;
} volatile AdcMailbox_st;

/**
 * @brief structure for exchanging information with cogc program running in other cog.
 */  
typedef struct AdcBox 
{
    // uint32_t stack[ADCBOX_STACK];
    AdcMailbox_st mailbox;
} volatile AdcBox_st;

/**
 * @brief Launch A/D converter process into other cog.
 *
 * @detail After you call this function, the adc process will go as fast as it can and
 * store results in an array.  You will have to pass it pin, pattern, and array address
 * parameters.  The pattern is a four-digit binary value that allows you to tell the 
 * process which channels to monitor and update.  The array address is the array where 
 * the ADC process will store the perpetually updated, latest set of measurement results.
 *
 * [b] Propeller Activity Board Example[/b]
 *
 * Propeller Activity Board Example:@n
 * @code
 * 
 * #include "adcPropABac.h"                      // Include adcPropABdc
 *   
 * int adcVal[4];                                // Required by adcPropABac

 * int main()                                    // Main function
 * {
 *   adc_start(19, 18, 20, 21,                   // CS=21, SCL=20, DO=19, DI=18 
 *             0b0101,                           // Ch3 off, 2 on, 1 off, 0 on 
 *             adcVal);                          // Array for measurements
 * ...
 * 
 * @endcode
 *
 * @param csPin, Propeller I/O pin connected to the A/D converter's chip select pin. 
 * @n @n
 * The Propeller chip uses that pin to enable communication with the A/D converter chip.
 * @n@n 
 * This connection is labeled /CS-P21 on the Propeller Activity Board.  In that case
 * Propeller I/O pin P21 is connected to the A/D converter's chip select pin, so you 
 * would use 21 for this parameter.    
 *
 * @param sclPin, Propeller I/O pin connected to the A/D converter's serial clock pin. 
 * @n @n
 * The Propeller chip sends a series of pulses to the A/D converter's SCL pin to drive
 * the conversion and signal to send/recieve binary conversion values.
 * @n@n 
 * This connection is labeled SCL-P20 on the Propeller Activity Board.  In that case
 * Propeller I/O pin P20 is connected to the A/D converter's serial clock pin, so you 
 * would use 20 for this parameter.    
 *
 * @param doPin, Propeller I/O pin connected to the A/D converter's data out pin. 
 * @n @n
 * The A/D converter sends binary values to the controller with this pin.
 * @n@n 
 * This connection is labeled DO-P19 on the Propeller Activity Board.  In that case
 * Propeller I/O pin P19 is connected to the A/D converter's data out pin, so you 
 * would use 19 for this parameter.    
 *
 * @param diPin, Propeller I/O pin connected to the A/D converter's data in pin. 
 * @n @n
 * The Propeller chip sends a channel selection to the A/D converter, and it receives
 * it with this pin.
 * @n@n 
 * This connection is labeled DI-P18 on the Propeller Activity Board.  In that case
 * Propeller I/O pin P18 is connected to the A/D converter's chip data in, so you 
 * would use 18 for this parameter.    
 *
 * @param pattern, Four bit binary number that tells which channels to use update in 
 * the array.  For example, if you only want to monitor channels 2 and 0, use 0b0101.
 * If you instead want to monitor channels 3, and 2, use 0b1100.  
 *
 * @param array, Address of the four int array that will receive the updates.  Channel-3
 * measurement goes into array[3], channel-2 into array[2], and so on.  Regardless of 
 * how many channels you intend to monitor, make sure to declare an in array with four
 * elements.  At the start, the process will store -1 in any slots that the pattern 
 * parameter says not to monitor.  After that, it skips those slots and only updates the
 * array elements that pattern says to monitor.
 */
int adc_start(int doPin, int diPin, int clkPin, int csPin, 
              int pattern, int* arrayAddr);

/**
 * @brief Stop A/D conversion process and free up a cog.
 */
void adc_stop(void);


#if defined(__cplusplus)
}
#endif
/* __cplusplus */  
#endif
/* PROPAB_ADC_AC_H */  

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
