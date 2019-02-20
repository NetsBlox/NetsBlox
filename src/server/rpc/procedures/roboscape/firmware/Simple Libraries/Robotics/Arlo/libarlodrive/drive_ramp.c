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
int ard_speedAccLim;
char dhb10_reply[DHB10_LEN];
int ard_ramp_interval;

void drive_ramp(int left, int right)
{
  #ifdef ARLO_DEBUG
    dprint(ard_dhb10_terminal, "drive_ramp(%d, %d)\n", left, right);
  #endif
  if(!ard_opened) drive_open();
  while((ard_speedL != left) || (ard_speedR != right))
  {
    drive_rampStep(left, right);
  }    
}

