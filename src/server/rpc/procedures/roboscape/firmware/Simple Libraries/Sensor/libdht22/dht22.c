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
 * @brief This Propeller C library was created for the DHT22 temperature 
 * and humidity sensor module.
 */

#include <propeller.h>
#include "dht22.h"

static int dht_timeout[32];
static int dht_last_temp, dht_last_humidity, dht_timeout_ignore;


void dht22_set_timeout_ignore(int dht_pin, char ignore_timeout) {
  
  // Set up a pin mask
  int dhtpm = (1 << dht_pin);

  // Set or clear the bit for the specified pin
  if (ignore_timeout) {
    dht_timeout_ignore |= dhtpm;
  } else {
    dht_timeout_ignore &= ~dhtpm;
  }
}


int dht22_getTemp(char temp_units) {
  int tt = dht_last_temp;
  if (temp_units == KELVIN)
    tt += 2732;
  else if (temp_units == FAHRENHEIT)
    tt = tt * 9 / 5 + 320;
  
  return tt;
}


int dht22_getHumidity() {
  
  return dht_last_humidity;
}


char dht22_read(int dht_pin) {
  
  // Check to make sure the pin is valid
  if(dht_pin >= 0 && dht_pin < 32) { 
    
    // Set up a pin mask
    int dhtpm = (1 << dht_pin);
    
    // Has it been less than 0.5 seconds since this function was last called?
    if (CNT - dht_timeout[dht_pin] < CLKFREQ/2 && dht_timeout[dht_pin] != 0 && !(dht_timeout_ignore & dhtpm))
      waitcnt(dht_timeout[dht_pin] + CLKFREQ/2);  // If so, wait until 0.5 s has elapsed.
    
    // Set up variables to hold incoming data
    int dhtp[44];
    int dhtc = 0, dhtk = 0, dhts = 0, dhto = 0, dhth = 0, dhtt = 0, dhte = 0;
    
    // Pull the data pin low
    OUTA &= ~dhtpm;
    DIRA |= dhtpm;
    
    // Wait 18 ms
    waitcnt(CLKFREQ/55 + CNT);  
  
    // Set the data pin to an input
    DIRA &= ~dhtpm;
    
    // Set a 2 second timer for the pulse measurements to prevent lockup
    dhto = CNT;
  
    // Set up a state monitor
    int dhst = 0;
    
    // After each full pulse, store the system clock in an 
    // array until 42 measurements are recorded (1 start pulse +
    // 5 bytes of data)
    // Loops enough times to capture data if the sensor is 
    // operating properly
    for (int j = 0; j < CLKFREQ / 2000; j++) {
      if (!(INA & dhtpm) && !dhst)
        dhst = 1;
      if ((INA & dhtpm) && dhst) {
        dhst = 0;
        dhtp[dhtc] = CNT;
        if (dhtc < 44) {
          dhtc++;
        }          
      }
    }
  
    // Measure the length of each pulse to determine if it's a 0 or 1.
    // Bytes 1 & 2 are % relative humidity
    for (dhtc = 2; dhtc < 18; dhtc++) {
      dhth <<= 1;
      dhth |= (dhtp[dhtc] - dhtp[dhtc-1] > CLKFREQ/9800);
    }
   
    // Bytes 3 & 4 are temperature (Celsius)
    for (dhtc = 18; dhtc < 34; dhtc++) {
      dhtt <<= 1;
      dhtt |= (dhtp[dhtc] - dhtp[dhtc-1] > CLKFREQ/9800);
    }
  
    // Byte 5 is a additive checksum
    for (dhtc = 34; dhtc < 42; dhtc++) {
      dhtk <<= 1;
      dhtk |= (dhtp[dhtc] - dhtp[dhtc-1] > CLKFREQ/9800);
    }
    
    // The MSB of the temp is a sign bit, but it's not 2's-compliment...
    // So determine it, then remove it
    dhts = dhtt & 32768;
    dhtt &= 32767;
    
    // If the temp is negative, multiply it by -1
    dhtt *= (dhts ? -1 : 1);
    
    // Calculate the checksum
    dhte = (((dhth >> 8) & 255) + (dhth & 255) + ((dhtt >> 8) & 255) + (dhtt & 255)) & 255;
    
    // Save the result into a single int
    // Bits 0-15: (Celsius Temp * 20) + 100
    // Bits 16-31: (Humidity)
    // Checksum
    
    // Save the temp and humidity into the passed in variables
    // Convert to Farenheiht if requested
    dht_last_humidity = dhth;
    dht_last_temp = dhtt;
        
    // Save the system clock so that the sensor 
    // is not queried again for at least .5 seconds
    dht_timeout[dht_pin] = CNT;
    
    // Return true if the checksum matches
    return dhte == dhtk;
    
  } else {
    
    // Invalid pin
    return 0;    
  }    
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