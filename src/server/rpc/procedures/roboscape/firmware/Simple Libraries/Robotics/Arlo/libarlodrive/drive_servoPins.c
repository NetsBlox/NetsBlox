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

void drive_servoPins(int servoPinLeft, int servoPinRight)
{
  #ifdef ARLO_DEBUG
    dprint(ard_dhb10_terminal, "drive_servoPins(%d, %d)\n", servoPinLeft, servoPinRight);
  #endif

  if(ard_opened) drive_close();
  ard_servo_pin_L = servoPinLeft;
  ard_servo_pin_R = servoPinRight;
  drive_open();
}
