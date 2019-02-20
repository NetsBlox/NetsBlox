/*
* @file libabvolts.c
*
* @author Andy Lindsay
*
* @copyright
* Copyright (C) Parallax, Inc. 2014. All Rights MIT Licensed.
*
* @brief Project and test harness for the abvolts library.
*/


#include "simpletools.h"                      // Include simpletools
#include "abvolts.h"                          // Include adcDCpropab

int main()                                    // Main function
{
  pause(1000);                                // Wait 1 s for Terminal app
  ad_init(21, 20, 19, 18);                    // CS=21, SCL=20, DO=19, DI=18
  da_init(26, 27);                            // P26 -> CH0, P27 -> CH1

  da_setupScale();
  da_useScale();

  float dacvolts = 0.0;
  int dacval = 0;

  int i = 0;                                  // Index variable

  while(1)                                    // Loop repeats indefinitely
  {
    dacvolts = dacvolts + 0.025;
    if(dacvolts > 3.3) dacvolts = 0.0;
    da_volts(0, dacvolts);
    da_volts(1, dacvolts/2);

    if(i == 4)                                // After index = 3
    {
      i = 0;                                  // Reset to zero
      print("%c", HOME);                      // Cursor home
    }  
    print("adc[%d] = %d%c\n", i,              // Display raw ADC
            ad_in(i), CLREOL); 
    print("volts[%d] = %1.2f%c\n\n",             // Display volts
           i, ad_volts(i), CLREOL); 
    i++;                                      // Add 1 to index
    pause(100);                               // Wait 1/10 s
  }  
}

