/**
 * @file vgatext.h
 *
 * @author Steve Denson
 *
 * @copyright
 * Copyright (C) Parallax Inc. 2014. All Rights MIT Licensed, see end of file.
 *
 * @brief VGA_Text native device driver interface.
 *
 * @par Core Usage 
 * A call to vgatext_open will launch 1 additional core that supplies signaling 
 * necessary for displaying text with a VGA display. 
 *
 * @par Memory Models
 * Use with CMM or LMM. 
 *
 * @version v0.90 
 *
 * @note Currently setting individual character foreground/background
 * colors does not work. Setting a screen palette is OK with
 * setColorPalette(&gpalette[VGA_TEXT_PAL_MAGENTA_BLACK]);
 *
 * @par Help Improve this Library
 * Please submit bug reports, suggestions, and improvements to this code to
 * editor@parallax.com.
 */
 
#ifndef __VGATEXT_H
#define __VGATEXT_H

#ifdef __cplusplus
extern "C"
{
#endif

#include "simpletext.h"

/*
 * This defines vgatext as a type alias to text_t
 * Spelling is choice of Parallax education, not the author.
 */
typedef text_t vgatext;

/**
 * @brief vgatext color indices
 */
#define VGA_TEXT_WHITE_BLUE     0
#define VGA_TEXT_YELLOW_BROWN   1
#define VGA_TEXT_MAGENTA_BLACK  2
#define VGA_TEXT_GREY_WHITE     3
#define VGA_TEXT_CYAN_DARKCYAN  4
#define VGA_TEXT_GREEN_WHITE    5
#define VGA_TEST_RED_PINK       6
#define VGA_TEXT_CYAN_BLUE      7

#define VGA_TEXT_COLORS 8

/**
 * VGA_Text palette color indices
 */
#define VGA_TEXT_PAL_WHITE_BLUE     0
#define VGA_TEXT_PAL_YELLOW_BROWN   2
#define VGA_TEXT_PAL_MAGENTA_BLACK  4
#define VGA_TEXT_PAL_GREY_WHITE     6
#define VGA_TEXT_PAL_CYAN_DARKCYAN  8
#define VGA_TEXT_PAL_GREEN_WHITE    10
#define VGA_TEST_PAL_RED_PINK       12
#define VGA_TEXT_PAL_CYAN_BLUE      14


/**
 * Color table size.
 * Table holds foreground and background info, so size is 2 x table colors.
 */
#define VGA_TEXT_COLORTABLE_SIZE 8*2

/**
 * Column count
 */
#define  VGA_TEXT_COLS 30

/**
 * Row count
 */
#define  VGA_TEXT_ROWS 14

/**
 * Screen size count
 */
#define  VGA_TEXT_SCREENSIZE (VGA_TEXT_COLS * VGA_TEXT_ROWS)

/**
 * Last row position count
 */
#define  VGA_TEXT_LASTROW (VGA_TEXT_SCREENSIZE-VGA_TEXT_COLS)

/**
 * Status enumeration
 */
typedef enum {
    VGA_TEXT_STAT_DISABLED,
    VGA_TEXT_STAT_INVISIBLE,
    VGA_TEXT_STAT_VISIBLE
} vgaTextStat_t;

/**
 * Control structure
 */
typedef struct _vga_text_struct
{
    long status    ; // 0/1/2 = off/visible/invisible      read-only   (21 longs)
    long enable    ; // 0/non-0 = off/on                   write-only
    long pins      ; // %pppttt = pins                     write-only
    long mode      ; // %tihv = tile,interlace,hpol,vpol   write-only
    long screen    ; // pointer to screen (words)          write-only
    long colors    ; // pointer to colors (longs)          write-only            
    long ht        ; // horizontal tiles                   write-only
    long vt        ; // vertical tiles                     write-only
    long hx        ; // horizontal tile expansion          write-only
    long vx        ; // vertical tile expansion            write-only
    long ho        ; // horizontal offset                  write-only
    long vo        ; // vertical offset                    write-only
    long hd        ; // horizontal display ticks           write-only
    long hf        ; // horizontal front porch ticks       write-only
    long hs        ; // horizontal sync ticks              write-only
    long hb        ; // horizontal back porch ticks        write-only
    long vd        ; // vertical display lines             write-only
    long vf        ; // vertical front porch lines         write-only
    long vs        ; // vertical sync lines                write-only
    long vb        ; // vertical back porch lines          write-only
    long rate      ; // tick rate (Hz)                     write-only
    char *palette  ; // color palette
} vgatextdev_t;

/*
 * Starts VGA on a cog
 * @param basepin is first pin number (out of 8) connected to VGA
 * param clockrate is the clockrate defined for the platform.
 * @returns non-zero cogid on success
 */
int     vgatext_start(volatile vgatextdev_t* vga, int basepin);

/*
 * VGA_Text stop function stops VGA cog
 * @param id is cog id returned from start function.
 */
void    vgatext_stop(int id);

/*
 * VGA_Text public API
 */

/**
 * @brief Open a VGA connection.  This function launches VGA driver 
 * code into the next available cog.
 *
 * @param basepin can be 0, 8, 16, or 24, which correspond to base pins of 
 * P0, P8, or P16 or P24.  The basepin should be connected to VGA V, basepin + 
 * 1 to VGA H, and so on...  Here is the full connection list.
 *
 * basepin   Connected to
 *  + 7           R1 @n
 *  + 6           R0 @n
 *  + 5           G1 @n
 *  + 4           G0 @n
 *  + 3           B1 @n
 *  + 2           B0 @n
 *  + 1           H  @n
 *  + 0           V  @n
 *
 * @returns vgatext identifier.  It's the address that gets copied to a 
 * pointer variable, which is passed as an identifier to simpletext functions 
 * with text_t *dev parameters and/or vgatext functions with vgatext *vga parameters.
 */
vgatext *vgatext_open(int basepin);

/**
 * @brief Close VGA connection, stop and recover cog running 
 * VGA code and memory that was allocated.
 *
 * @param *device value that was returned by vgatext_open.
 */
void    vgatext_close(vgatext *device);

/**
 * @brief Prints a character at current cursor position or performs
 * a screen function based on the following table: 
 *
 *    0 = clear screen @n
 *    1 = home @n
 *    8 = backspace @n
 *    9 = tab (8 spaces per) @n
 *    10 = set X position (X follows) @n
 *    11 = set Y position (Y follows) @n
 *    12 = set color (color follows) @n
 *    13 = return @n
 *    16 = clear screen @n
 *  others = printable characters @n
 *
 * @param c char to print.
 */
int     vgatext_out(int c);

/**
 * @brief Print character to screen.
 *
 * @param *vga the device identifier
 * @param c is character to print
 */
int    vgatext_putchar(vgatext *vga, int c);

/**
 * @brief sets the palette using a character array.  This overrides
 * the default color palette.  
 *
 * @details Each custom color palette is defined in a byte with values 
 * of r, g, and b that can range from 0 to 3, and are packed as follows:@n
 * 
 * Example: Set color palette 0 foreground to r = 1, g = 2, b = 3 and background 
 * to r = 3, b = 0, and g = 1.  Also set color palette 1's foreground with color
 * palette 0's background and vice-versa.
 * 
 * char custom[16];
 * 
 * custom[0] = (1 << 4) | (2 << 2) | 3;  // Foreground 0 @n
 * custom[1] = (3 << 4) | (0 << 2) | 1;  // Background 0 @n
 * custom[2] = (3 << 4) | (0 << 2) | 1;  // Foreground 1 @n
 * custom[3] = (1 << 4) | (2 << 2) | 3;  // Background 1 @n
 * // ...etc up to custom[15] for background 7           @n
 *
 * @param palette is a char array[16].
 */
void    vgatext_setColorPalette(char* palette);

/**
 * @brief Clear the VGA display. 
 */
void vgatext_clear(void);

/**
 * @brief Send cursor to top-left home position. 
 */
void vgatext_home(void);


/**
 * @brief Clear to end of line, then place cursor after the last
 * character printed on the line. 
 */
void vgatext_clearEOL(void);


/**
 * @brief Set position to x rows and y columns from top-left. 
 *
 * @param x columns from left.
 *
 * @param y rows from top.
 */
void    vgatext_setXY(int x, int y);

/**
 * @brief Set cursor to x columns from left.  
 *
 * @param x columns from left
 */
void    vgatext_setX(int x);

/**
 * @brief Set cursor to y rows from top.  
 *
 * @param y rows from top
 */
void    vgatext_setY(int y);

/**
 * @brief Set cursor position to Cartesian x, y from bottom-left.
 *
 * @param x is column counted from left.
 *
 * @param y is row counted from bottom.
 */
void    vgatext_setCoordPosition(int x, int y);

/**
 * @brief get cursor's column position.
 *
 * @returns columns from left.  
 */
int vgatext_getX(void);

/**
 * @brief Get cursor's row position.
 *
 * @returns rows from top.
 */
int vgatext_getY(void);

/**
 * @brief Set palette color index.
 *
 * @param value is a color set index number 0 .. 7
 * See vgatext color indices.
 */
void vgatext_setColors(int value);

/**
 * @brief Get palette color index
 *
 * @returns number representing color set index
 * See vgatext color indices.
 */
int vgatext_getColors(void);

/**
 * @brief Get screen width.
 *
 * @returns Screen column count.
 */
int vgatext_getColumns(void);

/**
 * @brief Get screen height.
 * @returns Screen row count.
 */
int vgatext_getRows(void);

#ifdef __cplusplus
}
#endif

#endif
//__VGATEXT_H


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

