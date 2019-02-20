#include "abcalibrate360.h"    
#include "simpletools.h"
#include "servo360.h"
//#include "abdrive360.h"


int cal_getEepromPins()
{
  int eeAddr = _AB360_EE_Start_  + _AB360_EE_Pins_;
  unsigned char pinInfo[16];

  for(int i = 0; i < 16; i++) 
  {
    pinInfo[i] = ee_getByte(eeAddr + i);
    /*
    if(pinInfo[i] <= 'z' && pinInfo[i] >= ' ')
    {
      print("%c", pinInfo[i]);
    }
    else
    {
      print("[%d]", pinInfo[i]);
    }
    */
  }    
  
  print("I/O pins\r");
  print("===================================\r"); 
  print("Control pins:\r");
  print("-----------------------------------\r"); 

  if(pinInfo[0] == 's' && pinInfo[1] == 'p' && pinInfo[2] == 'L' && pinInfo[5] == 'R')
  {
    //abd360_pinCtrlLeft = (int) pinInfo[3];
    //abd360_pinCtrlRight = (int) pinInfo[6];
    print("Left servo: P%d\r", pinInfo[3]);    
    print("right servo: P%d\r", pinInfo[6]);    
  }
  //
  else
  {
    print("Control pin settings not found.  Defaults of \r");
    print("P12 (left) and P13 (right) will be used. \r");
  }  
  //  
    
  pause(50);
  print("\rFeedback pins:\r");
  print("-----------------------------------\r"); 
  if(pinInfo[8] == 'e' && pinInfo[9] == 'p' && pinInfo[10] == 'L' && pinInfo[13] == 'R')
  {
    //abd360_pinFbLeft = (int) pinInfo[11];
    //abd360_pinFbRight = (int) pinInfo[14];
    print("Left servo: P%d\r", pinInfo[11]);    
    print("right servo: P%d\r", pinInfo[14]);    
  }
  //
  else
  {
    print("Feedback pin settings not found.  Defaults of \r");
    print("P14 (left) and P15 (right) will be used. \r\r");
  } 
  //print("===================================\r\r"); 
}



