/*
  @file keypad.c
 
  @author Andy Lindsay
 
  @version v1.1.6
 
  @copyright
  Copyright (C) Parallax, Inc. 2017. All Rights MIT Licensed.
 
  @brief keypad library source. 
*/

#include "keypad.h"

static int lastKey;

int keypad_getNumber()                        // getNumber function
{
  int key = -1;                               // Key & number variables
  int number = 0;                             // Start with zero                                 
  lastKey = -1;
  
  while(1)                                    // Get number loop
  {
    key = keypad_read();                      // Get pressed key (or -1 for none)
    
    if( (key >= 0) && (key <= 9) )            // If a digit key was pressed
    {
      number = number * 10 + key;             // Make next digit in number
      print("%d", key);                       // Display the key that was pressed
    }      
    else if(key > 9)                          // If # pressed
    {
      print(" %c ", key);                     // Advance to next line
      lastKey = key;
    }
    
    while(key != -1)                          // Wait for key to be released
    {                                         // before taking another digit
      key = keypad_read();
    }   
    if(lastKey > 9) break;                    // Break if non-digit
  }
  return number;                              // Return number value
}  
  
  
int keypad_getNumberEndKey(void)                 // getNumber function
{
  return lastKey;
}  
  
  