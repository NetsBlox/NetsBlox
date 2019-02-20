/**
 * @file ws2812_open.c
 *
 * @author Parallax Inc.
 *
 * @version 0.85
 *
 * @copyright
 * Copyright (c) Parallax Inc. 2014, All Rights MIT Licensed.
 *
 * @brief Open a driver for WS2812 devices.
 */

#include <stdlib.h>
#include "ws2812.h"

ws2812_t *ws2812_open(void)
{
    ws2812_t *state;
    
    // allocate a driver state structure
    if (!(state = (ws2812_t *)malloc(sizeof(ws2812_t))))
        return NULL;
        
    // start the driver
    if (ws2812_start(state) < 0) {
        free(state);
        return NULL;
    }
    
    // return the driver state
    return state;
}

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
