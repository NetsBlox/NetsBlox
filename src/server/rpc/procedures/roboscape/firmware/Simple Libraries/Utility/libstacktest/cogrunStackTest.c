/*
 * @file cog_runStackTest.c
 *
 * @author Andy Lindsay
 *
 * @copyright
 * Copyright (C) Parallax, Inc. 2014. All Rights MIT Licensed.
 *
 * @brief Source code for cog_end function.
 * 
 * @version 0.50
 */


#include "stacktest.h"
#include "simpletools.h"

int *cog_runStackTest(void (*function)(void *par), int stacksize)
{
  srand(stacksize);
  //srand(0);
  int stackSizeBytes = stacksize * (sizeof(int));
  //print("stackSizeBytes = %d bytes, %d ints\n", stackSizeBytes, stackSizeBytes/sizeof(int));
  int stackOverhead = sizeof(_thread_state_t) + (3 * sizeof(unsigned int));
  //print("stackOverhead = %d bytes, %d ints\n", stackOverhead, stackOverhead/sizeof(int));
  int cogRunTestOverhead = 2 * sizeof(int);
  //print("cogRunTestOverhead = %d bytes, %d ints\n", cogRunTestOverhead, cogRunTestOverhead/sizeof(int));
  int stackBytes = stackSizeBytes + stackOverhead + cogRunTestOverhead;
  //print("stackBytes = %d bytes, %d ints\n", stackBytes, stackBytes/sizeof(int));
  int stackInts = stackBytes / sizeof(int);
  //print("stackInts = %d ints\n", stackInts);

  int *addr;

  addr = malloc(stackBytes);
  int n = 0;
  for(int *i = addr+2; i < (addr + (stackInts)); i++)
  {
    // *i = n;
    *i = rand();
    n++;
  }

  *addr = 1 + cogstart(function, NULL, addr + cogRunTestOverhead/sizeof(int), stackBytes - cogRunTestOverhead);
  if(*addr == 0)
  {
    free(addr);
    return (int*) 0;
  }

  //print("\n\n---[ cog_run ]--- \n\n");
  //print("Cog Address = %d, Cog Value = %d\n", (int) addr, *addr);
  *(addr+1) = stackInts;
  //print("Stack Count Address = %d, Stack Count = %d\n\n", (int)(addr+1), *(addr+1));
  //  //  print("(int)(addr+2) = %d\n", (int)(addr+2));
  return addr;  
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