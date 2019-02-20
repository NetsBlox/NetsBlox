/**
 * @file abvolts.h
 *
 * @author Andy Lindsay
 *
 * @copyright
 * Copyright (C) Parallax, Inc. 2013. All Rights MIT Licensed.
 *
 * @brief Functions for setting voltages with D/A0, D/A1 outputs and measuring 
 * voltages with A/D0...A/D3 inputs.
 * 
 * @par Core Usage 
 * A call to either da_volts or da_out will launch 1 additional core. 
 * Both functions rely on code running in that additional core.  More calls to 
 * either function will not result in more cores being launched.
 *
 * @par EEPROM Usage
 * da_setupScale writes to addresses 63400..63416. 
 *
 * @par Memory Models
 * Use with CMM or LMM. 
 *
 * @version 0.50
 *
 * @par Help Improve this Library
 * Please submit bug reports, suggestions, and improvements to this code to
 * editor@parallax.com.
 */

#ifndef PROPAB_ABVOLTS_H
#define PROPAB_ABVOLTS_H

#if defined(__cplusplus)
extern "C" {
#endif

#include "simpletools.h"


#ifndef _abvolts_EE_start_
/**
 *
 * @brief abvolts EEPROM calibration data start address.
 */
#define _abvolts_EE_start_ 63400
#endif


#ifndef _abvolts_EE_end_
/**
 *
 * @brief abvolts EEPROM calibration data end address.
 */
#define _abvolts_EE_end_ 63400 + 16
#endif



/**
 * @brief Set output pins for D/A0 and D/A1. 
 *
 * @details If this function is not called, the default is D/A0 = 26 and 
 * D/A1 = 27, which go the D/A0 and D/A1 sockets on the Activity Board.  
 * These sockets can supply current loads while maintaining the output
 * voltage.  Other I/O pins can be used, for LED brightness and other
 * circuits that do not draw current loads.  
 *
 * @param pinDA0 D/A0 pin.
 *
 * @param pinDA1 D/A1 pin.
 */
void da_init(int pinDA0, int pinDA1);


/**
 * @brief Initialize Activity Board A/D converter.
 *
 * @details Call this function once before calling ad_in or ad_volts. 
 * 
 * Propeller Activity Board Example:@n
 * @code
 * 
 * adc_init(21, 20, 19, 18);
 * 
 * @endcode
 * 
 * @param csPin Propeller I/O pin connected to the A/D converter's chip select pin. 
 * @n @n
 * The Propeller chip uses that pin to enable communication with the A/D converter chip.
 * @n@n 
 * This connection is labeled /CS-P21 on the Propeller Activity Board. In that case
 * Propeller I/O pin P21 is connected to the A/D converter's chip select pin, so you 
 * would use 21 for this parameter. 
 *
 * @param sclPin Propeller I/O pin connected to the A/D converter's serial clock pin. 
 * @n @n
 * The Propeller chip sends a series of pulses to the A/D converter's SCL pin to drive
 * the conversion and signal to send/receive binary conversion values.
 * @n@n 
 * This connection is labeled SCL-P20 on the Propeller Activity Board. In that case
 * Propeller I/O pin P20 is connected to the A/D converter's serial clock pin, so you 
 * would use 20 for this parameter. 
 *
 * @param doPin Propeller I/O pin connected to the A/D converter's data out pin. 
 * @n @n
 * The A/D converter sends binary values to the controller with this pin.
 * @n@n 
 * This connection is labeled DO-P19 on the Propeller Activity Board. In that case
 * Propeller I/O pin P19 is connected to the A/D converter's data out pin, so you 
 * would use 19 for this parameter. 
 *
 * @param diPin Propeller I/O pin connected to the A/D converter's data in pin. 
 * @n @n
 * The Propeller chip sends a channel selection to the A/D converter, which receives
 * it with this pin.
 * @n@n 
 * This connection is labeled DI-P18 on the Propeller Activity Board. In that case
 * Propeller I/O pin P18 is connected to the A/D converter's chip data in, so you 
 * would use 18 for this parameter. 
 */
void ad_init(int csPin, int sclPin, int doPin, int diPin);


/**
 * @brief Set D/A voltage (0 to ~3.3 V) on a given channel (0 or 1 for D/A0 or D/A1).  
 * Actual voltage will be the closest match of 256ths of 3.3 V.  
 *
 * @param channel Use for D/A0 or 1 for D/A1.
.*
 * @param daVal floating point number of volts.
 */
void da_volts(int channel, float daVal);


/**
 * @brief Get a voltmeter style floating point voltage measurement from one of the A/D 
 * converter's input channels. 
 * 
 * @param channel The A/D converter's input channel, either channel 0, 1, 2, or 3. 
 * Marked A/D 0, 1, 2 or 3 on the Propeller Activity Board.
 *
 * @returns Floating point value that represents the voltage measurement.
 */
float ad_volts(int channel);


/**
 * @brief Set D/A output.
 *
 * @details Launches process into another cog for up to two channels of D/A conversion
 * on any I/O pin. Other libraries may be available that provide D/A for more channels.
 * Check SimpleIDE/Learn/Simple Libraries/Convert for options. For more options, check
 * obex.parallax.com.
 *
 * This library uses another cog's counter modules (2 per cog) to perform duty modulation,
 * which is useful for D/A conversion. The digital signal it generates will affect LED
 * brightness. The signal can be passed through a low pass RC filter for digital to 
 * analog voltage conversion. Add an op amp buffer if it needs to drive a load.  The D/A0
 * and D/A1 circuits use this type of circuit. 
 *
 * Default resolution is 8 bits for output voltages ranging from 0 V to (255/256) of
 * 3.3 V.
 *
 * General equation is daVal * (3.3 V/2^bits)
 *
 * Default is 8 bits, which results in daVal * (3.3 V/ 256), so daVal
 * specifies the number of 256ths of 3.3 V. You can change the resolution with
 * the da_res function.
 *
 * @param channel Use 0 or 1 to select the cog's CTRA or CTRB counter modules, which
 * are used for D/A conversion.
 * @param daVal Number of 256ths of 3.3 V by default. Use a value from 0 (0 V) 
 * to 255 .
 */
void da_out(int channel, int daVal);


/**
 * @brief Get input value that corresponds to voltage measurement on one of the A/D converter's
 * input channels. This number indicates voltage in terms of 4096ths of 5 V.
 *
 * @param channel The A/D converter's input channel, either channel 0, 1, 2, or 3. 
 * Marked A/D 0, 1, 2 or 3 on the Propeller Activity Board.
 *
 * @returns Voltage measurement as a number of 4096ths of 5 V. 
 */
int ad_in(int channel);


/**
 * @brief Set D/A voltage resolution.
 *
 * @details Default resolution is 8-bits for output voltages ranging from 0 V to (255/256) of
 * 3.3 V.
 *
 * General equation is daVal * (3.3 V/2^bits)
 *
 * Default is 8 bits, which results in daVal * (3.3 V/ 256), so daVal
 * specifies the number of 256ths of 3.3 V.
 *
 * @param bits The D/A converter's resolution in bits.
 */
void da_res(int bits);


/**
 * @brief Set up scale to adjust D/A0 and D/A1.  Connect DA/0 to AD/0 and DA/1 to AD/1 before running.
 * Writes scalars to EEPROM memory.  These scalars can be retrieved with da_getScale();
 *
 * @details Measures high signal to D/A0 and D/A1 and use any difference in 3.3 V signal to set
 * output scalars that are stored in EEPROM.
 */
void da_setupScale(void);


/**
 * @brief Load scale that adjusts D/A0 and D/A1.  If you have not called da_setScale some time
 * in the past, this will not have any affect.
 *
 * @details Retrievels scalars for adjusting D/A outputs from EEPROM and uses them for subsiquent
 * D/A conversions.
 */
void da_useScale(void);


/**
 * @brief Stop the cog that's transmitting the D/A signal(s). 
 *
 * @details Stops any signals, lets go of any I/O pins, and reclaims the cog for
 * other uses. 
 *
 */
void da_stop(void);


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

