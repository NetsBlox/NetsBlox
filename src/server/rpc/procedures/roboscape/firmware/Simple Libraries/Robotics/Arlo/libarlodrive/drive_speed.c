#include "simpletools.h"
#include "arlodrive.h"
#include "fdserial.h"

fdserial *ard_dhb10_arlo;

#ifdef ARLO_DEBUG
  fdserial *ard_dhb10_terminal;
#endif  

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
static int ard_rampStepPrev = 0;
int ard_speedAccLim;
int ard_blockSpeed;
int ard_deadZone;
char dhb10_reply[DHB10_LEN];
int ard_ramp_interval;

char *drive_speed(int left, int right)
{
  #ifdef ARLO_DEBUG
    dprint(ard_dhb10_terminal, "drive_speed(%d, %d)\n", left, right);
  #endif
  
  #ifdef HALF_DUPLEX
    print("drive_speed.c before drive_open(); \n");
  #endif  

  if(!ard_opened) drive_open();
  
  #ifdef HALF_DUPLEX
    print("drive_speed.c after drive_open(); \n");
  #endif  

  char s[32];
  memset(s, 0, 32);
  char *reply = dhb10_reply;
  
  int speedL = 0, speedR = 0, speedLi = 0, speedLf = 0, speedRi = 0, speedRf = 0;
  int speedLold = 0, speedRold = 0;
 
  if(ard_blockSpeed)
  {
    pause(20);
    #ifdef ARLO_DEBUG
      dprint(ard_dhb10_terminal, "if(ard_blockSpeed)...\n");
    #endif
    drive_getSpeed(&speedLi, &speedRi);
    speedLf = left;
    speedRf = right;
    speedLold = speedLi;
    speedRold = speedRi;
    #ifdef ARLO_DEBUG
      dprint(ard_dhb10_terminal, "speedLf(%d), speedLi(%d)\n", speedLf, speedLi);
      dprint(ard_dhb10_terminal, "speedRf(%d), speedRi(%d)\n", speedRf, speedRi);
    #endif
  } 

  if(left > ard_speedLimit) left = ard_speedLimit;
  if(left < -ard_speedLimit) left = -ard_speedLimit;
  if(right > ard_speedLimit) right = ard_speedLimit;
  if(right < -ard_speedLimit) right = -ard_speedLimit;

  if((ard_rampStepMode == 1) && (ard_rampStepPrev == 0))
  {
    sprint(s, "acc %d\r", ard_rampStep);
    reply = dhb10_com(s);
    #ifdef ARLO_DEBUG
      dprint(ard_dhb10_terminal, "reply = %s\n", reply);
    #endif  
  }
  if((ard_rampStepMode == 0) && (ard_rampStepPrev == 1))
  {
    sprint(s, "acc %d\r", ard_speedAccLim);
    reply = dhb10_com(s);
    #ifdef ARLO_DEBUG
      dprint(ard_dhb10_terminal, "reply = %s\n", reply);
    #endif  
  }  

        
  if(ard_feedback)
  {
    if((ard_rampStepMode == 0) || ((ard_rampStepMode == 1) && (ard_rampStepPrev ==0)))
    {
      if((ard_speedL != left) || (ard_speedR != right))
      {
          sprint(s, "gospd %d %d\r", left, right);
          reply = dhb10_com(s);
          #ifdef ARLO_DEBUG
            dprint(ard_dhb10_terminal, "reply = %s\n", reply);
          #endif  
      }
    } 
  }       
  else    
  {
    sprint(s, "go %d %d\r", left, right);
    reply = dhb10_com(s);
    #ifdef ARLO_DEBUG
      dprint(ard_dhb10_terminal, "reply = %s\n", reply);
    #endif  
  }

  
  if(ard_blockSpeed)
  {
    int reps = 0;
    int repsOld = 0;
    drive_getSpeed(&speedL, &speedR);
    while((reps < 3) && (repsOld < 6))
    {
      drive_getSpeed(&speedL, &speedR);
      if((abs(speedLf - speedL) <= (ard_deadZone + 5)) && 
         (abs(speedRf - speedR) <= (ard_deadZone + 5)))
      {
        reps++;
      } 
      //
      else if((abs(speedL - speedLold) <= (ard_deadZone)) && 
              (abs(speedR - speedRold) <= (ard_deadZone)))
      {
        repsOld++;
      } 
      //
      else
      {
        reps = 0;
        repsOld = 0;
      }  
      speedLold = speedL;
      speedRold = speedR;
      pause(20);
    }  
    #ifdef ARLO_DEBUG
      dprint(ard_dhb10_terminal, "Total Error: %d\n", abs(speedLf - speedL) + abs(speedRf - speedR));
    #endif
  }

  ard_speedL = left;
  ard_speedR = right;
  ard_rampStepPrev = ard_rampStepMode;
  ard_rampStepMode = 0;
  
  return reply;
}
