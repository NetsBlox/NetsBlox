/**
 * @author Daniel Harris
 *
 * @copyright
 * Copyright (C) Parallax, Inc. 2014. All Rights MIT Licensed.
 *
 * @version 0.50
 */

#include "gps.h"

volatile int  gps_cog;
volatile int  gps_stopping;
int  gps_stack[100];
int _gps_rx_pin, _gps_tx_pin, _gps_baud;

nmea_data gps_data;

void gps_run(void *par);

int gps_open(int gpsSin, int gpsSout, int gps_baud)   // Open reader, start reading
{

  gps_stopping = 0;
  gps_cog = cogstart(gps_run, NULL, gps_stack, sizeof(gps_stack));

  if(gps_cog < 0)
  {
    //a valid cog was NOT grabbed, clear the GPS data structure and pin info
    memset(&gps_data, 0, sizeof(nmea_data));
    memset(&_gps_rx_pin, 0, (sizeof(int)*3));         
  }
  else
  {
    //the GPS parser cog was started
    _gps_rx_pin = gpsSin;
    _gps_tx_pin = gpsSout;
    _gps_baud = gps_baud;
  }

  return(gps_cog < 0 ? GPS_FALSE:GPS_TRUE);
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
