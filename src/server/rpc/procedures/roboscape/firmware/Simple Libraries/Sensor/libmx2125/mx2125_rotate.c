/**
 * @file mx2125_rotate.c
 */
 
#include "mx2125.h" 
 
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

