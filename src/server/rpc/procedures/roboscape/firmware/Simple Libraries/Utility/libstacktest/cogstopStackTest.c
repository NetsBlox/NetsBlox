/*
 * @file cogstopStackTest.c
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

int cogstop_stackTest(int cog, void *stack)
{
  cogstop(cog);
  int *addr = (int*)stack; 
  int stacksize = 0;

  int stackInts = *(addr+1);

  //print("\n\n---[ cogstop_stackTest ]--- \n\n");
  //print("Cog Address = %d, Cog Value = %d\n", (int) addr, *addr);
  //print("Stack Count Address = %d, Stack Count = %d\n\n", (int) (addr+1), *(addr+1));
  int stackOverhead = sizeof(_thread_state_t) + (3 * sizeof(unsigned int));
  //print("stackOverhead = %d bytes, %d ints\n", stackOverhead, stackOverhead/sizeof(int));
  int cogRunTestOverhead = 2 * sizeof(int);
  //print("cogRunTestOverhead = %d bytes, %d ints\n", cogRunTestOverhead, cogRunTestOverhead/sizeof(int));
  int stackOther = stackInts - (stackOverhead/sizeof(int)) - (cogRunTestOverhead/sizeof(int));  
  //print("stackOther = %d ints\n\n", stackOther);
  
  srand(stackOther);
  
  int n = -2;
  for(int *i = addr; i < (addr + (stackInts)); i++)
  {
    //print("idx = %d, addr = %d, val = %d\n", (int)(i-addr-2), (int) i, *i);
    if((n >= 0) && (stacksize == 0))
    {
      //if(*i != n)
      if(*i != rand())
      {
        stacksize = stackOther - n;
      }         
    }    
    n++;  
  }    
  if(stacksize < 0) stacksize = 0;
  return stacksize; 
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