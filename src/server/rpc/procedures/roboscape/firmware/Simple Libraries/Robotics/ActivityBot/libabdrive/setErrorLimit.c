#include "abdrive.h"

volatile int abd_edMax;

void drive_setErrorLimit(int maxDistDiffTicks)
{
  abd_edMax = maxDistDiffTicks;
}

