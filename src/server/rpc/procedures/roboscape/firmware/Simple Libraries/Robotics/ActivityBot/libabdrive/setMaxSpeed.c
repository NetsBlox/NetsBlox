#include "abdrive.h"

volatile int abd_speedLimit[4];

void drive_setMaxSpeed(int speed)
{
  abd_speedLimit[ABD_B] = speed;
}

volatile int abd_speedLimit[4];
volatile int abd_gotoSpeedLimit[4];

void drive_setMaxVelocity(int forGotoOrSpeed, int ticksPerSec)
{
  int tps = ticksPerSec;
  switch(forGotoOrSpeed)
  {
    case  FOR_SPEED:
    { 
      abd_speedLimit[ABD_L] = tps;
      abd_speedLimit[ABD_R] = tps;
      abd_speedLimit[ABD_B] = tps;
    }
    case FOR_GOTO:
    { 
      abd_speedLimit[ABD_L] = tps;
      abd_speedLimit[ABD_R] = tps;
      abd_speedLimit[ABD_B] = tps;
    }
  }    
}




