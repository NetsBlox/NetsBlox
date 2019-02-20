#include "simpletools.h"
#include "arlodrive.h"
#include "fdserial.h"

fdserial *ard_dhb10_arlo;

#ifdef ARLO_DEBUG
  fdserial *term;
#endif  

int ard_offset;
int ard_increment;
int ard_cycles;

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

char *dhb10_com(char *myConfigStr)
{
  memset(dhb10_reply, 0, DHB10_LEN);
  char *reply = dhb10_reply;
  #ifdef ARLO_DEBUG
    //dprint(term, "dhb10_com(%s, ", myConfigStr);
  #endif
  
  if(!ard_opened) drive_open();

  int ca = 0, cta = 0;
  
  //fdserial_txChar(ard_dhb10_arlo, '\r');

  #ifdef HALF_DUPLEX
    print("dhb10_com.c before fdserial_rxFlush(ard_dhb10_arlo); \n");
  #endif  

  fdserial_rxFlush(ard_dhb10_arlo);

  #ifdef HALF_DUPLEX
    print("dhb10_com.c after fdserial_rxFlush(ard_dhb10_arlo); \n");
  #endif  

  int i = 0;
  
  while(1) 
  {
    fdserial_txChar(ard_dhb10_arlo, myConfigStr[i]);
    if((myConfigStr[i] == '\r') || (myConfigStr[i] == 0)) break;
    i++;
  }
  if((i == 0) && (myConfigStr[i] == '\r'))
  {
    return 0;
  }    
  #ifdef ARLO_DEBUG
    //dprint(term, "i = %d\n", i);
  #endif  
  i = 0;
  #ifdef ARLO_DEBUG
    for(int i = 0; i < 32; i++)                                    // 32 Needs #define
    {
      if(myConfigStr[i] == '\r')
      {
        dprint(term, "\\r\n");
        break;
      }        
      else if(myConfigStr[i] >= ' ' && myConfigStr[i] <= 'z')
      {
        writeChar(term, myConfigStr[i]);
      } 
      else
      {
        dprint(term, "[%d]", myConfigStr[i]);
      } 
    }         
  #endif 

  i = 0;
  int t = CNT;
  int dt = CLKFREQ;
  while(1)
  {
    cta = fdserial_rxCount(ard_dhb10_arlo);
    if(cta)
    {
      ca = readChar(ard_dhb10_arlo);
      dhb10_reply[i] = ca;
      #ifdef ARLO_DEBUG
        if(ca == '\r')
        {
          dprint(term, "[\\r]\n");
        }        
        else if(ca >= ' ' && ca <= 'z')
        {
          writeChar(term, ca);
        } 
        else
        {
          dprint(term, "[%d]", ca);
        } 
      #endif  
      if(dhb10_reply[i] == '\r')
      {
        reply = dhb10_reply;
        break;
      }  
      i++;
    }
    if(CNT - t > dt)
    {
      #ifdef ARLO_DEBUG
        dprint(term, "Error, no reply from DHB-10!\n");
      #endif
      strcpy(reply, "Error, no reply from DHB-10!\n");
      break;
    }  
  }
  return reply;    
}
