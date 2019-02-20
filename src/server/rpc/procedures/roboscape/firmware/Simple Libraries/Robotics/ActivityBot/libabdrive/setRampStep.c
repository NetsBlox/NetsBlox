#include "abdrive.h"

volatile int abd_rampStep[3];

void drive_setRampStep(int stepsize)
{
  abd_rampStep[ABD_B] = stepsize;
}
