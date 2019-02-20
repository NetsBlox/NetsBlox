#include "simpletools.h"
#include "arlodrive.h"
#include "fdserial.h"

fdserial *ard_dhb10_arlo;
fdserial *ard_dhb10_terminal;

int ard_offset, ard_increment, ard_cycles;

int ard_rampStep;
int ard_speedLimit;
int ard_tRampStepPrev;
int ard_speedL, ard_speedR;
int ard_mode;
int ard_feedback;
int ard_servo_pin_L;
int ard_servo_pin_R;
int ard_opened;
int ard_rampStepMode;
int ard_speedAccLim;
char dhb10_reply[DHB10_LEN];
int ard_ramp_interval;

void drive_rampStep(int left, int right)
{
  int rampStep = ard_rampStep * 4 / 20;
  #ifdef ARLO_DEBUG
    dprint(ard_dhb10_terminal, "drive_rampStep(%d, %d)\n", left, right);
  #endif
  if(!ard_opened) drive_open();
  while(CNT - ard_tRampStepPrev < ard_ramp_interval);
  ard_tRampStepPrev = CNT;

  int leftTemp, rightTemp;

  if(ard_feedback)
  {
    leftTemp = left;
    rightTemp = right;
  }
  else
  {
    if(left > ard_speedL + rampStep) leftTemp = ard_speedL + rampStep;
    else if(left < ard_speedL - rampStep) leftTemp = ard_speedL - rampStep;
    else leftTemp = left;
  
    if(right > ard_speedR + rampStep) rightTemp = ard_speedR + rampStep;
    else if(right < ard_speedR - rampStep) rightTemp = ard_speedR - rampStep;
    else rightTemp = right;
  }        

  ard_rampStepMode = 1;
  drive_speed(leftTemp, rightTemp);
}

