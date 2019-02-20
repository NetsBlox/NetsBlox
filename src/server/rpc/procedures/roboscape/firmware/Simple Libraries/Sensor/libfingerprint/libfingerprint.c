/**
 * @file libfingerprint.c
 *
 * @author Matthew Matz
 *
 * @version 0.50
 *
 * @copyright
 * Copyright (C) Parallax, Inc. 2017. All Rights MIT Licensed.
 *
 * @brief Simplifies reading the WaveShare fingerprint scanner module.
 */

//#define TEST_HARNESS

#include "fingerprint.h"


fpScanner *fpScan;


int userID, result;



int main()
{
#ifdef TEST_HARNESS  
  
  fpScan = fingerprint_open(25, 24);
  
  print("Deleting all users\n");
  
  result = fingerprint_deleteUser(fpScan, 0);  // deletes all users
  
  print("Result = %d\n\n", result); // print result: 0 = ACK_SUCCESS

  pause(1000);
  
  print("Add fingerprint (3 impressions)\n");
  
  result = fingerprint_add(fpScan, 15, 3, 0);  // adds fingerprint, sets userID to 15 and user level to 3.  Makes 3 scans.
  
  print("Add FP result = %d\n\n", result); // print result: 0 = ACK_SUCCESS
  
  while(1) 
  {
    pause(1000);
     
    print("Scan your fingerprint\n");
  
    result = fingerprint_scan(fpScan, 0, &userID);
    
    print("UserID = %d, result = %d\n", userID, result);
  }  

#endif  // TEST_HARNESS
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
