/*
* @file libservoAux.c
*
* @author Andy Lindsay
*
* @copyright
* Copyright (C) Parallax, Inc. 2013. All Rights MIT Licensed.
*
* @brief Project and test harness for the servoAux library for standard servoAuxs.
*/

void pulse_outCtr(int pin, int time);

#include "servoAux.h"
//#include "servo.h"
#include "simpletools.h"

int main()
{
  servoAux_angle(0, 0);
  servoAux_angle(1, 100);      
  servoAux_angle(2, 200);
  servoAux_angle(3, 300);
  servoAux_angle(4, 400);
  servoAux_angle(5, 500);
  servoAux_angle(6, 600);
  servoAux_angle(7, 700);
  servoAux_angle(8, 800);
  servoAux_angle(9, 900);
  servoAux_angle(10, 1000);
  servoAux_angle(11, 1100);
  servoAux_angle(12, 1200);
  servoAux_angle(13, 1300);
  //servo_speed(14, 0);
  //servo_speed(15, 0);
}
