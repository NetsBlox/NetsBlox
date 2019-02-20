/**
 * @file mstimer.h
 *
 * @author Andy Lindsay
 *
 * @version 0.86
 *
 * @copyright
 * Copyright (C) Parallax, Inc. 2013. All Rights MIT Licensed.
 *
 * @brief Tracks milliseconds elapsed in another cog.  This is part of
 * a tutorial on adding a Simple Library to the project.
 *
 * @par Core Usage 
 * A call to mstime_start will launch 1 additional core.  Additional calls to
 * mstime_start will only shut down and then re-launch the process, but will not
 * take additional cores.
 *
 * @par Memory Models
 * Use with CMM or LMM. 
 *
 * @version
 * 0.5
 *
 * @par Help Improve this Library
 * Please submit bug reports, suggestions, and improvements to this code to
 * editor@parallax.com.
 */

 

#ifndef MSTIMER_H
#define MSTIMER_H

#if defined(__cplusplus)
extern "C" {
#endif

#include "simpletools.h"                      

/**
 * @brief Start the millisecond timer.
 *
 * @returns Nonzero if success, 0 if no cogs available.
 */
int mstime_start();

/**
 * @brief Stop the millisecond timer and free up a cog.
 */
void mstime_stop();

/**
 * @brief Get milliseconds since call to start.
 *
 * @returns Number of milliseconds elapsed.
 */
int mstime_get();

/**
 * @brief Reset the millisecond time elapsed to zero.
 */
void mstime_reset();

/**
 * @brief Set the millisecond timer.
 *
 * @param newTime New millisecond time value that timer should start 
 * counting from.
 */
void mstime_set(int newTime);

#if defined(__cplusplus)
}
#endif
/* __cplusplus */ 
#endif
/* MSTIMER_H */ 

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


