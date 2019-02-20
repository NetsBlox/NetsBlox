/**
 * @file dht22.h
 *
 * @author Matthew Matz
 *
 * @version 0.6
 *
 * @copyright
 * Copyright (C) Parallax, Inc. 2017. All Rights MIT Licensed.
 *
 * @brief This Propeller C library was created for the DHT22/CM2302 
 * temperature and humidity sensor module.
 */

//#define _TEST

#ifdef _TEST
  #include "simpletools.h"
#else
  #include <propeller.h>
#endif

#include "dht22.h"

int main() {
  
  #ifdef _TEST
  
  while(1) {
    int t, h, c;
      c = dht22_read(2);
      t = dht22_getTemp(FAHRENHEIT);
      h = dht22_getHumidity();
      
      print("chk = %d, temp = %.1f, hum = %.1f\r", c, t / 10.0, h / 10.0);
      pause(250);
  }  
  
  #endif
    
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