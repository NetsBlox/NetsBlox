/*
 * @file ws2812.c
 *
 * @author Parallax Inc.
 *
 * @version 0.85
 *
 * @copyright
 * Copyright (c) Parallax Inc. 2014, All Rights MIT Licensed.
 *
 * @brief Driver for WS2812 and WS2812B RGB LEDs.
 */

#include <propeller.h>
#include "ws2812.h"

// driver header structure
typedef struct {
    uint32_t    jmp_inst;
    uint32_t    resettix;
    uint32_t    bit0hi;
    uint32_t    bit0lo;
    uint32_t    bit1hi;
    uint32_t    bit1lo;
    uint32_t    swaprg;
} ws2812_hdr;

// -- usreset is reset timing (us)
// -- ns0h is 0-bit high timing (ns)
// -- ns0l is 0-bit low timing (ns)
// -- ns1h is 1-bit high timing (ns)
// -- ns1l is 1-bit low timing (ns)
// -- type is TYPE_GRB for ws2812 or ws2812b
int ws_start(ws2812_t *state, int usreset, int ns0h, int ns0l, int ns1h, int ns1l, int type)
{
    extern uint32_t binary_ws2812_driver_dat_start[];
    ws2812_hdr *hdr = (ws2812_hdr *)binary_ws2812_driver_dat_start;
    uint32_t ustix;
    
    ustix = CLKFREQ / 1000000;          // ticks in 1us

    hdr->resettix = ustix * usreset;
    hdr->bit0hi   = ustix * ns0h / 1000;
    hdr->bit0lo   = ustix * ns0l / 1000;
    hdr->bit1hi   = ustix * ns1h / 1000;
    hdr->bit1lo   = ustix * ns1l / 1000;
    hdr->swaprg   = (type == TYPE_GRB);
    
    state->command = 0;
    state->cog = cognew(hdr, &state->command);
    
    return state->cog;
}

void ws2812_set(ws2812_t *state, int pin, uint32_t *colors, int count)
{
    uint32_t cmd;
    cmd =  pin
        | ((count - 1) << 8)
        | ((uint32_t)colors << 16);
    while (state->command)
        ;
    state->command = cmd;
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
