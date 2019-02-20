//#define _monitor_

// from dev 74

/* 
  Forward Stop Face Right.c

  http://learn.parallax.com/activitybot/go-certain-distances
*/

#include "simpletools.h"
#include "abcalibrate.h"
#include "abdrive.h"

//void drive_calibrationResults(void);

int main()                    
{
  print("%c", CLS);

  //  
  print("Calibration...\r\r");
  cal_servoPins(12, 13);
  cal_encoderPins(14, 15);
 
  high(26);
  high(27);
  cal_activityBot();
  low(26);
  low(27);
  //
  
  drive_displayInterpolation();

  //drive_calibrationResults();

  //drive_speed(0, 0);

  while(1);
  
  //while(1);
  //drive_setMaxSpeed(64);
  #ifdef _monitor_
    encoderLeds_start(26, 27);
    pause(1000);
    monitor_start(3000);
  #endif
  //print("hello");
  
  //drive_setMaxSpeed(128);
  //drive_setAcceleration(400);
  //drive_setMaxSpeed(96);
  //drive_setAcceleration(300);
/*  
  drive_speed(128, 128);
  pause(3000);
  //drive_speed(0, 0);

  drive_speed(-128, -128);
  pause(3000);
  drive_speed(0, 0);
  
  int left, right;
  drive_getTicks(&left, &right);
  
  drive_goto(-left, -right);
*/  
  drive_goto(128, 128);
  //pause(200);
  //drive_goto(32, -32);
  //pause(200);
  //drive_goto(-32, 32);
  //pause(200);
  drive_goto(-128, -128);
  
  
  drive_goto(128, 192);
  //pause(200);
  drive_goto(-128, -192);
  //pause(200);
  drive_goto(192, 128);
  //pause(200);
  drive_goto(-192, -128);
  
  
  pause(1000);
  /*
  
  #ifdef _monitor_
  monitor_stop();
  #endif
  
  while(1);
  */
  
  drive_speed(128, 128);
  pause(2000);
  
  drive_speed(-128, -128);
  pause(2000);
  //drive_speed(0, 0);
  
  //pause(1000);
  
  int left = 0;
  int right = 0;
  drive_getTicks(&left, &right);
  drive_goto(-left, -right);
  
  pause(1500);
  

  drive_speed(128, 96);
  pause(1000);
  drive_speed(-128, -96);
  pause(1300);
  drive_speed(0, 0);
  
  drive_speed(96, 128);
  pause(1000);
  drive_speed(-96, -128);
  pause(1300);
  drive_speed(0, 0);

  pause(1000);

  #ifdef _monitor_
  monitor_stop();
  #endif
  while(1);

  /*
  pause(1000);
  drive_speed(-64, -96);
  pause(1500);
  drive_speed(64, 96);
  pause(1500);
  drive_speed(-96, -64);
  pause(1500);
  drive_speed(96, 64);
  pause(1500);
  drive_speed(-96, 64);
  pause(1500);
  drive_speed(96, -64);
  pause(1500);
  drive_speed(-64, 96);
  pause(1500);
  drive_speed(64, -96);
  pause(1500);
  drive_speed(0, 0);
  */
}

