/*
 * @file SimpleTerm_close.c
 * SimpleTerm close is rarely used.
 *
 * Copyright (c) 2013, Parallax Inc.
 * Written by Steve Denson
 */
#include "serial.h"

extern HUBDATA terminal *dport_ptr;
extern volatile int simpleterm_echo;
//extern volatile char simpleterm_ec[3];
//extern volatile char simpleterm_ecs[3];
extern volatile char simpleterm_ecA;
extern volatile char simpleterm_ecB;
extern volatile char simpleterm_ecsA;
extern volatile char simpleterm_ecsB;

void simpleterm_close()
{
  extern text_t *dport_ptr;
  if(!dport_ptr)
    return;
  simpleterm_echo = terminal_checkEcho(dport_ptr);  
  //memcpy(simpleterm_ec, dport_ptr->ec, 3);
  //memcpy(simpleterm_ecs, dport_ptr->ecs, 3);
  simpleterm_ecA = dport_ptr->ecA;
  simpleterm_ecB = dport_ptr->ecB;
  simpleterm_ecsA = dport_ptr->ecsA;
  simpleterm_ecsB = dport_ptr->ecsB;
  serial_close(dport_ptr);
  dport_ptr = 0;
}

terminal *simpleterm_reopen(int rxpin, int txpin, int mode, int baud)
{
  if(simpleterm_echo) mode |= ECHO_RX_TO_TX;
  simpleterm_close();
  dport_ptr = serial_open(rxpin, txpin, mode, baud);
  //memcpy(dport_ptr->ec, simpleterm_ec, 3);
  //memcpy(dport_ptr->ecs, simpleterm_ecs, 3);
  dport_ptr->ecA = simpleterm_ecA;
  dport_ptr->ecB = simpleterm_ecB;
  dport_ptr->ecsA = simpleterm_ecsA;
  dport_ptr->ecsB = simpleterm_ecsB;
  return dport_ptr;
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

