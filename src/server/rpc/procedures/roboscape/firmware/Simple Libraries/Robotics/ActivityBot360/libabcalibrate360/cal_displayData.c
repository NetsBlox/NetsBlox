#include "abcalibrate360.h"    
#include "simpletools.h"
#include "servo360.h"
//#include "abdrive360.h"

//static int errorVal;

void cal_displayData(void)
{
  //if(!abd_us) abd_us = CLKFREQ/1000000; 
  
  unsigned char str[12];
  ee_getStr(str, 12, _AB360_EE_Start_);
  str[11] = 0;
  
  //if(!strcmp(str, "AB360      "))
  if(!strncmp(str, "AB360", 5))
  {
    //print("!!! AB360 SETTINGS NOT FOUND, RETURNING !!!\r");
    //return -1;
    if(!strcmp(str, "AB360      "))
    {
      print("Calibration record found.\r\r\r");
    }
    else
    {
      print("Calibration data either not found or has errors.\r");
      print("Try cal_displayResults() for more info.\r");
      print("\rRaw data from EEPROM:\r\r");
    }      
    
    cal_getEepromPins();
    
    int mVccwL = ee_getInt(_AB360_EE_Start_ + _AB360_EE_mVccwL_);
    int bVccwL = ee_getInt(_AB360_EE_Start_ + _AB360_EE_bVccwL_); 
    int mVcwL = ee_getInt(_AB360_EE_Start_ + _AB360_EE_mVcwL_); 
    int bVcwL = ee_getInt(_AB360_EE_Start_ + _AB360_EE_bVcwL_); 
  
    int mVccwR = ee_getInt(_AB360_EE_Start_ + _AB360_EE_mVccwR_); 
    int bVccwR = ee_getInt(_AB360_EE_Start_ + _AB360_EE_bVccwR_); 
    int mVcwR = ee_getInt(_AB360_EE_Start_ + _AB360_EE_mVcwR_); 
    int bVcwR = ee_getInt(_AB360_EE_Start_ + _AB360_EE_bVcwR_); 
    
    print("\r\rInverse Transfer Function Constants\r");
    print("for y = mx + b\r");
    print("===================================\r"); 
    print("Left Servo, Counterclockwise\r");
    pause(50);                               
    print("m = %d\r", mVccwL); 
    print("b = %d\r", bVccwL); 
    print("\rLeft Servo, Clockwise\r");
    print("m = %d\r", mVcwL); 
    print("b = %d\r", bVcwL); 
    
    pause(50);                               
    print("\rRight Servo, Counterclockwise\r");
    print("m = %d\r", mVccwR); 
    print("b = %d\r", bVccwR); 
    print("\rRight Servo, Clockwise\r");
    print("m = %d\r", mVcwR); 
    print("b = %d\r", bVcwR); 

    pause(50);                               
    print("\rNotes:\r");
    print("y: Offset from 15,000 in 0.1 us units\r");
    print("m: Slope in 1.0 us / 4096 increments\r");
    print("x: Desired speed in 4096ths of a revolution/second\r");
    print("b: Number of 0.1 us increments added to 15000\r");
  }   
  else
  {
    print("Calibration data either not found or has errors.\r");
    print("Try cal_displayResults() for more info.\r");
    print("\rRaw data from EEPROM:\r\r");
    for(int a = _AB360_EE_Start_; a < _AB360_EE_End_; a++)
    {
      char c = ee_getByte(a);
      if(c >= ' ' && c <= 'z')
      {
        print("%c", c);
      }
      else
      {
        print("[%d]", c);
      }
    }                      
    return;
  }    
  
  pause(50);                               

  print("\r\rCalibration data stored in EEPROM:\r");
  print("===================================\r"); 
  for(int a = _AB360_EE_Start_; a < _AB360_EE_End_; a++)
  {
    char c = ee_getByte(a);
    if(c >= ' ' && c <= 'z')
    {
      print("%c", c);
    }
    else
    {
      print("[%d]", c);
    }
  } 
  print("\r");                     
  return;
}


