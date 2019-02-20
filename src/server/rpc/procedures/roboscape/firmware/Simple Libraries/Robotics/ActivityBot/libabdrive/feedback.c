#include "abdrive.h"

volatile int encoderFeedback;

void drive_feedback(int enabled)
{
  encoderFeedback = enabled;
}

