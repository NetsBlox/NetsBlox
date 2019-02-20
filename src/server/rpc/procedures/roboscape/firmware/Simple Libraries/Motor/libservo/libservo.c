/*
* @file libservo.c
*
* @author Andy Lindsay
*
* @copyright
* Copyright (C) Parallax, Inc. 2013. All Rights MIT Licensed.
*
* @brief Project and test harness for the servo library for standard servos.
*/

void pulse_outCtr(int pin, int time);

#include "servo.h"
//#include "servoAux.h"
#include "simpletools.h"

int main()
{
  servo_angle(0, 0);
  servo_angle(1, 100);      
  servo_angle(2, 200);
  servo_angle(3, 300);
  servo_angle(4, 400);
  servo_angle(5, 500);
  servo_angle(6, 600);
  servo_angle(7, 700);
  servo_angle(8, 800);
  servo_angle(9, 900);
  servo_angle(10, 1000);
  servo_angle(11, 1100);
  servo_angle(12, 1200);
  servo_angle(13, 1300);
  /*
  */
  //servo_speed(14, 0);
  //servo_speed(15, 0);
}
