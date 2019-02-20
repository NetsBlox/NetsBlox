/**
  @file keypad.h
 
  @author Andy Lindsay
 
  @version v1.1.6
 
  @copyright
  Copyright (C) Parallax, Inc. 2017. All Rights MIT Licensed.
 
  @brief Scans matrix keypad and returns a unique value for 
  each key that is pressed.  For an example circuit and program,
  go to learn.parallax.com and look for a keypad example in the 
  Simple Devices series. 
*/

#include "simpletools.h"

/**
  @brief Set up the row and column dimensions, pins, and key values.
 
  @param rowCount Number of keypad rows.
 
  @param columnCount Number of keypad columns.
 
  @param *rowPinCons Array that stores the row connections (from top to bottom).
 
  @param *columnPinCons Array that stores the column connections (from left to 
  right).
 
  @param *buttonValues Array that stores the values that should be returned for 
   each key.
*/
void keypad_setup(int rowCount, int columnCount, 
                  int *rowPinCons, int *columnPinCons, 
                  int *buttonValues);

/**
  @brief Returns the first key pressed, or -1 if no key is pressed.
 
  @returns The value of the key that was pressed.  The value for each key 
  is set up in the array that gets passed to keypad_setup's *buttonValues argument. 
*/
int keypad_read(void);

/**
  @brief Get a number from the keypad.  The number will be retured as soon as
  a non-numeric key is pressed and released.    
 
  @returns The number that was entered.
*/
int keypad_getNumber(void); 

/**
  @brief Get the key that terminated number received by keypad_getNumber.    
 
  @returns Key that terminated getNumber.
*/
int keypad_getNumberEndKey(void);                         // getNumber function

/**
  @brief If more than one key might be pressed and held at one time, use this 
  keyapd_readFrom function to get the 2nd, 3rd, etc key.    
 
  @param button Pass the value last returned by either keypad_read or
  keypad_readFrom.  This function will start searching from one past that key in
  the scan order.
 
  @returns The next key detected in the scan order, or -1 if no additional keys
  are pressed.
*/
int keypad_readFrom(int button);


/**
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
