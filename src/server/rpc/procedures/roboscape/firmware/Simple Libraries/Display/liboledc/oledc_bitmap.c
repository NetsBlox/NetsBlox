/*
 * @file oledc_bitmap.c
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
 *
 * @note The file format specification for the .BMP (Device independent bitmap image format)
 * was found here: https://en.wikipedia.org/wiki/BMP_file_format
 *
 * The color type supported by this driver is RGB565 a.k.a r5g6b5 (16-bit) in 
 * standard row order (images are drawn from the bottom up).
 */

#include "oledc.h"
#include "simpletools.h"

char TFTROTATION;

// Draw a 1-bit image (bitmap) at the specified (x,y) position

void oledc_bitmap(char *imgdir, int x, int y)
{
  while(oledc_screenLock());  
  oledc_screenLockSet();

  int x0, y0;
  
  char imgdat[300];                                 // Buffer for characters
  FILE* fp = fopen(imgdir, "r");                    // Reopen file for reading

  fread(imgdat, 1, 30, fp);                         // Read 30 characters
  
  int img_width = imgdat[18];                       // get the image width in pixels
  int img_height = imgdat[22];                      // get the image height in pixels
  if(img_width > 149 || img_height > 149) return;   // image is too large for the function to display it
  int img_offset = imgdat[10];                      // find the byte (pointer) where the image data begins
  fread(imgdat, 1, img_offset - 30, fp);            // advance the file pointer to the image data by reading it
  
  if(TFTROTATION == 0)
  {
    int k = 0;
    while(k < img_height)
    {
      fread(imgdat, 1, img_width * 2, fp);
      int y0 = y + img_height - 1 - k;
      if(y0 >= 0 && y0 < TFTHEIGHT)
      {
        int j = 1;
        while(j < img_width * 2)
        {
          while(j/2 + x < 0) j+= 2;
          oledc_goTo(j/2 + x, y0);
          while(j/2 + x < TFTWIDTH)
          {
            oledc_writeCommand(imgdat[j], 1);
            oledc_writeCommand(imgdat[j-1], 1);
            j += 2;
            if(j > img_width*2) break;
          }
          j += 2;
        }
      }
      k++;
    }
  }
  
  if(TFTROTATION == 1)
  {
    for(int k = 0; k < img_height; k++)
    {    
      fread(imgdat, 1, img_width * 2, fp);
      int x0 = TFTWIDTH - y - img_height + k + 1;
      if(x0 >= 0 && x0 < TFTWIDTH)
      {
        for(int j = 1; j < img_width; j++)
        {
          int y0 = x + j;
          if(y0 >=0 && y0 < TFTHEIGHT)
          {
            oledc_goTo(x0, y0);
            oledc_writeCommand(imgdat[j*2-1], 1);
            oledc_writeCommand(imgdat[j*2], 1);
          }
        }
      }
    }
  }                                        
                                                     

  if(TFTROTATION == 2)
  {
    int k = 0;
    x = TFTWIDTH - img_width - x;
    while(k < img_height)
    {
      fread(imgdat, 1, img_width * 2, fp);
      int y0 = TFTHEIGHT - y - img_height + 1 + k;
      if(y0 >= 0 && y0 < TFTHEIGHT)
      {
        int j = 1;
        while(j < img_width * 2)
        {
          while(j/2 + x < 0) j+= 2;
          oledc_goTo(j/2 + x, y0);
          while(j/2 + x < TFTWIDTH)
          {
            int p = img_width*2 - j;
            oledc_writeCommand(imgdat[p], 1);
            oledc_writeCommand(imgdat[p-1], 1);
            j += 2;
            if(j > img_width*2) break;
          }
          j += 2;
        }
      }
      k++;
    }
  } 
  
  if(TFTROTATION == 3)
  {
    for(int k = 0; k < img_height; k++)
    {    
      fread(imgdat, 1, img_width * 2, fp);
      int x0 = y + img_height - k - 1;
      if(x0 >= 0 && x0 < TFTWIDTH)
      {
        for(int j = 1; j < img_width; j++)
        {
          int y0 = TFTHEIGHT - 1 - x - j;
          if(y0 >=0 && y0 < TFTHEIGHT)
          {
            oledc_goTo(x0, y0);
            oledc_writeCommand(imgdat[j*2-1], 1);
            oledc_writeCommand(imgdat[j*2], 1);
          }
        }
      }
    }
  }                                        
                                       
       
  fclose(fp);                                 // Close the file  
 
  oledc_screenLockClr();
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
