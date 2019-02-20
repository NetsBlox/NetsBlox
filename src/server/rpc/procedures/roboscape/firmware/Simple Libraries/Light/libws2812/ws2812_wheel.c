/**
 * @file ws2812_wheel.c
 *
 * @author Parallax Inc.
 *
 * @version 0.85
 *
 * @copyright
 * Copyright (c) Parallax Inc. 2014, All Rights MIT Licensed.
 *
 * @brief Function to return RGB colors based on an index between 0 and 255.
 */

#include "ws2812.h"

uint32_t ws2812_wheel(int pos)
{
    uint32_t color;

// Creates color from 0 to 255 position input
// -- colors transition r-g-b back to r

    // red range
    if (pos < 85)
        color = COLOR(255-pos*3, pos*3, 0);
    
    // green range
    else if (pos < 170) {
        pos -= 85;
        color = COLOR(0, 255-pos*3, pos*3);
    }
    
    // blue range
    else {
        pos -= 170;
        color = COLOR(pos*3, 0, 255-pos*3);
    }
    
    return color;
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
