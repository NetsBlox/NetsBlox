#include "simpletools.h"
#include "badgewxtools.h"

jm_ir_hdserial *irself;

int receive(char *s)
{
  int len = 127;
  //char buf[len];
  memset(s, 0, len);
  int check = ir_receive(s, len);
  if(check)
    len = 1 + strlen(s);
  else
    len = 0;  
  //memcpy(s, buf, len);
  return len;
}  
/*
int receive(char *s)
{
  int len = 127;
  char buf[len];
  memset(buf, 0, len);
  ir_receive(buf, len);
  len = 1 + strlen(buf);
  memcpy(s, buf, len);
  return len;
}  
*/
int ir_receive(char *s, int ssize)
{
  //ircom_rxflush();
  //int temp = 0, checksum = 0, reps = 0;
  int temp = 0, checksum = 0;
  while(temp != STX)
  {
    //if((irself->rxtail == irself->rxhead)) return 0;
    //else temp = ircom_rxtime(20);
    temp = ircom_rxtime(20);
    if(temp == -1) return 0;
  }   
  //rgb(L, RED); 
  int i = 0;
  while(1)
  {
    temp = ircom_rxtime(10);
    if(temp == ETX || temp == -1)
    {
      break;
    }
    else
    {
      s[i] = (char) temp;
      checksum += s[i++];       
    }
  }  
  checksum %= 256;
  temp = ircom_rxtime(10);
  //inbox = 1;
  //rgb(L, GREEN);
  //rgb(R, GREEN);
  ircom_rxflush();
  return (char) checksum == (char) temp;
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

