/*
 * vgatext.c
 * VGA_Text native device driver interface.
 *
 * Copyright (c) 2013, Parallax Inc
 * Written by Steve Denson
 * See end of file for terms of use.
 */
#include <stdlib.h>
#include <string.h>
#include <propeller.h>

#include "simpletext.h"
#include "vgatext.h"

/*
 * This is the main global vga text control/status structure.
 */
HUBDATA volatile vgatextdev_t gVgaText;

static int dummyRx(vgatext *ptr) { return 0; }

vgatext *vgatext_open(int basepin)
{
  /* can't use array instead of malloc because it would go out of scope. */
  text_t *text = (text_t*) malloc(sizeof(text_t));

  text->devst = &gVgaText;

  text->txChar    = vgatext_putchar;  /* required for terminal to work */
  text->rxChar    = dummyRx;          /* required for terminal to work */

  text->cogid[0] = vgatext_start(&gVgaText, basepin);
  return text;
}

void vgatext_close(vgatext *device)
{
  int id = device->cogid[0];

  if(!device)
    return;

  if(id > 0) {
    cogstop(getStopCOGID(id));
    device->cogid[0] = 0;
  }

  free(device);
  device = 0;
}

/*
 * This is the VGA text screen area.
 */
HUBDATA short gVgaScreen[VGA_TEXT_SCREENSIZE];

/*
 * This is the VGA color palette area.
 */
HUBDATA static int gcolors[VGA_TEXT_COLORTABLE_SIZE];

/*
 * In the case of __PROPELLER_XMM__ we must copy the PASM to
 * a temporary HUB buffer for cog start. Define buffer here.
 */
#if defined(__PROPELLER_XMM__)
HUBDATA static uint32_t pasm[496];
#endif

/*
 * These are variables to keep up with display;
 */
static int col, row, flag;

static int blank = 0x220;

/*
 * This is the VGA palette.
 */
static char gpalette[VGA_TEXT_COLORTABLE_SIZE] =     
{                           // fgRGB  bgRGB    '
    0b111111, 0b000001,     // %%333, %%001    '0    white / dark blue
    0b111100, 0b010100,     // %%330, %%110    '1   yellow / brown
    0b100010, 0b000000,     // %%202, %%000    '2  magenta / black
    0b010101, 0b111111,     // %%111, %%333    '3     grey / white
    0b001111, 0b000101,     // %%033, %%011    '4     cyan / dark cyan
    0b001000, 0b101110,     // %%020, %%232    '5    green / gray-green
    0b010000, 0b110101,     // %%100, %%311    '6      red / pink
    0b001111, 0b000001      // %%033, %%003    '7     cyan / blue
};

char greypalette[VGA_TEXT_COLORTABLE_SIZE] =     
{                           // fgRGB  bgRGB    '
    0b111111, 0b000001,     // %%333, %%001    '0    white / dark blue
    0b000001, 0b111111,     // %%333, %%001    '0 dark blue/ white
    0b111111, 0b000000,     // %%333, %%001    '0    white / black
    0b000000, 0b111111,     // %%333, %%001    '1    black / white
    0b010101, 0b000000,     // %%330, %%110    '2     grey / black
    0b000000, 0b010101,     // %%202, %%000    '3    black / grey
    0b111111, 0b010101,     // %%111, %%333    '4    white / grey
    0b010101, 0b111111      // %%111, %%333    '5     grey / white
};

/*
 * This should set the character foreground and screen background.
 * API are available to get/set this.
 */
static int color = 0;

static void wordfill(short *dst, short val, int len);
static void wordmove(short *dst, short *src, int len);

/*
 * VGA_Text start function starts VGA on a cog
 * See header file for more details.
 */
int vgatext_start(volatile vgatextdev_t* vga, int basepin)
{
    extern int binary_VGA_dat_start[];
    int id = 0;

    col   = 0; // init vars
    row   = 0;
    flag  = 0;

    vga->status = 0;
    vga->enable = 1;
    vga->pins   = basepin | 0x7;
    vga->mode   = 0b1000;
    vga->screen = (long) gVgaScreen;
    vga->colors = (long) gcolors;
    vga->ht = VGA_TEXT_COLS;
    vga->vt = VGA_TEXT_ROWS;
    vga->hx = 1;
    vga->vx = 1;
    vga->ho = 1;
    vga->vo = 1;
    vga->hd = 512;
    vga->hf = 10;
    vga->hs = 75;
    vga->hb = 43;
    vga->vd = 480;
    vga->vf = 11;
    vga->vs = 2;
    vga->vb = 31;
    vga->rate = 80000000 >> 2;
    vga->palette = gpalette;
      
#if defined(__PROPELLER_USE_XMM__)
    /* in the case of XMM we need all PASM pointers to be in HUB memory */
    extern int binary_VGA_dat_end[];
    int pasmsize = ((int)binary_VGA_dat_start-(int)binary_VGA_dat_end)>>2;
    id = load_cog_driver_xmm((uint32_t*) binary_VGA_dat_start, pasmsize, (void*)vga);
#else
    id = cognew((void*)binary_VGA_dat_start, (void*)vga);
#endif
    
    /* Set main fg/bg colors here.
     * It's ok to use a global palette just to get started.
     * It can be replaced.
     */
    vgatext_setColorPalette(&vga->palette[VGA_TEXT_PAL_WHITE_BLUE]);
    wordfill(gVgaScreen, blank, VGA_TEXT_SCREENSIZE);
    
    waitcnt(CLKFREQ/5+CNT);
    
    return id;
}

/*
 * VGA_Text stop function stops VGA cog
 * See header file for more details.
 */
void    vgatext_stop(int id)
{
    if(id) {
        cogstop(id);
    }
}

/*
 * VGA_Text setcolors function sets the palette to that defined by pointer.
 * See header file for more details.
 */
void    vgatext_setColorPalette(char* ptr)
{
    int  ii = 0;
    int  mm = 0;
    int  fg = 0;
    int  bg = 0;
    for(ii = 0; ii < VGA_TEXT_COLORTABLE_SIZE; ii += 2)
    {
        mm = ii + 1; // beta1 ICC has trouble with math in braces. use mm
        fg = ptr[ii] << 2;
        bg = ptr[mm] << 2;
        gcolors[ii]  = fg << 24 | bg << 16 | fg << 8 | bg;
        gcolors[mm]  = fg << 24 | fg << 16 | bg << 8 | bg;
   }        
}

/*
 * print a new line
 */
static void newline(void)
{
    col = 0;
    if (++row == VGA_TEXT_ROWS) {
        row--;
        wordmove(&gVgaScreen[0], &gVgaScreen[VGA_TEXT_COLS], VGA_TEXT_LASTROW); // scroll
        wordfill(&gVgaScreen[VGA_TEXT_LASTROW], blank, VGA_TEXT_COLS); // clear new line
    }
}

/*
 * print a character
 */
static void printc(int c)
{
    int   ndx = row * VGA_TEXT_COLS + col;
    short val = 0;
    
    /* a character is represented by a palette color and character index
     */
    
    val  = ((color << 1) | (c & 1)) << 10;
    val += 0x200 + (c & 0xFE);

    // Driver updates during invisible time.
    // while(gVgaText.status != VGA_TEXT_STAT_INVISIBLE)    ;

    while(gVgaText.status != VGA_TEXT_STAT_INVISIBLE)
        ;
    gVgaScreen[ndx] = val; // works

    if (++col == VGA_TEXT_COLS) {
        newline();
    }
}


/*
 * VGA_Text out function prints a character at current position or performs
 * a screen function.
 * See header file for more details.
 */
int vgatext_out(int c)
{
    if(flag == 0)
    {
        switch(c)
        {
            case 0:
            case 16:
                wordfill(&gVgaScreen[0], color << 11 | blank, VGA_TEXT_SCREENSIZE);
                col = 0;
                row = 0;
                break;
            case 1:
                col = 0;
                row = 0;
                break;
            case 8:
                if (col)
                    col--;
                break;
            case 9:
                do {
                    printc(' ');
                } while(col & 7);
                break;
            case 0xA:   // fall though
            case 0xB:   // fall though
            case 0xC:   // fall though
                flag = c;
                return 0;
            case 0xD:
                newline();
                break;
            default:
                printc(c);
                break;
        }
    }
    else
    if (flag == 0xA) {
        col = c % VGA_TEXT_COLS;
    }
    else
    if (flag == 0xB) {
        row = c % VGA_TEXT_ROWS;
    }
    else
    if (flag == 0xC) {
        color = c & 0xf;
    }
    flag = 0;
    return 1;
}
//#endif

/*
 * VGA_Text vgatext_putchar print char to screen with normal stdio definitions
 * See header file for more details.
 */
int vgatext_putchar(vgatext *vga, int c)
{
    switch(c)
    {
        case '\b':
            if (col)
                col--;
            break;
        case '\t':
            do {
                printc(' ');
            } while(col & 7);
            break;
        case '\n':
            newline();
            break;
        case '\r':
            col = 0;
            break;
        case 16:
            vgatext_clear();
            break;
        case 1:
            vgatext_home();
            break;
        default:
            printc(c);
            break;
    }
    return (int)c;
}


/*
 * Clear the display.
 */
void vgatext_clear(void)
{
  vgatext_out(16);
}


/*
 * Cursor to home position.
 */
void vgatext_home(void)
{
  vgatext_out(1);
}


/*
 * Clear to end of line.
 */
void vgatext_clearEOL(void)
{ 
  int lastCol = col;
  int lastRow = row;
  for(int i = col; i < VGA_TEXT_COLS; i++)
    printc(' ');
  col = lastCol;
  row = lastRow;
}


/*
 * VGA_Text setCoordPosition function sets position to Cartesian x,y.
 * See header file for more details.
 */
void    vgatext_setCoordPosition(int x, int y)
{
    col = x;
    row = VGA_TEXT_ROWS-y-1;
}


/*
 * VGA_Text setXY function sets position to x,y.
 * See header file for more details.
 */
void    vgatext_setXY(int x, int y)
{
    col = x;
    row = y;
}

/*
 * VGA_Text setX function sets column position value
 * See header file for more details.
 */
void    vgatext_setX(int x)
{
    col = x;
}

/*
 * VGA_Text setY function sets row position value
 * See header file for more details.
 */
void    vgatext_setY(int y)
{
    row = y;
}

/*
 * VGA_Text getX function gets column position
 * See header file for more details.
 */
int vgatext_getX(void)
{
    return col;
}

/*
 * VGA_Text getY function gets row position
 * See header file for more details.
 */
int vgatext_getY(void)
{
    return row;
}

/*
 * VGA_Text setColors function sets palette color set index
 * See header file for more details.
 */
void vgatext_setColors(int value)
{
    color = value % VGA_TEXT_COLORS;
}

/*
 * VGA_Text getColors function gets palette color set index
 * See header file for more details.
 */
int vgatext_getColors(void)
{
    return color % VGA_TEXT_COLORS;
}

/*
 * VGA_Text getWidth function gets screen width.
 * See header file for more details.
 */
int vgatext_getColumns(void)
{
    return VGA_TEXT_COLS;
}

/*
 * VGA_Text getHeight function gets screen height.
 * See header file for more details.
 */
int vgatext_getRows(void)
{
    return VGA_TEXT_ROWS;
}

static void wordfill(short *dst, short val, int len)
{
    while(--len > -1) {
        *dst = val;
        dst++;
    }
}

static void wordmove(short *dst, short *src, int len)
{
    while(--len > -1) {
        *dst = *src;
        dst++;
        src++;
    }
}

/*
+--------------------------------------------------------------------
|  TERMS OF USE: MIT License
+--------------------------------------------------------------------
Permission is hereby granted, free of charge, to any person obtaining
a copy of this software and associated documentation files
(the "Software"), to deal in the Software without restriction,
including without limitation the rights to use, copy, modify, merge,
publish, distribute, sublicense, and/or sell copies of the Software,
and to permit persons to whom the Software is furnished to do so,
subject to the following conditions:

The above copyright notice and this permission notice shall be
included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.
IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY
CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT,
TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE
SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
+------------------------------------------------------------------
*/

