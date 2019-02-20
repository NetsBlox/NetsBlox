#include "simpletools.h"

int ping(int pin)
{
  pause(1);
  low(pin);
  pulse_out(pin, 10);
  return pulse_in(pin, 1);
}

int ping_cm(int pin)
{
  long tEcho = ping(pin);
  int cmDist = tEcho / 58;
  return cmDist;
}

int ping_inches(int pin) 
{
  long tEcho = ping(pin);
  int inDist = tEcho / 148;
  return inDist;
}