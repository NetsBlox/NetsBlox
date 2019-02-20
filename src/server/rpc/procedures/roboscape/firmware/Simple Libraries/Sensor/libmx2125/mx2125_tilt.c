/**
 * @file mx2125_tilt.c
 */
 
#include "mx2125.h" 
 
int mx_tilt(int axisPin)
{
  int a = mx_accel(axisPin);
  float fa = (float) a;
  if(fa > 1250.0) fa = 1250.0;
  if(fa < -1250.0) fa = -1250.0;
  float angle = asin(fa/1250.0) * 180.0 / PI;
  int tilt = (int) angle;
  return (int) tilt;  
}