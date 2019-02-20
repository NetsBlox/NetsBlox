/*
  @file wifi.c

  @author Andy Lindsay

  @version 0.80 for firmware 1.0

  @copyright
  Copyright (C) Parallax, Inc. 2017. All Rights MIT Licensed.

  @brief API for the Parallax WX Wi-Fi Module ESP8266-WROOM-02.
*/


#include "simpletools.h"
#include "fdserial.h"
#include "wifi.h"
       
                                              //                              //
fdserial *wifi_fds;
int wifi_pin_do;
int wifi_pin_di;
int wifi_baud;
int wifi_comSelect;
int simpleterm_fromTxDo = 31;
int simpleterm_toRxDi = 30;

int wifi_ipAddr[4];

char wifi_event;
char wifi_status;
int wifi_id;
int wifi_handle;

int wifi_timeoutFlag = 0; 
int wifi_msReplyTimeout = 1000;

char *wifi_buf = 0;
int wifi_buf_size = 64;

int  wifi_replyStringIn(int maxByteCount);
void wifi_replyStringDisplay(char *s);
void wifi_simpletermSuspend(void);
void wifi_simpletermResume(void);


fdserial *wifi_start(int fromDO, int toDI, int baud, int comSelect)
{ 
  #ifdef WIFI_DEBUG
  print("wifi_start\r");
  #endif  //WIFI_DEBUG
  
  wifi_buf = wifi_bufferSize(wifi_buf_size);

  wifi_pin_do = fromDO;
  wifi_pin_di = toDI;
  wifi_baud = baud;
  wifi_comSelect = comSelect;
  
  if(comSelect == USB_PGM) 
  {
    simpleterm_fromTxDo = fromDO;
    simpleterm_toRxDi = toDI;
  }    
  
  wifi_simpletermSuspend();
  
  wifi_fds = fdserial_open(wifi_pin_do, wifi_pin_di, 0b0100, wifi_baud);
 
  // Break condition
  pause(10);
  low(wifi_pin_di);
  pause(1);
  input(wifi_pin_di);
  pause(1);
  
  wifi_simpletermResume();
  
  return wifi_fds;
}


char *wifi_bufferSize(int bytes)
{
  if(wifi_buf == 0)
  {
    wifi_buf = malloc(wifi_buf_size);
  }
  else
  {    
    free(wifi_buf);
    wifi_buf = malloc(bytes);
  } 
  return wifi_buf;   
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

