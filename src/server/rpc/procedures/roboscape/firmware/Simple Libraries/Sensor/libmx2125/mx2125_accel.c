/**
 * @file mx2125_accel.c
 */
 
#include "mx2125.h" 
 
int mx_accel(int axisPin)
{
  int a = pulse_in(axisPin, 1);
  a -= 5000;
  return a;
}

