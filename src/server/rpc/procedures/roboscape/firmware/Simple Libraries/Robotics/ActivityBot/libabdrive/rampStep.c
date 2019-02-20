#include "abdrive.h"

void drive_speed(int left, int right);

void drive_rampStep(int left, int right)
{
  drive_speed(left, right);
}

