/**
 * @file sirc.h
 *
 * @author Andy Lindsay
 *
 * @version 0.86
 *
 * @copyright
 * Copyright (C) Parallax, Inc. 2013. All Rights MIT Licensed.
 *
 * @brief Decode SONY IR remote signals.
 *
 * @details: Source document: 
 * http://www.sbprojects.com/knowledge/ir/sirc.php
 */

#ifndef SONY_REMOTE_H
#define SONY_REMOTE_H

#if defined(__cplusplus)
extern "C" {
#endif


/**
 * @brief ENTER constant value 11 corresponds to ENTER key.
 */
#ifndef ENTER
#define ENTER  11
#endif

/**
 * @brief CH_UP constant value 16 corresponds to channel up key.
 */
#ifndef CH_UP
#define CH_UP  16
#endif

/**
 * @brief CH_DN constant value 17 corresponds to channel down key.
 */
#ifndef CH_DN
#define CH_DN  17
#endif

/**
 * @brief VOL_UP constant value 18 corresponds to volume up key.
 */
#ifndef VOL_UP
#define VOL_UP 18
#endif

/**
 * @brief VOL_DN constant value 19 corresponds to volume down key.
 */
#ifndef VOL_DN
#define VOL_DN 19
#endif

/**
 * @brief MUTE constant value 20 corresponds to mute key.
 */
#ifndef MUTE
#define MUTE   20
#endif

/**
 * @brief PWR constant value 21 corresponds to power key.
 */
#ifndef PWR
#define PWR    21
#endif

/**
 * @brief PREV_CH constant value 59 corresponds to previous channel key.
 */
#ifndef PREV_CH
#define PREV_CH 59
#endif

/**
 * @brief ARROW_UP constant value 53 corresponds to the upward pointing 
 * arrow key.
 */
#ifndef ARROW_UP
#define ARROW_UP 53
#endif

/**
 * @brief ARROW_DN constant value 54 corresponds to the downward pointing
 * arrow key.
 */
#ifndef ARROW_DN
#define ARROW_DN 54
#endif

/**
 * @brief ARROW_L constant value 52 corresponds to the left pointing arrow
 * key.
 */
#ifndef ARROW_L
#define ARROW_L 52
#endif

/**
 * @brief ARROW_R constant value 51 corresponds to the right pointing arrow 
 * key.
 */
#ifndef ARROW_R
#define ARROW_R 51
#endif

#include "simpletools.h"                      // Include simple tools

/**
 * @brief Set the time limit to wait for a SONY IR remote packet.
 *
 * @param ms The number of milliseconds to wait.
 */
void sirc_setTimeout(int ms);

/**
 * @brief Report the SONY IR remote button pressed.  Removes device
 * identifying information from the packet and just returns the 
 * value of the button.
 *
 * @param pin Number of the I/O pin connected to IR receiver.
 *
 * @returns key value.
 */
int sirc_button(int pin);

/**
 * @brief Report the SONY device the IR remote is sending codes to.  
 * Device examples include TV (1), VCR 1 (2), and projector (20).
 *
 * @param pin Number of the I/O pin connected to IR receiver.
 *
 * @returns device value.
 */
int sirc_device(int pin);

/**
 * @brief Return the entire IR packet value.  Does not strip .
 *
 * @param pin Number of the I/O pin connected to IR receiver.
 *
 * @param bits Number of bits to retrieve (up to 12).
 *
 * @returns IR message packet value.
 */
int sirc_code(int pin, int bits);

#if defined(__cplusplus)
}
#endif
/* __cplusplus */ 
#endif
/* SONY_REMOTE_H */ 

/*
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

