#include "simpletools.h"
#include "arlodrive.h"
#include "fdserial.h"

fdserial *ard_dhb10_arlo;
fdserial *term;

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

char *drive_getTicks(int *left, int *right)
{
  #ifdef ARLO_DEBUG
    dprint(term, "drive_getDist(");
  #endif
  char *reply = dhb10_reply;
  if(!ard_opened) drive_open();
  reply = dhb10_com("dist\r");
  sscan(dhb10_reply, "%d%d", left, right);
  #ifdef ARLO_DEBUG
    dprint(term, "%d, %d)\n", *left, *right);
  #endif
  return reply;    
}

