#include "simpletools.h"
#include "arlodrive.h"
#include "fdserial.h"

fdserial *ard_dhb10_arlo;
fdserial *term;

int ard_offset, ard_increment, ard_cycles, ard_blockSpeed, ard_blockSpeedPrev;

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

void drive_feedback(int enabled)
{
  if(!ard_opened) drive_open();
  ard_feedback = enabled;
  if(!enabled)
  {
    ard_blockSpeedPrev = ard_blockSpeed;
    ard_blockSpeed = 0; 
  }
  else ard_blockSpeed = ard_blockSpeedPrev;  
}

