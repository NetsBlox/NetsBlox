/*
  @file libkeypad.c

  @author Andy Lindsay

  @copyright
  Copyright (C) Parallax, Inc. 2017. All Rights MIT Licensed.

  @brief Project and test harness for the keypad library.
*/

#include "simpletools.h"
#include "keypad.h"

int rowPins[4] = {7,   6,  5,  4};
int colPins[4] = {3,   2,  1,  0};

int values[16] = {  1,   2,    3,  'A',
                    4,   5,    6,  'B',
                    7,   8,    9,  'C',
                  '*',   0,  '#',  'D' };
int main()
{
  keypad_setup(4, 4, rowPins, colPins, values);

  while(1)
  {
    int key = keypad_read();
    if(key <= 9)
      print("key = %d\r", key);
    else
      print("key = %c\r", key);
    while(key != -1)
    {
      key = keypad_readFrom(key);
      if(key <= 9)
        print("key = %d\r", key);
      else
        print("key = %c\r", key);
    }        
    print("\r");
    pause(2000);
  }  
}


