/*
  @file scan.c

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

int wifi_timeoutFlag; 

char *wifi_buf;
int wifi_buf_size;


int wifi_scan(int protocol, int handle, const char *fmt, ...)
{
  #ifdef WIFI_DEBUG
  print("wifi_scan\r");
  #endif  //WIFI_DEBUG

  wifi_timeoutFlag = 0;
  int n = 0;
  int p = 0;
  char name[32];
  name[0] = 0;
  int size;
  int bytesReady;
  //char *txt;
  
  volatile int t, dt;

  if(protocol == TCP)
  {
    //wifi_buf_size
    size = wifi_buf_size;
    //txt = wifi_buf; 
    wifi_buf[0] = 0;
    dt = wifi_msReplyTimeout * (CLKFREQ/1000); 
  }  
  
  wifi_simpletermSuspend();
  //fdserial_txFlush(wifi_fds);
  
  switch(protocol)
  {
    case POST:
      //name[0] = 0;
      while(fmt[p] != '%' && fmt[p] != 0)
      {
        name[p] = fmt[p++];
      }
      name[p] = 0;
      if(p==0)
      {        
        dprint(wifi_fds, "%c%c%d,%d\r", CMD, RECV, handle, wifi_buf_size - 1);
        wifi_replyStringIn(wifi_buf_size - 1);
        #ifdef WIFI_DEBUG
        wifi_replyStringDisplay("rstat:");
        #endif  //WIFI_DEBUG
        wifi_replyStringIn(wifi_buf_size - 1);
        #ifdef WIFI_DEBUG
        wifi_replyStringDisplay("rbody:");
        #endif  //WIFI_DEBUG
      }
      else
      {
        dprint(wifi_fds, "%c%c%d,%s\r", CMD, ARG, handle, name);
        wifi_replyStringIn(wifi_buf_size - 1);
        #ifdef WIFI_DEBUG
        wifi_replyStringDisplay("arg stat body:");
        #endif  //WIFI_DEBUG
      }                
      break;
    case WS:
      size = wifi_id;
      dprint(wifi_fds, "%c%c%d,%d\r", CMD, RECV, handle, size);
      wifi_replyStringIn(wifi_buf_size - 1);
      #ifdef WIFI_DEBUG 
      wifi_replyStringDisplay("wstat:"); 
      #endif  //WIFI_DEBUG
      //wifi_replyStringIn();
      wifi_replyStringIn(size);
      #ifdef WIFI_DEBUG
      wifi_replyStringDisplay("wtxt:");
      #endif  //WIFI_DEBUG
      break;
    case CMD:
      #ifdef WIFI_DEBUG
      wifi_replyStringDisplay("ctxt:");
      #endif  //WIFI_DEBUG
      break;
    case TCP:
      t = CNT;
      if(wifi_event == 'S')
      {
        int protocol = 0;
        dprint(wifi_fds, "%c%c%d,%d\r", CMD, RECV, handle, size);
        wifi_replyStringIn(wifi_buf_size - 1);
        #ifdef WIFI_DEBUG
        //wifi_replyStringDisplay("reply\n");
        #endif  //WIFI_DEBUG
        sscan(&wifi_buf[2], "%c%d", &wifi_event, &bytesReady);
        if(bytesReady == 0) return 0;
        while((n < bytesReady) && (n < size))
        {  
          if(fdserial_rxCount(wifi_fds) > 0)
          {
            wifi_buf[n] = fdserial_rxChar(wifi_fds);
            n++;
          }
        }
      }
      break;
  }

  va_list args;
  //va_start(args, &fmt[p]);
  va_start(args, fmt);

  switch(protocol)
  {
    case POST:
      n = _doscanf(&wifi_buf[4], &fmt[p], args);
      //n = _doscanf(wifi_buf, fmt, args);
      break;
    case WS:
      n = _doscanf(&wifi_buf[0], fmt, args);
      break;
    case CMD:
      //n = _doscanf(&wifi_buf[0], fmt, args);
      //n = _doscanf(&wifi_buf[1], fmt, args);
      // Skip "\xFE="
      n = _doscanf(&wifi_buf[2], fmt, args);
      break;
    case TCP:
      //n = _doscanf(txt, fmt, args);
      break;
  }

  va_end(args);
  
  switch(protocol)
  {
    case POST:
      dprint(wifi_fds, "%c%c%d,200,2\rOK", CMD, REPLY, handle);
      wifi_replyStringIn(wifi_buf_size - 1);
      #ifdef WIFI_DEBUG
      wifi_replyStringDisplay("after Reply:");
      #endif  //WIFI_DEBUG
      break;
  }
       
  wifi_simpletermResume();
  #ifdef WIFI_DEBUG
  print("timeout = %d\n", wifi_timeoutFlag);
  #endif //WIFI_DEBUG

  return n;
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

