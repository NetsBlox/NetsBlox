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
int ard_blockGoto;
int ard_deadZone;
char dhb10_reply[DHB10_LEN];
int ard_gotoDoneReps;

int ard_ramp_interval;

void drive_gotoDoneDelay(int x20ms)
{
  ard_gotoDoneReps = x20ms;  
}


char *drive_goto(int distLeft, int distRight)
{
  char s[32];
  memset(s, 0, 32);
  char *reply = dhb10_reply;

  int ticksL = 0, ticksR = 0, ticksLi = 0, ticksLf = 0, ticksRi = 0, ticksRf = 0;
  int ticksLold = 0, ticksRold = 0;
 
  if(!ard_opened) drive_open();
  #ifdef ARLO_DEBUG
    dprint(ard_dhb10_terminal, "drive_goto(%d, %d)\n", distLeft, distRight);
  #endif

  if(ard_blockGoto)
  {
    pause(20);
    #ifdef ARLO_DEBUG
      dprint(ard_dhb10_terminal, "if(ard_blockGoto)...\n");
    #endif
    drive_getTicks(&ticksLi, &ticksRi);
    ticksLf = ticksLi + distLeft;
    ticksRf = ticksRi + distRight;
    ticksLold = ticksLi;
    ticksRold = ticksRi;
    #ifdef ARLO_DEBUG
      dprint(ard_dhb10_terminal, "ticksLf(%d) = ticksLi(%d) + distLeft(%d)\n", ticksLf, ticksLi, distLeft);
      dprint(ard_dhb10_terminal, "ticksRf(%d) = ticksRi(%d) + distReft(%d)\n", ticksRf, ticksRi, distRight);
    #endif
  } 

  sprint(s, "move %d %d %d\r", distLeft, distRight, ard_speedLimit);
  reply = dhb10_com(s);
  #ifdef ARLO_DEBUG
    dprint(ard_dhb10_terminal, "reply = %s\n", reply);
  #endif  

  if(ard_blockGoto)
  {
    int reps = 0;
    int repsOld = 0;
    while((reps < ard_gotoDoneReps) && (repsOld < ard_gotoDoneReps))
    {
      drive_getTicks(&ticksL, &ticksR);
      if((abs(ticksLf - ticksL) <= (ard_deadZone)) && 
         (abs(ticksRf - ticksR) <= (ard_deadZone)))
      {
        reps++;
      } 
      //
      else if((abs(ticksL - ticksLold) <= (ard_deadZone)) && 
              (abs(ticksR - ticksRold) <= (ard_deadZone)))
      {
        repsOld++;
      } 
      //
      else
      {
        reps = 0;
        repsOld = 0;
      }  
      ticksLold = ticksL;
      ticksRold = ticksR;
      pause(20);
    }  
    #ifdef ARLO_DEBUG
      dprint(ard_dhb10_terminal, "Total Error: %d\n", abs(ticksLf - ticksL) + abs(ticksRf - ticksR));
    #endif
    //return abs(ticksLf - ticksL) + abs(ticksRf - ticksR);
  }
  return reply;
}

