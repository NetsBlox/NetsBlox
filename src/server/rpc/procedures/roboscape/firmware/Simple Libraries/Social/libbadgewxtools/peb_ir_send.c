#include "simpletools.h"
#include "badgewxtools.h"

int send(char *s)
{
  int len = 1 + strlen(s);
  ir_send(s, len);
  return len;
} 

void ir_send(char *s, int ssize)
{
  int checksum = 0;
  ircom_tx(STX);
  pause(1);
  for(int i = 0; i < ssize; i++)
  {
    ircom_tx(s[i]);
    checksum += s[i];
    pause(1);
  }    
  ircom_tx(ETX);
  pause(1);
  checksum %= 256;
  ircom_tx(checksum);
  ircom_txflush();
  pause(20);
  //return len;
}  

/*
  TERMS OF USE: MIT License
 
  Permission is hereby granted, free of charge, to any person obtaining a
  copy of this software and associated documentation files (the "Software"),
   to deal in the Software without restriction, including without limitation
  the rights to use, copy, modify, merge, publish, distribute, sublicense,
  and/or sell copies of the Software, and to permit persons to whom the
  Software is furnished to do so, subject to the following conditions:
 
  The above copyright notice and this permission notice shall be included in
  all copies or substantial portions of the Software.
 
  THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
  IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
  FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL
  THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
  LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
  FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER
  DEALINGS IN THE SOFTWARE.
*/

