/*
 * @file oledc_spiWrite.c
 *
 * @author Matthew Matz
 *
 * @version 0.9
 *
 * @copyright Copyright (C) Parallax, Inc. 2016.  See end of file for
 * terms of use (MIT License).
 *
 * @brief 0.96-inch RGB OLED display bitmap driver, see oledc_h. for documentation.
 *
 * @detail Please submit bug reports, suggestions, and improvements to
 * this code to editor@parallax.com.
 */


#include "oledc.h"

// ------------------- low level pin interface --------------------
char _cs, _rs, _rst, _sid, _sclk;
char _screenLock;

//char _byteReadyFlag, _byteToSend, _byteType;   // For multicore support when enabled

__attribute__((fcache))                    // allows function to run directly from cog ram, 10x+ speed increase
void oledc_spiWrite(char c, char dc) {
  
  // Conditionally set _rs (Source: https://graphics.stanford.edu/~seander/bithacks.html)
  unsigned int mask = (-(dc & 1) ^ OUTA) & (1 << _rs);  
  OUTA ^= mask;
   
  OUTA &= ~(1 << _cs);    
  mask = 1 << _sclk;                                    // Set up mask
  OUTA &= ~mask;                                        // Pin output state to low
  DIRA |= mask;                                         // Pin direction to output

  for (int i = 7; i >= 0 ; i--)
  {
    mask = 1 << _sid;
    if ((c >> i) & 1)  OUTA |= mask;
    else               OUTA &= (~mask);
    mask = 1 << _sclk;
    OUTA ^= mask;
    OUTA ^= mask;
  }
  OUTA |= 1 << _cs;
}

void oledc_writeCommand(char c, char dc) {
  oledc_spiWrite(c, dc);
  
  //while(byteReadyFlag);
  //_byteToSend = c;
  //_byteType = dc;
  //_byteReadyFlag = 1; 
}

char oledc_screenLock() {
  return _screenLock;
}  

void oledc_screenLockSet() {
  _screenLock = 1;
}  

void oledc_screenLockClr() {
  _screenLock = 0;
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





///////////////////////// DRAFT MULTICORE VERSION /////////////////////////////////////////

/*

//__attribute__((fcache))
void oledc_spiWrite(void *par) {

DIRA |= 1<<27;
DIRA |= 1<<26;

  while(1)
  {
    while(!_byteReadyFlag);

    if(_byteType)  
    {
      OUTA |= 1 << _rs; 
      OUTA |= 1 << 26;
      OUTA &= ~(1 << 27);
    }      
    else 
    {
              OUTA &= ~(1 << _rs);
      OUTA |= 1 << 27;
      OUTA &= ~(1 << 26);
            }              
        

    unsigned int mask = 1 << _sclk;             // Set up mask
    OUTA &= ~mask;                              // Pin output state to low
    OUTA &= ~(1 << _cs);
  
    for (char i = 7; i >= 0 ; i--)
    {
      mask = 1 << _sid;
      if (((_byteToSend >> i) & 1) == 0)
      {
        OUTA &= (~mask);
      }
      else
      {
        OUTA |= mask;
      }
      mask = 1 << _sclk;
      OUTA ^= mask;
      OUTA ^= mask;
    }
    
    OUTA |= 1 << _cs;

    _byteReadyFlag = 0;
  }    
}

void oledc_writeCommand(char c) {
  //oledc_spiWrite(c, 0);
  while(_byteReadyFlag);
  _byteToSend = c;
  _byteType = 0;
  _byteReadyFlag = 1;
}

void oledc_writeData(char c) {
  //oledc_spiWrite(c, 1);
  while(_byteReadyFlag);
  _byteType = 1;
  _byteToSend = c;
  _byteReadyFlag = 1;
}


*/