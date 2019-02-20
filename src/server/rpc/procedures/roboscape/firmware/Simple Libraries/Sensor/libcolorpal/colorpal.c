/*
 * @file colorpal.c
 *
 * @author Andy Lindsay
 *
 * @version 0.55
 *
 * @copyright
 * Copyright (C) Parallax, Inc. 2012. All Rights MIT Licensed.
 *
 * @brief Simplifies reading Parallax ColorPAL sensor.
 */


#include "simpletools.h"
#include "colorpal.h"
#include "fdserial.h"

//void colorPal_reset(colorPal *device);
//void colorPal_init(colorPal *device);


void colorPal_reset(colorPal *device)
{
  colorPal_t *cp = (colorPal_t*) device->devst;
  low(cp->tx_pin);
  input(cp->rx_pin);
  while(input(cp->rx_pin) == 0);
  low(cp->tx_pin);
  pause(80);
  input(cp->rx_pin);
  pause(10);
}


void colorPal_init(colorPal *device)
{
  colorPal_t *cp = (colorPal_t*) device->devst;

  colorPal_reset(device);
  dprint(device, "=(00 $ m)!");
  //pause(10);
  //low(cp->rx_pin);
}


void colorPal_getRGB(colorPal *device, int *r, int *g, int *b)
{
  char rs[4], gs[4], bs[4];

  fdserial_rxFlush(device);

  while(readChar(device) != '$');

  memset(rs, 0, 4);
  for(int i = 0; i < 3; i++)
  {
    rs[i] = readChar(device);
  }
  memset(gs, 0, 4);
  for(int i = 0; i < 3; i++)
  {
    gs[i] = readChar(device);
  }
  memset(bs, 0, 4);
  for(int i = 0; i < 3; i++)
  {
    bs[i] = readChar(device);
  }

  //print("rs = %s, gs = %s, bs = %s\n", rs, gs, bs);
  
  sscan(rs, "%x", r);
  sscan(gs, "%x", g);
  sscan(bs, "%x", b);
}


colorPal *colorPal_open(int sioPin)
{
  int mode = 0b1100;
  int baudrate = 4800;
  int txpin = sioPin;
  int rxpin = sioPin;

  extern int binary_pst_dat_start[];

  colorPal_t *colpalptr;

  //char* idstr = (char*) malloc(12);
  //memset(idstr, 0, 12);

  /* can't use array instead of malloc because it would go out of scope. */
  char* bufptr = (char*) malloc(2*(FDSERIAL_BUFF_MASK+1));
  colorPal* term = (colorPal*) malloc(sizeof(colorPal));
  memset(term, 0, sizeof(colorPal));

  colpalptr = (void*) malloc(sizeof(colorPal_t));
  term->devst = colpalptr;
  memset((char*)colpalptr, 0, sizeof(colorPal_t));

  if(rxpin == 31 && txpin == 30) {
    simpleterm_close();
  }

  /* required for terminal to work */
  term->txChar  = fdserial_txChar;
  term->rxChar  = fdserial_rxChar;

  colpalptr->rx_pin = rxpin;  /* recieve pin */
  colpalptr->tx_pin = txpin;  /* transmit pin */
  colpalptr->mode   = mode;   /* interface mode */
  //colpalptr->en     = enablePin;  /* interface mode */

  /* baud from clkfreq (cpu clock typically 80000000 for 5M*pll16x) */
  colpalptr->ticks   = CLKFREQ/baudrate;
  colpalptr->buffptr = bufptr; /* receive and transmit buffer */
  //colpalptr->idstr   = idstr; 


/*
  // now start the kernel 
#if defined(__PROPELLER_USE_XMM__)
  { unsigned int buffer[2048];
    memcpy(buffer, binary_pst_dat_start, 2048);
    term->cogid[0] = cognew(buffer, (void*)colopalptr) + 1;
  }
#else
*/
  term->cogid[0] = setStopCOGID(cognew((void*)binary_pst_dat_start, (void*)colpalptr));
//#endif

  waitcnt(CLKFREQ/10+CNT); // give cog chance to load

  colorPal_init(term);

  return term;
}


void colorPal_close(colorPal *device)
{
  int id = device->cogid[0];
  colorPal_t *colpalptr = (colorPal_t*) device->devst;

  while(fdserial_rxCheck(device) >= 0)
      ; // clear out queue by receiving all available 
  fdserial_txFlush(device);

  if(id > 0) cogstop(getStopCOGID(id));
  
  free((void*)colpalptr->buffptr);
  //free((void*)colpalptr->idstr);
  free((void*)colpalptr);
  free(device);
  device = 0;
}

// ColorPal RRGGBB converter

/*
 * Takes the 12-bit red, green, and blue outputs from a ColorPal
 * sensor and generates an approximate RRGGBB (24-bit) output
 * compatible with HTML color codes and some RGB leds.
 */

unsigned int colorPalRRGGBB( int r, int g, int b )
{

  r = 21 * r / 11 - 65 - ( r * r / 415  );
  g = 48 * g / 17 - 70 - ( g * g / 170  );
  b = 8  * b / 9  - 30 - ( b * b / 1680 );

  if( r < 0 ) r = 0; if( r > 255 ) r = 255;
  if( g < 0 ) g = 0; if( g > 255 ) g = 255;
  if( b < 0 ) b = 0; if( b > 255 ) b = 255;

  return ((r & 0xFF) << 16 | (g & 0xFF) << 8 | (b & 0xFF));
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

