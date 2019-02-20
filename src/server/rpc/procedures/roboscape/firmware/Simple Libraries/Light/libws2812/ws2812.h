/**
 * @file ws2812.h
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

#ifndef __WS2812_H__
#define __WS2812_H__

#include <stdint.h>

#if defined(__cplusplus)
extern "C" {
#endif

#define TYPE_RGB            0
#define TYPE_GRB            1   // for WS2812 and WS2812B

#define COLOR(r, g, b)      (((r) << 16) | ((g) << 8) | (b))
#define SCALE(x, l)         ((x) * (l) / 255)
#define COLORX(r, g, b, l)  ((SCALE(r, l) << 16) | (SCALE(g, l) << 8) | SCALE(b, l))

//                         RRGGBB
#define COLOR_BLACK      0x000000
#define COLOR_RED        0xFF0000
#define COLOR_GREEN      0x00FF00
#define COLOR_BLUE       0x0000FF
#define COLOR_WHITE      0xFFFFFF
#define COLOR_CYAN       0x00FFFF
#define COLOR_MAGENTA    0xFF00FF
#define COLOR_YELLOW     0xFFFF00
#define COLOR_CHARTREUSE 0x7FFF00
#define COLOR_ORANGE     0xFF6000
#define COLOR_AQUAMARINE 0x7FFFD4
#define COLOR_PINK       0xFF5F5F
#define COLOR_TURQUOISE  0x3FE0C0
#define COLOR_REALWHITE  0xC8FFFF
#define COLOR_INDIGO     0x3F007F
#define COLOR_VIOLET     0xBF7FBF
#define COLOR_MAROON     0x320010
#define COLOR_BROWN      0x0E0600
#define COLOR_CRIMSON    0xDC283C
#define COLOR_PURPLE     0x8C00FF

// driver state structure
typedef struct {
    volatile uint32_t command;
    int cog;
} ws2812_t;

// simpler type name for use with SimpleIDE
typedef ws2812_t ws2812;

/**
 * @brief Open a driver for WS2812 chips
 * 
 * @returns A pointer to the driver structure or NULL on failure
 */
ws2812_t *ws2812_open(void);

/**
 * @brief Open a driver for WS2812B chips
 * 
 * @returns A pointer to the driver structure or NULL on failure
 */
ws2812_t *ws2812b_open(void);

/**
 * @brief Close a WS2812 or WS2812B driver
 *
 * @param driver Pointer to the driver structure
 */
void ws2812_close(ws2812_t *driver);

/**
 * @brief Start a driver for WS2812 chips
 *
 * @param driver Pointer to a driver structure
 * @returns Driver COG number or -1 on failure
 */
int ws2812_start(ws2812_t *driver);

/**
 * @brief Start a driver for WS2812B chips
 *
 * @param driver Pointer to a driver structure
 * @returns Driver COG number or -1 on failure
 */
int ws2812b_start(ws2812_t *driver);

/**
 * @brief Load a COG with a driver using custom parameters
 *
 * @param usreset Reset timing (us)
 * @param ns0h 0-bit high timing (ns)
 * @param ns0l 0-bit low timing (ns)
 * @param ns1h 1-bit high timing (ns)
 * @param ns1l 1-bit low timing (ns)
 * @param type color format (either TYPE_RGB or TYPE_GRB)
 * @returns Driver COG number or -1 on failure
 */
int ws_start(ws2812_t *driver, int usreset, int ns0h, int ns0l, int ns1h, int ns1l, int type);

/**
 * @brief Shut down the COG running a driver
 *
 * @param driver Pointer to the driver structure
 */
void ws2812_stop(ws2812_t *driver);

/**
 * @brief Set color pattern on a chain of LEDs
 *
 * @param driver Pointer to the driver structure
 * @param pin Pin connected to the first LED
 * @param colors Array of colors, one for each LED in the chain
 * @param count Number of LEDs in the chain
 */
void ws2812_set(ws2812_t *driver, int pin, uint32_t *colors, int count);

/**
 * @brief Create color from a 0 to 255 position input
 *
 * @details Colors transition red to green to blue.
 *
 * @param pos Position in the color spectrum where 0 is on the red end and 255 is on the blue end
 * @returns Color at the specified position
 */
uint32_t ws2812_wheel(int pos);

/**
 * @brief Create color from a 0 to 255 position input
 *
 * @details Colors transition red to green to blue.
 *
 * @param pos Position in the color spectrum where 0 is on the red end and 255 is on the blue end
 * @param brightness The brightness of the generated color where 0 is off and 255 is full
 * @returns Color at the specified position
 */
uint32_t ws2812_wheel_dim(int pos, int brightness);

#if defined(__cplusplus)
}
#endif

#endif

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
