/*
 * @file serial_open.c
 * Opens a serial module. 
 *
 * Copyright (c) 2013, Parallax Inc.
 * Written by Steve Denson
 */
#include <stdlib.h>
#include <propeller.h>
#include "serial.h"

extern HUBDATA terminal *dport_ptr;

serial *serial_open(int rxpin, int txpin, int mode, int baudrate)
{
  Serial_t *serptr;

  /* can't use array instead of malloc because it would go out of scope. */
  text_t* text = (text_t*) malloc(sizeof(text_t));

  /* set pins first for boards that can misbehave intentionally like the Quickstart */
  if(txpin >= SERIAL_MIN_PIN && txpin <= SERIAL_MAX_PIN) {
    OUTA |=  (1<<txpin);
    DIRA |=  (1<<txpin);
  }
  if(rxpin >= SERIAL_MIN_PIN && rxpin <= SERIAL_MAX_PIN) {
    DIRA &= ~(1<<rxpin);
  }

  //memset(text, 0, sizeof(text_t));
  serptr = (Serial_t*) malloc(sizeof(Serial_t));
  text->devst = serptr;
  memset((char*)serptr, 0, sizeof(Serial_t));
  
  text->txChar    = serial_txChar;     /* required for terminal to work */
  text->rxChar    = serial_rxChar;     /* required for terminal to work */
  //
  //if((mode & ECHO_RX_TO_TX) || (rxpin == 31 && txpin == 30))
  if((mode & ECHO_RX_TO_TX))
  {
    text->terminalEcho = 1;
  } 
  else
  {
    text->terminalEcho = 0;
  }    
  //
  /*
  memcpy(&text->ec, "\r\n", 3);
  memcpy(&text->ecs, "\r\0", 3);
  */
  //
  if(rxpin == 31 && txpin == 30)
  {
    //memcpy(&text->ec, "\r\n", 3);
    //memcpy(&text->ecs, "\r\0", 3);
    text->ecA = '\r';
    text->ecB = '\n';
    text->ecsA = '\r';
    text->ecsB = 0;
  }
  else
  {    
    //memcpy(&text->ec, "\0\0", 3);
    //memcpy(&text->ecs, "\0\0", 3);
    text->ecA = 0;
    text->ecB = 0;
    text->ecsA = 0;
    text->ecsB = 0;
  }    
  //
  serptr->rx_pin  = rxpin; /* recieve pin */
  serptr->tx_pin  = txpin; /* transmit pin*/
  serptr->mode    = mode;
  serptr->baud    = baudrate;
  serptr->ticks   = CLKFREQ/baudrate; /* baud from clkfreq (cpu clock typically 80000000 for 5M*pll16x) */
     
  return text;
}

/*
+--------------------------------------------------------------------
| TERMS OF USE: MIT License
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
+--------------------------------------------------------------------
*/
