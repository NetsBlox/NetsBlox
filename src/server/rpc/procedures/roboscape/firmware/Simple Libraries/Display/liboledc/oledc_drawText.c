/*
 * @file oledc_spiWrite.c
 *
 * @author Matthew Matz
 *
 * @version 0.9
 *
 * @copyright Copyright (C) Parallax, Inc. 2016.  See end of file for
 * terms of use (MIT License).
 *
 * @brief 0.96-inch RGB OLED display bitmap driver, see oledc_h. for documentation.
 *
 * @detail Please submit bug reports, suggestions, and improvements to
 * this code to editor@parallax.com.
 */


#include "oledc.h"


void oledc_drawNumber(float d, int r)
{
  int stringLen = 1;
  char bffr[64];
  int temp_d;
  int isNegative = 0;

  if(d < 0)
  {
    d = -d;
    isNegative = 1;
  }    

  if (r == 0) r = -10;
  if (r < 0)
  {
    r = -r;
    temp_d = (int) d;

    while ((int)temp_d / r != 0)
    {
      temp_d = (int)temp_d / r;
      stringLen++;
    }
    temp_d = d;
    bffr[stringLen] = 0;
    
    do
    {
      int theNumber = (temp_d % r);
      if (theNumber > 9) theNumber = theNumber + 7;
      bffr[stringLen - 1] = theNumber + '0';
      temp_d = (int) temp_d / r;
    } while (stringLen--);

  } else {
    
    int t = 1;
    for (int p = 0; p < r; p++) t *= 10;
    r = 10;
    int i_part = (int) d;
    int d_part = ((int) (d * t + 0.5)) - (i_part * t);
    int d_place;

    temp_d = (int) d;

    while ((int)temp_d / r != 0)
    {
      temp_d = (int)temp_d / r;
      stringLen++;
    }
    temp_d = d;
    d_place = stringLen;
    d_place++;
    
    do
    {
      int theNumber = (temp_d % r);
      bffr[stringLen - 1] = theNumber + '0';
      temp_d = (int) temp_d / r;
    } while (stringLen--);

    temp_d = (int) d_part;
    int stringLen = 1;

    while ((int)temp_d / r != 0)
    {
      temp_d = (int)temp_d / r;
      stringLen++;
    }
    temp_d = d_part;
    bffr[stringLen + d_place] = 0;
    
    do
    {
      int theNumber = (temp_d % r);
      bffr[stringLen - 1 + d_place] = theNumber + '0';
      temp_d = (int) temp_d / r;
    } while (stringLen--);
    bffr[d_place - 1] = '.';
  }
  
  if(isNegative)
  {
    int l = strlen(bffr);
    bffr[l + 2] = 0;
    for(int m = l; m >= 0; m--) bffr[m+1] = bffr[m];
    bffr[0] = '-';
  }    
  
  if (r >= 0 && isNegative && !(r == 10)) 
  {
    oledc_drawText("Err");    
  } else {
    oledc_drawText(bffr);
  }    
}


void oledc_drawText(char *myString)
{
  for (int j = 0; j < strlen(myString); j++)
  {
    oledc_write(myString[j]);
  }
}


/**
 * Parts of this code based on a function written by Stack Overflow member Ishu
 * Posted here: http://stackoverflow.com/questions/5242524/converting-int-to-string-in-c
 * 
 * 
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