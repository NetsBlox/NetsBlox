/**
 * @file rfidser.h
 *
 * @author Andy Lindsay
 *
 * @copyright
 * Copyright (C) Parallax, Inc. 2014. All Rights MIT Licensed.
 *
 * @brief Simplifies reading Parallax Serial RFID Card Reader.
 *
 * @par Core Usage
 * Each call to rfid_open launches a serial communication process into another core.
 *
 * @par Memory Models
 * Use with CMM or LMM. 
 *
 * @version 0.5
 */


#ifndef RFIDSER_H
#define RFIDSER_H

#if defined(__cplusplus)
extern "C" {
#endif


#include "simpletools.h"
#include "fdserial.h"


/**
 * @cond
 * Defines rfidser interface struct
 * 9 contiguous ints + buffers
 */
typedef struct rfid_struct
{
    int  rx_head;   /* receive queue head */
    int  rx_tail;   /* receive queue tail */
    int  tx_head;   /* transmit queue head */
    int  tx_tail;   /* transmit queue tail */
    int  rx_pin;    /* recieve pin */
    int  tx_pin;    /* transmit pin */
    int  mode;      /* interface mode */
    int  ticks;     /* clkfreq / baud */
    char *buffptr;  /* pointer to rx buffer */
    char *idstr;
    int  en;
} rfid_st;


/**
 * Defines rfidser interface as a text_t type for use with simpletext functions.  
 */
typedef text_t rfidser;

/**
 * @endcond
 */


/**
 * @brief Runs the RFID card reading process in another cog.
 *
 * @param soutPin Propeller I/O pin connected to RFID reader's SOUT pin.
 *
 * @param enablePin Propeller I/O pin connected to RFID reader's /ENABLE pin.
 *
 * @returns Device identifier for use with simpletext, fdserial, and rfidser 
 * library functions.
 */
rfidser *rfid_open(int soutPin, int enablePin);


/**
 * @brief End RFID card monitoring/reading process and recover cog and stack memory
 * for other purposes.
 *
 * @param device device identifier.
 */
void rfidser_close(rfidser *device);


/**
 * @brief Reset the RFID reader.
 *
 * @param *device Device identifier returned by rfid_open.
 */
void rfid_reset(rfidser *device);


/**
 * @brief Disable RFID reading process.  Reader will ignore any cards swiped.
 *
 * @param *device Device identifier returned by rfid_open.
 */
void rfid_disable(rfidser *device);


/**
 * @brief Enable RFID reading process.  Reader will actively scan cards swiped.  
 *
 * @param *device Device identifier returned by rfid_open.
 */
void rfid_enable(rfidser *device);


/**
 * @brief Get RFID code from serial buffer.
 *
 * @param *device Device identifier returned by rfid_open.
 *
 * @param timeoutms number of milliseconds to wait before returning.
 *
 * @returns Pointer to string with RFID address.  Returns "timed out" if no
 * card was scanned before the timeoutms period.
 */
char *rfid_get(rfidser *device, int timeoutms);


#if defined(__cplusplus)
}
#endif
/* __cplusplus */ 
#endif
/* RFIDSER_H */ 


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



