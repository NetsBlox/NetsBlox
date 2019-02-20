/*
  @file ipaddr.c

  @author Andy Lindsay

  @version 0.80 for firmware 1.0

  @copyright
  Copyright (C) Parallax, Inc. 2017. All Rights MIT Licensed.

  @brief API for the Parallax WX Wi-Fi Module ESP8266-WROOM-02.
*/


#include "simpletools.h"
#include "fdserial.h"
#include "wifi.h"


int  wifi_replyStringIn(int maxByteCount);
void wifi_replyStringDisplay(char *s);
void wifi_simpletermSuspend(void);
void wifi_simpletermResume(void);


fdserial *wifi_fds;
int wifi_pin_do;
int wifi_pin_di;
int wifi_baud;
int wifi_comSelectPin;

int simpleterm_toRxDi;
int simpleterm_fromTxDo;
int wifi_msReplyTimeout;

char wifi_event;
char wifi_status;
int wifi_id;
int wifi_handle;
int wifi_stationIp[4] = {0, 0, 0, 0};

int wifi_timeoutFlag; 

char *wifi_buf;
int wifi_buf_size;


int wifi_ip(int mode, int *ipAddr)
{  
  #ifdef WIFI_DEBUG
  print("wifi_ip\r");
  #endif  //WIFI_DEBUG

  wifi_simpletermSuspend();

  if(mode == STA)
  {
    //dprint(wifi_fds, "%c%c%station-ipaddr\r", CMD, CHECK);
    dprint(wifi_fds, "%cCHECK:station-ipaddr\r", CMD);
  }
  else
  {
    dprint(wifi_fds, "%cCHECK:softap-ipaddr\r", CMD);
  }    

  wifi_replyStringIn(wifi_buf_size - 1);
  #ifdef WIFI_DEBUG
  wifi_replyStringDisplay("ipReply");
  #endif  //WIFI_DEBUG

  wifi_simpletermResume();

  sscan(&wifi_buf[2], "%c%d%d%d%d", &wifi_status, 
        &wifi_stationIp[0], &wifi_stationIp[1], 
        &wifi_stationIp[2], &wifi_stationIp[3]);
        
  for(int n = 0; n < 4; n++)
  {
    ipAddr[n] = wifi_stationIp[n];
  }          
  return wifi_status;
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


