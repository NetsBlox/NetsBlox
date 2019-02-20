/*
  @file join.c

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
int wifi_stationIp[4];

int wifi_timeoutFlag; 

char *wifi_buf;
int wifi_buf_size;


int wifi_mode(int mode)
{
  #ifdef WIFI_DEBUG
  print("wifi_networkMode\r");
  #endif  //WIFI_DEBUG
  
  //mode = 0;
  
  wifi_simpletermSuspend();

  if((mode == AP) || (mode == STA) || (mode == STA_AP))      
  {
    
    switch(mode)
    {
      case AP:  
        dprint(wifi_fds, "%cSET:wifi-mode,AP\r", CMD);
        break;
      case STA:
        dprint(wifi_fds, "%cSET:wifi-mode,STA\r", CMD);
        break;
      case STA_AP:  
        dprint(wifi_fds, "%cSET:wifi-mode,STA+AP\r", CMD);
        break;
    }
  
    wifi_replyStringIn(wifi_buf_size - 1);

    #ifdef WIFI_DEBUG
    wifi_replyStringDisplay("mode set reply:");
    #endif  //WIFI_DEBUG
  }    
  
  dprint(wifi_fds, "%cCHECK:wifi-mode\r", CMD);
  wifi_replyStringIn(wifi_buf_size - 1);

  #ifdef WIFI_DEBUG
  wifi_replyStringDisplay("mode check reply:");
  #endif  //WIFI_DEBUG
  
  wifi_simpletermResume();
      
  sscan(&wifi_buf[2], "%c%d", &wifi_status, &mode);
  
  if(wifi_status == 'S')
  {
    if(!strcmp(&wifi_buf[4], "STA+AP\r")) mode = STA_AP;
    if(!strcmp(&wifi_buf[4], "AP\r")) mode = AP;
    if(!strcmp(&wifi_buf[4], "STA\r")) mode = STA;
  }    
     
  return mode;
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


