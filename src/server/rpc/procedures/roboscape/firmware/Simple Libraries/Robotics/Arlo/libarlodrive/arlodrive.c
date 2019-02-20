#include "simpletools.h"
#include "arlodrive.h"
#include "fdserial.h"

fdserial *ard_dhb10_arlo;
fdserial *term = 0;

int ard_offset         = ARD_DEFAULT_OFFSET;
int ard_increment      = ARD_DEFAULT_INCREMENT;
int ard_cycles         = ARD_DEFAULT_CYCLES;
int ard_rampStep       = ARD_DEFAULT_RAMPSTEP;
int ard_speedLimit     = ARD_DEFAULT_SPEEDLIMIT;
int ard_tRampStepPrev  = ARD_DEFAULT_TRAMPSTEPPREV;
int ard_speedL         = ARD_DEFAULT_INITSPEED;
int ard_speedR         = ARD_DEFAULT_INITSPEED;
int ard_mode           = ARD_DEFAULT_MODE;
int ard_feedback       = ARD_DEFAULT_FEEDBACK;
int ard_servo_pin_L    = ARD_DEFAULT_SERVO_L;
int ard_servo_pin_R    = ARD_DEFAULT_SERVO_R;
int ard_opened         = ARD_DEFAULT_OPENED;
int ard_rampStepMode   = ARD_DEFAULT_RAMPMODE;
int ard_speedAccLim    = ARD_DEFAULT_ACCEL_LIMIT;
int ard_blockGoto      = ARD_DEFAULT_GOTOBLOCK;
int ard_gotoDoneReps   = ARD_DEFAULT_DONE_REPS;
int ard_deadZone       = ARD_DEFAULT_DEADZONE;
int ard_blockSpeed     = ARD_DEFAULT_BLOCKSPEED;
int ard_blockSpeedPrev = ARD_DEFAULT_BLOCKSPEEDPREV;
int ard_replyMode      = ARD_DEFAULT_REPLYMODE;

char dhb10_reply[DHB10_LEN];
int ard_ramp_interval;

char *drive_open(void)
{
  memset(dhb10_reply, 0, DHB10_LEN);
  char *reply = dhb10_reply;
  #ifdef ARLO_DEBUG
    simpleterm_close();
    pause(10);
    #ifdef XBEE_TERMINAL
      term = fdserial_open(9, 8, 0, 9600);
    #else
      term = fdserial_open(31, 30, 0, 115200);
    #endif  
    dprint(term, "drive_open()\n");
  #endif
  ard_dhb10_arlo = fdserial_open(ard_servo_pin_L, ard_servo_pin_L, 0b1100, 19200);
  ard_opened = 1;
  ard_ramp_interval = CLKFREQ/ARD_DEFAULT_RAMP_INTERVAL;
  pause(10);
  
  #ifdef HALF_DUPLEX
    print("arlodrive.c before reply = dhb10_com(\"\\r\");\n");
  #endif  
  //dprint(ard_dhb10_arlo, "\r");
  reply = dhb10_com("\r");
  #ifdef ARLO_DEBUG
    //dprint(term, "reply = [%s]\n", reply);
    dprint(term, "reply = [%s]\n", reply);
  #endif  

  #ifdef HALF_DUPLEX
    print("arlodrive.c after reply = dhb10_com(\"\\r\");\n");
  #endif  


  reply = dhb10_com("verb 1\r");
  #ifdef ARLO_DEBUG
    dprint(term, "reply = %s\n", reply);
  #endif  

  return reply;
}

void drive_close(void)
{
  #ifdef ARLO_DEBUG
    dprint(term, "drive_close()\n");
  #endif
  drive_speedBlocking(1);
  drive_speed(0, 0);
  fdserial_close(ard_dhb10_arlo);
  ard_opened = 0;
}
