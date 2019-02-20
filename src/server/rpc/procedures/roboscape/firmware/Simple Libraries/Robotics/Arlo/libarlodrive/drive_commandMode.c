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

void dhb10_terminal(fdserial *fdterm)
{
  #ifdef HALF_DUPLEX
    print("HALF_DUPLEX dhb10_terminalMode()\n");
  #endif

  terminal *simple = 0;
  simple = simpleterm_pointer();

  if(simple)
  {
    simpleterm_close();
    simple = (terminal *) 1;
  }

  if(fdterm == SIDE_TERM)
  {
    term = fdserial_open(31, 30, 0, 115200);
  }    
  else
  {
    term = fdterm;
  }
  
  if(!ard_opened) drive_open();
    dprint(term, "Arlo Command Mode\n");   

  #ifdef ARLO_DEBUG
    dprint(term, "dhb10_terminalMode()\n");
  #endif
  
  #ifdef COMMAND_MODE_SANS_STARTUP
    ard_dhb10_arlo = fdserial_open(ard_servo_pin_L, ard_servo_pin_L, 0b1100, 19200);
    dprint(term, "Command Mode Sans Startup\n");
  #endif
  

  char s[32];
  memset(s, 0, 32);
  char t[32];
  memset(t, 0, 32);
  int i = 0;
  int j = 0;
  //#ifdef ARLO_DEBUG
  dprint(term, "Ready\n> ");
  //#endif

  //int c, ca, ctt, cta, left, right;
  int c, ca, ctt, cta;
  fdserial_rxFlush(ard_dhb10_arlo);
  #ifdef ARLO_DEBUG
    fdserial_rxFlush(term);
  #endif
  
  while(1)
  {
    ctt = fdserial_rxCount(term);
    if(ctt)
    {
      c = readChar(term);
      t[j] = c;
      writeChar(term, c);
      if(c == '\n') c = '\r';
      writeChar(ard_dhb10_arlo, c);
      if(c == '\r')
      {
        #ifdef ARLO_DEBUG
          for(int k = 0; k <= j; k++)
          {
            // dprint(term, "[%c]", t[k]);
            if(t[k] == '\r')
            {
              dprint(term, "[\\r]\n");
            }        
            else if(t[k] >= ' ' && t[k] <= 'z')
            {
              dprint(term, "[%c]", t[k]);
            } 
            else
            {
              dprint(term, "[%d]", t[k]);
            } 
          }
        #endif              
        //if(!strncmp("exit", t, 4))
        if((strstr(t, "exit") != NULL) || (strstr(t, "EXIT") != NULL))
        {
          dprint(term, "Exit command mode.\n");
          memset(t, 0, 32);
          j = 0;

          if(fdterm == SIDE_TERM)
          {
            fdserial_close(term);
          }            
          if(simple)
          {
            fdserial_close(term);
            simpleterm_open();
          }
          return;
        }    
        j = 0;      
        memset(t, 0, 32);
      } 
      else
      {
        j++;
      }        
    }
    cta = fdserial_rxCount(ard_dhb10_arlo);
    if(cta)
    {
      ca = readChar(ard_dhb10_arlo);
      s[i] = ca;
      if(ca == '\r')
      {
        dprint(term, "\\r\n");
      }        
      else if(ca >= ' ' && ca <= 'z')
      {
        writeChar(term, ca);
      } 
      else
      {
        dprint(term, "<%d>", ca);
      } 
      if(s[i++] == '\r')
      {
        memset(s, 0, 32);
        i = 0;
      } 
    }
  }
}      



