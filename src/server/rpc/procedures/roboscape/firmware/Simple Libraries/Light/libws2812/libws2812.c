/*
 * @file libws2812.c
 *
 * @author Parallax Inc.
 *
 * @version 0.85
 *
 * @copyright
 * Copyright (c) Parallax Inc. 2014, All Rights MIT Licensed.
 *
 * @brief Test program for WS2812 RGB LED driver.
 */

#include <propeller.h>
#include "ws2812.h"

// led chain
#define LED_PIN     13
#define LED_COUNT   4

// 4 Parallax WS2812B Fun Boards
uint32_t ledColors[LED_COUNT];

// LED driver state
ws2812 *driver;

// pattern for chase
uint32_t pattern[] = {
    COLOR_RED,
    COLOR_ORANGE,
    COLOR_YELLOW, 
    COLOR_GREEN,
    COLOR_BLUE,
    COLOR_INDIGO
};

#define pattern_count  (sizeof(pattern) / sizeof(pattern[0]))

// ticks per millisecond
int ticks_per_ms;

// forward declarations
void alternate(int count, int delay);
void chase(int count, int delay);
void pause(int ms);

void main(void)
{
    // calibrate the pause function
    // CLKFREQ is the clock frequency of the processor
    // typically this is 80mhz
    // dividing by 1000 gives the number of clock ticks per millisecond
    ticks_per_ms = CLKFREQ / 1000;
    
    // load the LED driver
    if (!(driver = ws2812b_open()))
        return;
        
    // repeat the patterns
    for (;;) {
    
        // alternate inner and outer colors
        alternate(8, 500);
        
        // chase
        chase(32, 200);
    }
    
    // close the driver
    ws2812_close(driver);
}

void alternate(int count, int delay)
{
    // start with the outer two LEDs green and the inner two red
    ledColors[0] = COLOR_GREEN;
    ledColors[1] = COLOR_RED;
    ledColors[2] = COLOR_RED;
    ledColors[3] = COLOR_GREEN;

    // repeat count times or forever if count < 0
    while (count < 0 || --count >= 0) {
    
        // swap the inner and outer colors
        ledColors[0] = ledColors[1];
        ledColors[1] = ledColors[3];
        ledColors[2] = ledColors[3];
        ledColors[3] = ledColors[0];
    
        // Set LEDs in the chain
        ws2812_set(driver, LED_PIN, ledColors, LED_COUNT);
            
        // delay between frames
        pause(delay);
    }
}

// the chase effect was translated from Spin code by Jon McPhalen
void chase(int count, int delay)
{
    int base = 0;
    int idx, i;
    
    // repeat count times or forever if count < 0
    while (count < 0 || --count >= 0) {
    
        // fill the chain with the pattern
        idx = base;                             // start at base
        for (i = 0; i < LED_COUNT; ++i) {       // loop through connected leds
            ledColors[i] = pattern[idx];        // Set channel color
            if (++idx >= pattern_count)              // past end of list?
                idx = 0;                        // yes, reset
        }
        if (++base >= pattern_count)            // Set the base for the next time
            base = 0;
    
        // Set LEDs in the chain
        ws2812_set(driver, LED_PIN, ledColors, LED_COUNT);
            
        // delay between frames
        pause(delay);
    }
}

void pause(int ms)
{
    waitcnt(CNT + ms * ticks_per_ms);
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
