#include "abdrive.h"

int abd_abs(int value);

volatile int abd_rampStep[3];
volatile int abd_gotoRampStep[3];

/*
void drive_setAcceleration(int ticksPerSecSq)
{
  abd_rampStep[ABD_B] = ticksPerSecSq/50;
}
*/

void drive_setAcceleration(int forGotoOrSpeed, int ticksPerSecSq)
{
  int accelTps2 = abd_abs(ticksPerSecSq) / 50;
  switch(forGotoOrSpeed)
  {
    case  FOR_SPEED:
    { 
      abd_rampStep[ABD_B] = accelTps2;
    }
    case FOR_GOTO:
    { 
      abd_gotoRampStep[ABD_B] = accelTps2;
    }
  }    
}

