/**
 * @file dacctr.h
 *
 * @author Andy Lindsay
 *
 * @version 0.85
 *
 * @copyright
 * Copyright (C) Parallax, Inc. 2013. All Rights MIT Licensed.
 *
 * @brief This file provides convenience functions for digital to analog conversion using 
 * using counter modules (each cog has two).  
 * @n @n Currently supports LMM and CMM memory models.
 *
 * @details The current cog's counters can be used for D/A conversion,
 * or one or more new cogs can be launched, each with two D/A channels.  The output of this
 * type of D/A converter can go straight to an LED circuit for variable brightness, or 
 * to a filter and into an op amp to drive other circuits at certain voltages.  See Propeller
 * Activity Board schematic for an example.  P26 and P27 are connected to a filter, op amp, 
 * and also to LEDs.
 *
 * <b>Example in same cog:</b>
 *
 * @code
 *
 *   dac myDac = dac_setup(3, 0, 8); // P3, channel 0, 8-bits (256ths of 3.3 V)
 *   dac_set(&myDac, 128);           // Voltage to 128/256ths of 3.3 V = 1.65 V
 *
 *   // Call dac_set whenever you want to change the voltage
 * @endcode
 *
 * @par Core Usage 
 * A call to either dac_start will launch 1 additional core that repeatedly
 * updates DAC outputs. 
 *
 * <b>Example in another cog:</b>
 *
 * @code
 *
 *   // P4, channel 0, 10-bits (1024ths of 3.3 V).
 *   dac cogDac = dac_setup(4, NEW_COG, 10);
 *
 *   // Optionally, pre-set the voltage (to 256/1024ths of 3.3 V = 0.825 V).
 *   dac_set(&cogDac, 256);
 *
 *   // Set aside memory for the processor.
 *   dacmem mem;
 *
 *   // Launch the process (we are using just one of the two available channels here).
 *   // In another cog, you have to specify the sampling rate.  We are using 44100.
 *   int myCog = dac_start(mem, 44100, &cogDac, NULL);
 *
 *  @endcode
 *
 * @par Help Improve this Library
 * Please submit bug reports, suggestions, and improvements to this code to
 * editor@parallax.com.
 */

#ifndef DACCTR_H
#define DACCTR_H

#if defined(__cplusplus)
extern "C" {
#endif

#include "simpletools.h"

#ifndef DUTY_SE
#define DUTY_SE (6 << 26)
#endif

#ifndef NEW_COG
#define NEW_COG 2
#endif

//extern int dacCtrBits;
 
typedef struct DacControl
{
  volatile int daCog;
  volatile int daPin;
  volatile int daBitX;
  volatile int daCh;  
  volatile int daCtr;
  volatile int daVal;
} dac;


typedef struct DacAddr
{
  volatile unsigned int daDt;
  dac* da0;
  dac* da1;
} daca;


typedef struct DacCogMemory
{
  unsigned int stack[44 + 20];
} dacmem;

/**
 * @brief Configure an I/O pin to set a voltage with digital to analog (D/A) conversion.
 *
 * @details Sets up a dac structure for you.  You can then pass the address of this dac
 * structure to other functions (like dac_set and/or dac_start) do things like set voltages
 * or launch other cogs to perform D/A conversion.  The technique this library uses is 
 * called duty modulation, and each D/A channel uses one of a cog's two counter modules.  If
 * you need to launch more than one D/A channel, you can use the dac structure this function
 * returns in a call to dac_start to launch the D/A process into another cog.
 *
 * @param pin Number of the I/O pin to perform D/A conversion.
 *
 * @param channel Use 0 for the cog's CTRA or 1 for the cog's CTRB counter module.  You can
 * also use NEW_COG if you are going to use dac_start.  
 *
 * @param bits The resolution of your D/A converter in bits.  If you set it to 8, you will
 * be able to set voltages in terms of 256ths of 3.3 V, from 0 to 255. If you set it to 10, 
 * you will be able to set voltages in terms of the number of 1024ths of 3.3 V.  More 
 * generally, the fraction of 3.3 V is 2^bits.   
 *
 * @returns dac structure that you can pass by address to other functions for updating the
 * output or launching into another cog.  See examples at top of this file.
 */
dac dac_setup(int pin, int channel, int bits);

/**
 * @brief Set the D/A converter's output.  
 *
 * @details After a call to dac_setup, you can use the dac structure it returns to set the
 * D/A converter's voltage.  Again, see examples at the top of this file.
 *
 * @param da The pointer to the dac structure that dac_setup function returned.  
 *
 * @param value The output value for the D/A converter.  (Like the number of 256ths of 3.3 V
 * if you set up an 8-bit D/A converter with dac_setup.
 */
void dac_set(dac* da, int value);

/**
 * @brief Clear a D/A converter that's running in the same cog and reclaim the I/O pin and
 * counter module for other uses.
 *
 * @param dac Structure corresponding to the I/O pin that's sending the dac signal you
 * want to close.
 */
void dac_close(dac* da);

/**
 * @brief Start D/A converter in new cog that sets voltages on either one or two pins.
 *
 * @details Launches up to two D/A converters in a new cog.  Example included near the top
 * of this file.
 *
 * @param mem A dacmem structure that you initialize with dacmem myStructureName;
 *
 * @param sampleRate The sample rate you want the dac to update values at.  Top speed is
 * 46 kHz, 44.1 kHz is recommended.
 *
 * @param da0 Address of the dac structure the cog's channel 0 will run.  If you do
 * not want to use this channel, pass NULL.
 *
 * @param da1 Address of the dac structure the cog's channel 1 will run.  If you do
 * not want to use this channel, pass NULL.
 *
 * @returns dac cog ID, the number of the cog the process was launched into.  You can save 
 * this in case you want to use dac_stop to shut down the cog later.
 */
int dac_start(dacmem mem, int sampleRate, dac* da0, dac* da1);

/**
 * @brief Stops a dac cog and frees up a cog and all its resources for other uses.
 *
 * @param cogid The dac cog's ID that dac_start returned.
 */
int dac_stop(int cogid);

#if defined(__cplusplus)
}
#endif
/* __cplusplus */  
#endif
/* DACCTR_H */  

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
