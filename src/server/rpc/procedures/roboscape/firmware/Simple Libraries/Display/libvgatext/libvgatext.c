/**
 * This is the main libkbvga program file.
 */
/**
 * @file vgatext.c
 * VGA_Text native device driver interface.
 *
 * Copyright (c) 2013, Parallax Inc
 * Written by Steve Denson
 * See end of file for terms of use.
 */

#include "vgatext.h"

#define C3

int main(void)
{
    int ii = 85;
    int jj = 0;

    vgatext *vga;

#ifdef C3
    vga = vgatext_open(8);  // start VGA on C3
    DIRA |= 1<<15;
    OUTA &= ~(1<<15);
#else
    vga = vgatext_open(8);  // start VGA on PropBOE
#endif
    
    writeStr(vga,"\nzoot ");
    writeStr(vga,"color");
    vgatext_setXY(0,0);
    writeStr(vga,"Hi\n");
    writeStr(vga,"zoot");
    vgatext_setCoordPosition(1,3);
    writeStr(vga,"abcd");
    vgatext_setXY(5,5);
    
    writeStr(vga,"Hello World!\r");
    vgatext_setY(vgatext_getY()+1);
    writeStr(vga,"Decimal ");
    writeDecLen(vga,ii,4);
    vgatext_setY(vgatext_getY()+1);

    for(jj = 10; jj < 24; jj++) {
        vgatext_setColors((jj-10));
        vgatext_setXY(jj, jj % VGA_TEXT_ROWS);
        writeStr(vga,"0x");
        writeHexLen(vga,ii++,2);
    }

    vgatext_setColors(VGA_TEXT_CYAN_BLUE);
    writeLine(vga, "\nType on the serial console.");

    do {
        int ch = getChar();
        writeChar(vga,ch);
    } while(1);

  return 0;
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
