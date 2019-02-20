#include "abdrive.h"

static int *cog;

void abd_senseEncoders();

int *encoderLeds_start(int pinLeft, int pinRight)
{
  cog = cog_run(abd_senseEncoders, 128);
  return cog;
}  

void encoderLeds_stop()
{
  cog_end(cog);
}

void abd_senseEncoders()
{
  low(26);
  low(27);
  while(1)
  {
    set_output(26, input(14));
    set_output(27, input(15));
  }
}  
