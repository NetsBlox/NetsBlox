/*
* @file libadcDCpropab.c
*
* @author Andy Lindsay
*
* @copyright
* Copyright (C) Parallax, Inc. 2013. All Rights MIT Licensed.
*
* @brief Project and test harness for the adcDCpropab library.
*/


#include "simpletools.h"                      // Include simpletools
#include "adcDCpropab.h"                      // Include adcDCpropab

int main()                                    // Main function
{
  pause(1000);                                // Wait 1 s for Terminal app
  adc_init(21, 20, 19, 18);                   // CS=21, SCL=20, DO=19, DI=18

  int i = 0;                                  // Index variable
  while(1)                                    // Loop repeats indefinitely
  {
    if(i == 4)                                // After index = 3
    {
      i = 0;                                  // Reset to zero
      print("%c", HOME);                      // Cursor home
    }  
    print("adc[%d] = %d%c\n", i,              // Display raw ADC
            adc_in(i), CLREOL); 
    print("volts[%d] = %f%c\n\n",             // Display volts
           i, adc_volts(i), CLREOL); 
    i++;                                      // Add 1 to index
    pause(100);                               // Wait 1/10 s
  }  
}
