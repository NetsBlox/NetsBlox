/*
* @file libdacctr.c
*
* @author Andy Lindsay
*
* @copyright
* Copyright (C) Parallax, Inc. 2013. All Rights MIT Licensed.
*
* @brief Project and test harness for the dacctr library.
*/


#include "simpletools.h"
#include "dacctr.h"

int main()
{
  unsigned int dta = CLKFREQ/10;
  unsigned int ta = CNT;
  
  dac p26dac = dac_setup(26, 0, 8);
  dac p27dac = dac_setup(27, 1, 8);

  dac_set(&p26dac, 128);
  dac_set(&p27dac, 255);
  //while(1);

  dac p3dac = dac_setup(3, 1+NEW_COG, 8);
  dac_set(&p3dac, 128);
  dac p4dac = dac_setup(4, 0+NEW_COG, 8);
  dac_set(&p4dac, 255);
  dacmem mem;
  int myCog = dac_start(mem, 44100, &p4dac, &p3dac);


  dac p5dac = dac_setup(5, 1+NEW_COG, 8);
  dac_set(&p5dac, 128);
  dac p6dac = dac_setup(6, 0+NEW_COG, 8);
  dac_set(&p6dac, 255);
  dacmem newmem;
  int myOtherCog = dac_start(newmem, 44100, &p5dac, &p6dac);


  //int myCog = dac_start(mem, 44100, &p3dac, 0);
  //int myCog = dac_start(mem, 44100, 0, &p3dac);
  //int myCog = dac_start(mem, 44100, &p4dac, 0);
  //int myCog = dac_start(mem, 44100, 0, &p4dac);
  //print("tf = %d  tf = %d, swap = %d\n", tf, ti, swap);
  
  //pause(10);
  
  //waitcnt(CLKFREQ/10 + CNT);
  
  pause(1000);
  
  pause(10);
  
  //print("p4dac.daCog = %d, p3dac.daCog = %d\n", p4dac.daCog, p3dac.daCog);
  
  ta = CNT;
  while(1)
  {
    int i;
    for(i = 0; i < 256; i++)
    {
      dac_set(&p26dac, i);
      dac_set(&p27dac, 256-i);
      //p3dac.daVal = i;
      //p4dac.daVal = 256 - i;
      dac_set(&p3dac, 256-i);
      dac_set(&p4dac, i);

      dac_set(&p5dac, 256-i);
      dac_set(&p6dac, i);
      pause(10);
    }
  }  
  dac_close(&p26dac);
}

