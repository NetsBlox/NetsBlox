/*
* @file libadcACpropab.c
*
* @author Andy Lindsay
*
* @copyright
* Copyright (C) Parallax, Inc. 2013. All Rights MIT Licensed.
*
* @brief Project and test harness for the adcACpropab library.
*/

#include "simpletools.h"

#include "simpletools.h"                      // Include simpletools
#include "adcACpropab.h"                      // Include adcACpropab

int adcVal[4];                                // Required by adcPropABac

int main()                                    // Main function
{
  pause(1000);                                // Wait 1 s for Terminal app

  adc_start(19, 18, 20, 21,                   // CS=21, SCL=20, DO=19, DI=18
            0b0101,                           // Ch3 off, 2 on, 1 off, 0 on 
            adcVal);                          // Array for measurements

  int i = 0;                                  // Index variable
  while(1)                                    // Loop repeats indefinitely
  {
    print("adcVal[%d] = %d%c\n", i,          // Display raw ADC
            adcVal[i], CLREOL); 
    pause(100);                               // Wait 1/10 s

    i++;                                      // Add 1 to index
    if(i == 4)                                // After index = 3
    {
      i = 0;                                  // Reset to zero
      print("%c", HOME);                     // Cursor home
    }  
  }
}

