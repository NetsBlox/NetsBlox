/*
* @file libmstimer.c
*
* @author Andy Lindsay
*
* @copyright
* Copyright (C) Parallax, Inc. 2013. All Rights MIT Licensed.
*
* @brief Project and test harness for the mstimer library.
*/

#include "simpletools.h"                      
#include "mstimer.h"

int main()                                   
{
  mstime_start();
  int dt = CLKFREQ;
  int t = CNT;
  while(1)
  {
    int time = mstime_get();
    print("time = %d\n", time);                    
    waitcnt(t += dt);
  }    
}

