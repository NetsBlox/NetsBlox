/*
 * @file libsimpletools.c
 *
 * @author Andy Lindsay
 *
 * @copyright
 * Copyright (C) Parallax, Inc. 2013-2017. All Rights MIT Licensed.
 *
 * @brief Project and test harness for the simpletools library.
 */

#include "simpletools.h" 
#include "simpletext.h"
#include "simplei2c.h" 

int main()
{
  for(int n = 0; n <= 1000; n++)
  {
    print("n = %d\r", n);
    high(26);
    pause(n);
    low(26);
    pause(n);
  }    
  return 0;
}


