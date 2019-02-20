/*
 * @file cog_endStackTest.c
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

int cog_endStackTest(int *coginfo)
{
  int cog = *coginfo - 1;
  int *addr = coginfo; 
  int stacksize = 0;

  //print("\n\n---[ cog_end ]---\n\n");
  //print("Cog Address = %d, Cog Value = %d\n", (int) addr, *addr);
  //print("Stack Count Address = %d, Stack Count = %d\n\n", (int) (addr+1), *(addr+1));

  int stackInts = *(addr+1);

  int stackOverhead = sizeof(_thread_state_t) + (3 * sizeof(unsigned int));
  //print("stackOverhead = %d bytes, %d ints\n", stackOverhead, stackOverhead/sizeof(int));
  int cogRunTestOverhead = 2 * sizeof(int);
  //print("cogRunTestOverhead = %d bytes, %d ints\n", cogRunTestOverhead, cogRunTestOverhead/sizeof(int));
  int stackOther = stackInts - (stackOverhead/sizeof(int)) - (cogRunTestOverhead/sizeof(int));  
  //print("stackOther = %d ints\n\n", stackOther);
  
  srand(stackOther);
  //srand(0);

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
  
  //print("stacksize = %d ints\n", stacksize);

  if(cog > -1)
  {
    if(cog == cogid())
    {
      free(coginfo); 
      cogstop(cog);
    }
    else
    {
      cogstop(cog);
      free(coginfo); 
    }    
  }    
  *coginfo = 0;

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