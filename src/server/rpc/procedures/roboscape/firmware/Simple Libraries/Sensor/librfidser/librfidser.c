/*
  librfidser.c

  Test harness for rfidser library.

  Enable -> P2
  Sout   -> P1
*/

#include "simpletools.h"                      // Include simpletools
#include "rfidser.h"                          // Include rfidser

int rfidEn = 2;                               // Reader /ENABLE pin
int rfidSout = 1;                             // Reader SOUT pin

rfidser *rfid;                                // Set up device ID

int main()                                    // Main function
{
  rfid = rfid_open(rfidSout, rfidEn);         // Open reader, start reading

  while(1)                                    // Main loop
  {
    char *str = rfid_get(rfid, 1000);         // Wait up to 1 s for card

    if(!strcmp(str, "timed out"))             // Timed out?
      print("No ID scanned.\n");              //   display "No ID..."
    else if(!strcmp(str, "70006E0299"))       // Round card ID match?
      print("Round card.\n");                 //   diaplay "Round..."
    else if(!strcmp(str, "0200822A14"))       // Rectangle card ID match?
      print("Rectangle card.\n");             //   diaplay "Rectangle..."
    else                                      // No matches?
      print("id = %s.\n", str);               //   print ID.
  }  
}

/**
 * TERMS OF USE: MIT License
 *
 * Permission is hereby granted, free of charge, to any person obtaining a
 * copy of this software and associated documentation files (the "Software"),
 *  to deal in the Software without restriction, including without limitation
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

