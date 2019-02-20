/*
 * @file rfidser.c
 *
 * @author Andy Lindsay
 *
 * @version 0.5
 *
 * @copyright
 * Copyright (C) Parallax, Inc. 2012. All Rights MIT Licensed.
 *
 * @brief Simplifies reading Parallax Serial RFID Card Reader.
 */


#include "simpletools.h"
#include "rfidser.h"
#include "fdserial.h"


rfidser *rfid_open(int soutPin, int enablePin)
{
  int mode = 0;
  int baudrate = 2400;
  int txpin = -1;
  int rxpin = soutPin;

  extern int binary_pst_dat_start[];

  rfid_st *rfidptr;

  char* idstr = (char*) malloc(12);
  memset(idstr, 0, 12);

  /* can't use array instead of malloc because it would go out of scope. */
  char* bufptr = (char*) malloc(2*(FDSERIAL_BUFF_MASK+1));
  rfidser* term = (rfidser*) malloc(sizeof(rfidser));
  memset(term, 0, sizeof(rfidser));

  rfidptr = (void*) malloc(sizeof(rfid_st));
  term->devst = rfidptr;
  memset((char*)rfidptr, 0, sizeof(rfid_st));

  if(rxpin == 31 && txpin == 30) {
    simpleterm_close();
  }

  /* required for terminal to work */
  term->txChar  = fdserial_txChar;
  term->rxChar  = fdserial_rxChar;

  rfidptr->rx_pin = rxpin;  /* recieve pin */
  rfidptr->tx_pin = txpin;  /* transmit pin */
  rfidptr->mode   = mode;   /* interface mode */
  rfidptr->en     = enablePin;  /* interface mode */

  /* baud from clkfreq (cpu clock typically 80000000 for 5M*pll16x) */
  rfidptr->ticks   = CLKFREQ/baudrate;
  rfidptr->buffptr = bufptr; /* receive and transmit buffer */
  rfidptr->idstr   = idstr; 


  /* now start the kernel */
#if defined(__PROPELLER_USE_XMM__)
  { unsigned int buffer[2048];
    memcpy(buffer, binary_pst_dat_start, 2048);
    term->cogid[0] = cognew(buffer, (void*)rfidptr) + 1;
  }
#else
  term->cogid[0] = setStopCOGID(cognew((void*)binary_pst_dat_start, (void*)rfidptr));
#endif
  waitcnt(CLKFREQ/2+CNT); // give cog chance to load
  rfid_reset(term);

  return term;
}


void rfidser_close(rfidser *device)
{
  int id = device->cogid[0];
  rfid_st* rfidp = (rfid_st*) device->devst;

  while(fdserial_rxCheck(device) >= 0)
      ; // clear out queue by receiving all available 
  fdserial_txFlush(device);

  if(id > 0) cogstop(getStopCOGID(id));
  
  free((void*)rfidp->buffptr);
  free((void*)rfidp->idstr);
  free((void*)rfidp);
  free(device);
  device = 0;
}


void rfid_reset(rfidser *device)
{
  volatile rfid_st* rfidp = (rfid_st*) device->devst;
  int rfidEn = rfidp->en;

  high(rfidEn);
  low(rfidEn);
}


void rfid_disable(rfidser *device)
{
  volatile rfid_st* rfidp = (rfid_st*) device->devst;
  int rfidEn = rfidp->en;

  high(rfidEn);
}


void rfid_enable(rfidser *device)
{
  volatile rfid_st* rfidp = (rfid_st*) device->devst;
  int rfidEn = rfidp->en;

  low(rfidEn);
}


char *rfid_get(rfidser *device, int timeoutms)
{
  volatile rfid_st* rfidp = (rfid_st*) device->devst;
  memset(rfidp->idstr, 0, 12);

  int dt = (CLKFREQ / 1000) * timeoutms;
  int t = CNT;

  while(fdserial_rxCheck(device) != 0x0A)
  {
    if(CNT - t > dt)
    {
      memcpy(rfidp->idstr, "timed out\0\0\0", 12);
      return rfidp->idstr;
    }
  }
  pause(50);
  readStr(device, rfidp->idstr, 12);
  return rfidp->idstr;
}


/**
 * TERMS OF USE: MIT License
 *
 * Permission is hereby granted, free of charge, to any person obtaining a
 * copy of this software and associated documentation files (the "Software"),
 *  to deal in the Software without restriction, including without limitation
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

