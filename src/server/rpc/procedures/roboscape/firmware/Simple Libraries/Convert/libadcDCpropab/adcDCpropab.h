/**
 * @file adcDCpropab.h
 *
 * @author Andy Lindsay
 *
 * @version 0.85
 *
 * @copyright
 * Copyright (C) Parallax, Inc. 2013. All Rights MIT Licensed.
 *
 * @brief Measure ADC124S021 as either a voltage or a raw, 12-bit5 adc value.  This 
 * library is intended for DC measurements.  For signal measurements, check use the
 * AC version of this library: libadcACpropab
 * 
 */

#ifndef PROPAB_ADC_DC_H
#define PROPAB_ADC_DC_H

#if defined(__cplusplus)
extern "C" {
#endif

#include "simpletools.h"

/**
 * @brief Initialize A/D converter.
 *
 * @detail Call this function once before calling adc_in or adc_volts.  
 * 
 * Propeller Activity Board Example:@n
 * @code
 * 
 * adc_init(21, 20, 19, 18);
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
 */
void adc_init(int csPin, int sclPin, int doPin, int diPin);

/**
 * @brief Get value that corresponds to voltage measurement on one of the A/D converter's
 * input channels.  This number indicates voltage in terms of 4096ths of 5 v.
 *
 * @param channel The A/D converter's input channel, either channel 0, 1, 2, or 3.  
 * Marked A/D 0, 1, 2 or 3 on the Propeller Activity Board.
 *
 * @returns Voltage measurement as a number of 4096ths of 5 V.  
 */
int adc_in(int channel);

/**
 * @brief Get a voltmeter style floating point voltage measurement from one of the A/D 
 * converter's input channels.  
 *
 * @param channel The A/D converter's input channel, either channel 0, 1, 2, or 3.  
 * Marked A/D 0, 1, 2 or 3 on the Propeller Activity Board.
 *
 * @returns Floating point value that represents the voltage measurement.
 */
float adc_volts(int channel);

#if defined(__cplusplus)
}
#endif
/* __cplusplus */  
#endif
/* PROPAB_ADC_DC_H */  

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
