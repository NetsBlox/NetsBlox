/*
 * @file remapColor.c
 *
 * @author Matthew Matz
 *
 * @version 0.9
 *
 * @copyright Copyright (C) Parallax, Inc. 2016.  See end of file for
 * terms of use (MIT License).
 *
 * @brief This library contains a set of functions to make color space manipulation and math easier.
 */



#include "colormath.h"


int remapColor(int c, char *f1, char *f2)
{
  int i = 0;
  char k[3], m[3];
  int r1 = 0, g1 = 0, b1 = 0;
  int r2 = 0, g2 = 0, b2 = 0;
  unsigned int rr = 0, gg = 0, bb = 0;
  int u = 0, v = 0, w = 0, t = 0, l = 0;
  unsigned int mask;
    
  for(int j = 0; j < 3; j++)  // scan through first color format string
  {
    t = f1[i] - 48;     // atoi
    i++;                // move to the next character
    
    if(f1[i] >= '0' && f1[i] <= '9') // is the current character still a number?
    {
      t *= 10;          // shift the decimal to the right 1,
      t += f1[i] - 48;  // atoi the next digit and add it in
      i++;              // move to the next character
    }    
    
    m[j] = f1[i];       // keep track of what order the color is in
     
    if(f1[i] == 'R') r1 = t;         // store the number of bits for each color part
    else if(f1[i] == 'G') g1 = t;
    else b1 = t;
    i++;
  }   
  
  i = 0;
  
  for(int j = 0; j < 3; j++) 
  {
    t = f2[i] - 48;     // atoi
    i++;                // move to the next character
    
    if(f2[i] >= '0' && f2[i] <= '9') // is the current character still a number?
    {
      t *= 10;          // shift the decimal to the right 1,
      t += f2[i] - 48;  // atoi the next digit and add it in
      i++;              // move to the next character
    }    
     
    k[j] = f2[i];       // keep track of what order the new color is in
    
    if(f2[i] == 'R') r2 = t;         // store the number of bits for each color part
    else if(f2[i] == 'G') g2 = t;
    else b2 = t;
    i++;                // move to the next character
  } 
  
  if(m[0] == 'R')       u = g1 + b1;
  else if(m[0] == 'G')  v = r1 + b1;
  else                  w = r1 + g1;
  
  if(m[2] == 'R')       l = r1;                // determine which color is last
  else if(m[2] == 'G')  l = g1;                // to calculate how much to shift up
  else                  l = b1;                // the middle color
  
  if(m[1] == 'R')       u = l;
  else if(m[1] == 'G')  v = l;
  else                  w = l;
     
  mask = 0xFFFFFFFF >> (32 - r1);  // isolate the red part of the color
  rr = (c & (mask << u)) >> u;
  
  mask = 0xFFFFFFFF >> (32 - g1);  // isolate the green part of the color
  gg = (c & (mask << v)) >> v; 
  
  mask = 0xFFFFFFFF >> (32 - b1);  // isolate the blue part of the color
  bb = (c & (mask << w)) >> w; 
  
  l = 0;

  if(r1 > r2) rr = rr >> (r1 - r2);  // shift the red part to the new color format length
  else        rr = rr << (r2 - r1);
  
  if(g1 > g2) gg = gg >> (g1 - g2);  // shift the green part to the new color format length
  else        gg = gg << (g2 - g1);
  
  if(b1 > b2) bb = bb >> (b1 - b2);  // shift the blue part to the new color format length
  else        bb = bb << (b2 - b1);

  if(k[0] == 'R')       rr = rr << (g2 + b2);  // determine which color is first and
  else if(k[0] == 'G')  gg = gg << (r2 + b2);  // shift it up to the apropriate place
  else                  bb = bb << (r2 + g2);      
  
  if(k[2] == 'R')       l = r2;                // determine which color is last
  else if(k[2] == 'G')  l = g2;                // to calculate how much to shift up
  else                  l = b2;                // the middle color

  if(k[1] == 'R')       rr = rr << l;          // determine the middle color and
  else if(k[1] == 'G')  gg = gg << l;          // shift it up to the appropriate
  else                  bb = bb << l;          // place

  return (rr | gg | bb);                       // because the last number does not need to be shifted
                                               // all three color parts can now be OR'ed together to
                                               // generate the new color
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