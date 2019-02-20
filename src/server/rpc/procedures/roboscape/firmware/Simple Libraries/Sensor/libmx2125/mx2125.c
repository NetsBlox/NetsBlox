/**
 * @file mx2125.c
 */
 
#include "mx2125.h" 
 
int mx_accel(int axisPin)
{
  int a = pulse_in(axisPin, 1);
  a -= 5000;
  return a;
}

int mx_rotate(int xPin, int yPin)
{
  int x = mx_accel(xPin);
  int y = mx_accel(yPin);
  
  float fx = (float) x;
  float fy = (float) y;
  
  float angle = atan2(fy, fx) * 180.0 / PI;
  
  int rotation = (int) angle;
  
  if (rotation < 0) rotation = 360 + rotation;
  
  return (int) rotation;  
}

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