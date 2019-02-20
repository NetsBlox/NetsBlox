/*
 * @file freqout.c
 */
 
#include "simpletools.h" 

int int_fraction(int a, int b, int shift);
void square_wave_setup(int pin, int freq, int* ctr, int* frq);

void freqout(int pin, int msTime, int frequency)
{
  int ctr, frq, channel;
  //char s[32];
  square_wave_setup(pin, frequency, &ctr, &frq);
  if(!CTRA)
  {
    channel = 0;
    FRQA = frq;
    CTRA = ctr;
    low(pin);
  }
  else
  {
    channel = 1;
    FRQB = frq;
    CTRB = ctr;
    low(pin);
  }
  pause(msTime);
  if(!channel)
  {
    FRQA = 0;
    CTRA = 0;
    input(pin);
  }
  else
  {
    FRQB = 0;
    CTRB = 0;
    input(pin);
  }
}

