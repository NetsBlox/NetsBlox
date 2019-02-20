//#define _monitor_

/*
  abdrive.c library source
*/


#include "abdrive.h"                   // Include servo lib funct defs
#include "simpletools.h"
#include "simpletext.h"
#include "fdserial.h"
#include <string.h>


#ifdef _monitor_
  volatile char abd_str[128];
#endif


//#define test_t_interval
#ifdef test_t_interval
  volatile int rec_t[8000 / 4];
#endif

volatile int abd_sampleCount = 0;


//volatile int abd_record = 0;               // Record values to an array

int abd_abs(int value)
{
  if(value < 0) value = -value;
  return value;
}  

void drive_com(int arrayLcnt, int arrayRcnt, 
               int centerL, int centerR, 
               short *pwAddrL, short *pwAddrR, 
               short *spdAddrL, short *spdAddrR);
//void drive_set(int left, int right);
void abd_encoders(void *par);
//void interpolate(int* ltmp, int* rtmp);
void interpolation_table_setup();
//void servos_diffDrive(void);
//void drive_record(int startStop);
//void drive_displayControlSystem(int start, int end);
void set_drive_speed(int left, int right);
void interpolate2(int *ltmp, int *rtmp);
//void drive_rampStep2(int left, int right);
void abd_sample(void);


// Servo pulse counter
volatile unsigned int _servoPulseReps;                     
volatile int abd_dsr = 800;                                // Distance sampling rate
volatile int abd_zeroDelay = ON;
volatile int abd_us;
volatile int abd_intTabSetup = 0;

volatile int abd_cog = 0;
unsigned int abd_stack[44 + 128];

short abd_spdrL[120];
short abd_spdmL[120];
short abd_spdrR[120];
short abd_spdmR[120];

static int r = 0;

int abd_eeAddr;

static volatile int kp[6];

static volatile int ridx = 0;

static volatile short *pwL;
static volatile short *pwR;
static volatile short *spdL;
static volatile short *spdR;

static volatile int pcount;
static volatile unsigned int _sprOld;

static volatile int phs[2];

static volatile int phsr[2] = {0, 0};

volatile int encoderFeedback = 1;

volatile int abd_blockGoto = 1;

volatile int abd_speedOld[2];
volatile int abd_stopCtr[2];

volatile int abd_stopPulseReps[2] = {ABD_STOP_50ths, ABD_STOP_50ths};
// Measured distance left/right
volatile int abd_ticks[2]= {0, 0};                                
// Target speed left/right
volatile int abd_speedT[2] = {0, 0};                                   
// Current requested speed
volatile int abd_speed[2];   

                                 
volatile int abd_ticksi[2];


volatile int abd_ticksf[2];


volatile int abd_gotoFlag[2] = {0, 0};

volatile int abd_speedLimit[4] = {ABD_SPEED_LIMIT, ABD_SPEED_LIMIT, ABD_SPEED_LIMIT, ABD_SPEED_LIMIT};
volatile int abd_rampStep[3] = {ABD_RAMP_STEP, ABD_RAMP_STEP, ABD_RAMP_STEP};

volatile int abd_gotoSpeedLimit[4] = {ABD_GOTO_SPEED_LIMIT, ABD_GOTO_SPEED_LIMIT, ABD_GOTO_SPEED_LIMIT};
volatile int abd_gotoRampStep[3] = {ABD_GOTO_RAMP_STEP, ABD_GOTO_RAMP_STEP, ABD_GOTO_RAMP_STEP};

volatile int abd_ticksGuard[2] = {0, 0};

// distance calculated
volatile int abd_dc[2];                                      

// distance calculated (accumulated)
volatile int abd_dca[2] = {0, 0};                                 

// error distance 
volatile int abd_ed[2];                                      

// proportional
volatile int abd_p[2];

// integral
volatile int abd_i[2];

// Accumulated errors L/R
volatile int abd_ea[2] = {0, 0};                                  


// servoPins
volatile int abd_sPin[2] = {12, 13};

// Encoder Pins 
volatile int abd_ePin[2] = {14, 15};

// display
volatile int abd_elCnt[2];    // ?????? Instance count different
volatile int abd_cntrIdx[2];


// Center values
static volatile int cntrVal[2];
static volatile int ti[2];
static volatile int state[2];
static volatile int stateNow[2];
static volatile int statePrev[2];
// servo speeed interpolated
static volatile int ssi[2];
static volatile int drive[2];

static volatile int speedPrev[2] = {0, 0};
volatile int abd_nudgeCtr[2];
volatile int abd_nudgeInc[2];   // ??? remove ???
volatile int abd_distError[2];

volatile int sign[2];
volatile int abd_dist[2];

volatile int abd_ditherA[2];
volatile int abd_ditherAa[2];
volatile int abd_ditherAd[2];
volatile int abd_ditherAp[2];

volatile int abd_ditherV[2];
volatile int abd_ditherVa[2];
volatile int abd_ditherVd[2];
volatile int abd_ditherVp[2];

volatile int abd_speedi[2];
volatile int abd_speedd[2];
volatile int abd_dvFlag[2] = {0, 0};

volatile int abd_edMax = 10;

//volatile int abd_gotoFlagTemp;

volatile  int abd_zdir[2] = {0, 0};
volatile unsigned  int abd_tdst;                       // time of distance sample
volatile unsigned int abd_td;                          // time of distance


void drive_com(int arrayLcnt, int arrayRcnt, 
               int centerL, int centerR, 
               short* pwAddrL, short* pwAddrR, 
               short* spdAddrL, short* spdAddrR)
{
  abd_elCnt[ABD_L] = arrayLcnt;
  abd_elCnt[ABD_R] = arrayRcnt;
  abd_cntrIdx[ABD_L] = centerL;
  abd_cntrIdx[ABD_R] = centerR;
  pwL = pwAddrL;
  pwR = pwAddrR;
  spdL = spdAddrL;
  spdR = spdAddrR;
  cntrVal[ABD_L] = pwAddrL[abd_cntrIdx[ABD_L]];
  cntrVal[ABD_R] = pwAddrR[abd_cntrIdx[ABD_R]];
}


void interpolation_table_setup()
{
  if(!abd_us) abd_us = CLKFREQ/1000000; 

  unsigned char str[12];
  ee_getStr(str, 12, _ActivityBot_EE_Start_);
  //ee_getStr(str, 12, _ActivityBot_EE_Start_);

  abd_eeAddr = _ActivityBot_EE_Start_ + _ActivityBot_EE_Left_;
  //print("left abd_eeAddr = %d\n", abd_eeAddr);
  int cntL = ee_getInt(abd_eeAddr);
  abd_eeAddr += 4;
  int zstartL = ee_getInt(abd_eeAddr);
  abd_eeAddr += 4;
  for(r = 0; r < cntL; r++)
  {
    //abd_spdrL[r] = ee_getInt(abd_eeAddr);
    abd_spdrL[r] = (short) ee_getInt(abd_eeAddr);
    abd_eeAddr+=4;
    //abd_spdmL[r] = ee_getInt(abd_eeAddr);
    abd_spdmL[r] = (short) ee_getInt(abd_eeAddr);
    abd_eeAddr += 4;  
  }
  abd_spdmL[cntL - 1] = 1000;
  abd_spdmL[0] = 1000;

  abd_eeAddr = _ActivityBot_EE_Start_ + _ActivityBot_EE_Right_;
  //print("right abd_eeAddr = %d\n", abd_eeAddr);
  int cntR = ee_getInt(abd_eeAddr);
  abd_eeAddr += 4;
  int zstartR = ee_getInt(abd_eeAddr);
  abd_eeAddr += 4;
  for(r = 0; r < cntR; r++)
  {
    abd_spdrR[r] = (short) ee_getInt(abd_eeAddr);
    abd_eeAddr+=4;
    abd_spdmR[r] = (short) ee_getInt(abd_eeAddr);
    abd_eeAddr += 4;  
  } 
  abd_spdmR[cntR - 1] = 1000;
  abd_spdmR[0] = 1000;

  drive_com(cntL, cntR, zstartL, zstartR, abd_spdrL, abd_spdrR, abd_spdmL, abd_spdmR);

  int eeAddr = _ActivityBot_EE_Start_  + _ActivityBot_EE_Pins_;
  unsigned char pinInfo[16];

  for(int i = 0; i < 16; i++) 
    pinInfo[i] = ee_getByte(eeAddr + i);

  if(pinInfo[0] == 's' && pinInfo[1] == 'p' && pinInfo[2] == 'L' && pinInfo[5] == 'R')
  {
    abd_sPin[ABD_L] = (int) pinInfo[3];
    abd_sPin[ABD_R] = (int) pinInfo[6];
  }
    
  if(pinInfo[8] == 'e' && pinInfo[9] == 'p' && pinInfo[10] == 'L' && pinInfo[13] == 'R')
  {
    abd_ePin[ABD_L] = (int) pinInfo[11];
    abd_ePin[ABD_R] = (int) pinInfo[14];
  }

  abd_intTabSetup = 1;
}


void interpolate2(int *ltmp, int *rtmp)
{
  
  short left = (short) *ltmp;
  short right = (short) *rtmp;

  /////print("\netpsL = %d, etpsR = %d\n\n", etpsL, etpsR);

  int listep;
  int limit;
  short lookupval;

  if(left > 0)
  {
    listep = 1;
    limit = abd_elCnt[ABD_L];
    lookupval = left;
  }
  else
  {
    listep = -1;
    limit = 0;
    lookupval = -left;
  }

  int rprev = abd_cntrIdx[ABD_L];

      if((CNT - abd_tdst) >= abd_td) abd_sample();

  for(int r = abd_cntrIdx[ABD_L]; r != limit; r+=listep)
  {
    if(spdL[r] == lookupval)
    {
      left = pwL[r]; 
      break;
    }
    if((spdL[rprev] < lookupval) && (spdL[r] > lookupval))
    {
      short x = ((pwL[r]-pwL[rprev])*(lookupval-spdL[rprev]))/(spdL[r]-spdL[rprev]); 
      left = pwL[rprev] + x; 
      break;
    }
    rprev = r;
  }

  if(right > 0)
  {
    listep = 1;
    limit = abd_elCnt[ABD_L];
    lookupval = right;
  }
  else
  {
    listep = -1;
    limit = 0;
    lookupval = -right;
  }

  rprev = abd_cntrIdx[ABD_R];

  if((CNT - abd_tdst) >= abd_td) abd_sample();

  for(int r = abd_cntrIdx[ABD_R]; r != limit; r+=listep)
  {
    if(spdR[r] == lookupval)
    {
      right = pwR[r]; 
      break;
    }
    if((spdR[rprev] < lookupval) && (spdR[r] > lookupval))
    {
      short x = ((pwR[r]-pwR[rprev])*(lookupval-spdR[rprev]))/(spdR[r]-spdR[rprev]); 
      right = pwR[rprev] + x; 
      break;
    }
    rprev = r;
  }

  if((CNT - abd_tdst) >= abd_td) abd_sample();

  *ltmp = (int) left;
  *rtmp = (int) right;
}


void abd_encoders(void *par)
{

  _servoPulseReps = 0;

  OUTA &= ~(1 << abd_sPin[ABD_L]); 
  OUTA &= ~(1 << abd_sPin[ABD_R]); 
  DIRA |= 1 << abd_sPin[ABD_L]; 
  DIRA |= 1 << abd_sPin[ABD_R]; 

  pause(20);
  //pause(1);

  int temp[2] = {0, 0};
  interpolate2(&temp[ABD_L], &temp[ABD_R]);  

  PHSA = 0;
  PHSB = 0;
  FRQA = 1;
  FRQB = 1;
  CTRA  = abd_sPin[ABD_L] | (4 << 26);
  CTRB  = abd_sPin[ABD_R] | (4 << 26);
   
  phs[ABD_L] = (1500 + temp[ABD_L]);
  phs[ABD_R] = (1500 - temp[ABD_R]);
  
  phsr[ABD_L] = phs[ABD_L];
  phsr[ABD_R] = phs[ABD_R];

  int t = CNT;
  int dt1 = 13*(CLKFREQ/1000);
  int dt2 = 7*(CLKFREQ/1000);

  phs[ABD_L] = phsr[ABD_L];
  phs[ABD_R] = phsr[ABD_R];
  PHSA = -phs[ABD_L]*abd_us;
  PHSB = -phs[ABD_R]*abd_us;
  _servoPulseReps++;
  low(12);
  low(13);

  pause(20);
  PHSA = -phs[ABD_L]*abd_us;
  PHSB = -phs[ABD_R]*abd_us;

  t+=(dt1+dt2);

  stateNow[ABD_L] = (INA >> abd_ePin[ABD_L]) & 1;
  statePrev[ABD_L] = stateNow[ABD_L];
  state[ABD_L] = stateNow[ABD_L];
  stateNow[ABD_R] = (INA >> abd_ePin[ABD_R]) & 1;
  statePrev[ABD_R] = stateNow[ABD_R];
  state[ABD_R] = stateNow[ABD_R];

  while(!_servoPulseReps);

  abd_tdst = CLKFREQ/abd_dsr;                       // time of distance sample
  abd_td = CNT + abd_tdst;                          // time of distance
  _sprOld = _servoPulseReps;

  abd_ed[ABD_L] = 0;                                      // error distance left
  abd_ed[ABD_R] = 0;                                      // error distance right

  abd_p[ABD_L] = 0;                                       // proportional left
  abd_p[ABD_R] = 0;                                       // proportional right

  abd_i[ABD_L] = 0;                                   // integral left
  abd_i[ABD_R] = 0;                                   // integral right

  //int maxIR = 0;
  int maxIL = 0;

  #ifdef test_t_interval
  int n = 0;
  #endif

  // Main control system loop.

  while(1)
  {  
    if((CNT - abd_tdst) >= abd_td) abd_sample();

    // Calculate and deliver servo pulses. 
    if((CNT - t) >= (dt1 + dt2))
    {
      t+=(dt1+dt2);
      _sprOld = _servoPulseReps;
      pcount++;

      for(int lr = 0; lr <= 1; lr++)
      {  
        if((CNT - abd_tdst) >= abd_td) abd_sample();

        input(14);

        if((abd_gotoFlag[ABD_L] != 0) || (abd_gotoFlag[ABD_R] != 0)
        || (abd_dvFlag[ABD_L] != 0) || (abd_dvFlag[ABD_R] != 0))
        {
          abd_ditherAa[lr] += abd_ditherA[lr];
          abd_ditherAd[lr] = (abd_ditherAa[lr]/50) - (abd_ditherAp[lr]/50);
          abd_ditherAp[lr] = abd_ditherAa[lr];
        }

        if((abd_gotoFlag[ABD_L] != 0) || (abd_gotoFlag[ABD_R] != 0))
        {
          abd_ditherVa[lr] += abd_ditherV[lr];
          abd_ditherVd[lr] = (abd_ditherVa[lr]/50) - (abd_ditherVp[lr]/50);
          abd_ditherVp[lr] = abd_ditherVa[lr];
        }
        
        // Set velocities if executing a goto
        if(abd_gotoFlag[lr] == 1)
        {
          // Calculate velocity and acceleration based on distance remaining.
          if(abd_speed[lr] != 0)
          {
            abd_ticksGuard[lr] = (abd_speed[lr] * abd_abs(abd_speed[lr])) / (100 * abd_rampStep[lr]);
          }          
          if(abd_abs(abd_ticksf[lr] - abd_ticks[lr]) > ((abd_abs(abd_ticksGuard[lr]) + abd_abs(abd_ditherVd[lr]))))   //18
          {
            if(abd_ticksf[lr] > abd_ticks[lr])
            {
              abd_speedT[lr] = abd_speedLimit[lr] + abd_ditherVd[lr];
            }
            else if(abd_ticksf[lr] < abd_ticks[lr])
            {
              abd_speedT[lr] = -abd_speedLimit[lr] - abd_ditherVd[lr];
            }
          }            
          else
          {
            if((CNT - abd_tdst) >= abd_td) abd_sample();
            abd_speedT[lr] = 0;
            abd_gotoFlag[lr] = 2;
          }          
        }

        if((CNT - abd_tdst) >= abd_td) abd_sample();

        
        // Nudge to final position
        if((((abd_gotoFlag[lr] == 2) && (abd_stopCtr[lr] == 0) && (abd_speed[lr] == 0) && (abd_speedOld[lr] == abd_speed[lr]))) 
        || (((abd_gotoFlag[lr] == 3) && (abd_stopCtr[lr] == 0))))
        {
          if((CNT - abd_tdst) >= abd_td) abd_sample();

          abd_distError[lr] = abd_ticksf[lr] - abd_ticks[lr];
          if(abd_distError[lr] == 0)
          {
            abd_gotoFlag[lr] = 0;
            abd_nudgeCtr[lr] = 0;
            abd_speed[lr] = 0; //18
          }
          else
          { 
            abd_nudgeCtr[lr]++;
            sign[lr] = abd_abs(abd_distError[lr]) / abd_distError[lr];
            abd_speed[lr] = (sign[lr] * ABD_NUDGE_SPEED);
            abd_gotoFlag[lr] = 3; //18
          }          
        }
        
        // Clamp encoded speed
        if(abd_speedT[lr] > abd_speedLimit[ABD_B]) abd_speedT[lr] = abd_speedLimit[ABD_B];
        if(abd_speedT[lr] < -abd_speedLimit[ABD_B]) abd_speedT[lr] = -abd_speedLimit[ABD_B];

        if((CNT - abd_tdst) >= abd_td) abd_sample();

        // If new abd_speedT[ABD_L]/RT set point, calculate abd_speed[ABD_L]/R step toward each 
        // abd_speedT[ABD_L]/RT in steps.
        if((abd_stopCtr[lr] == 0) && (abd_gotoFlag[lr] != 3))
        {
          if(abd_speedT[lr] > (abd_speed[lr] + abd_rampStep[lr]))
          {
            abd_speed[lr] = abd_speed[lr] + abd_rampStep[lr] + abd_ditherAd[lr];
          }          
          //else if(abd_speedT[lr] < (abd_speed[lr] - abd_rampStep[ABD_B])) 
          else if(abd_speedT[lr] < (abd_speed[lr] - abd_rampStep[lr])) 
          {
            abd_speed[lr] = abd_speed[lr] - abd_rampStep[lr] - abd_ditherAd[lr];
          }          
          else abd_speed[lr] = abd_speedT[lr];
        }  

        //                    ----> DO NOT DELETE <----
        // This would force a stop on any direction change, even in velocity mode.
        // It seemed to decrease performance, so it is commented for now.  
        /*
        if( ((abd_speedOld[lr] < 0) && (abd_speed[lr] > 0)) || ((abd_speedOld[lr] > 0) && (abd_speed[lr] < 0)) )
        {
          abd_speed[lr] = 0;
        } 
        */       

        if( (abd_speedOld[lr] != abd_speed[lr]) && (abd_speed[lr] == 0) )
        {
          abd_stopCtr[lr] = abd_stopPulseReps[lr];
        }        

        abd_speedOld[lr] = abd_speed[lr];     
        temp[lr] = abd_speed[lr];
        
      }  // for(int lr = 0; lr <= 1; lr++)

      if((CNT - abd_tdst) >= abd_td) abd_sample();
         
      interpolate2(&temp[ABD_L], &temp[ABD_R]);
      
      if((CNT - abd_tdst) >= abd_td) abd_sample();

      ssi[ABD_L] = temp[ABD_L];
      ssi[ABD_R] = -temp[ABD_R];

      // Calculate distance error, then respond with PI control.
      // Distance is accumulated at 400 Hz
      for(int lr = ABD_L; lr <= ABD_R; lr++)
      {
    
        if((CNT - abd_tdst) >= abd_td) abd_sample();
        // Notes: Calculated from abd_sample()         
          //abd_dca[ABD_L] += abd_speed[ABD_L];
          //abd_dca[ABD_R] += abd_speed[ABD_R];
          //abd_dc[ABD_L] = abd_dca[ABD_L]/abd_dsr;
          //abd_dc[ABD_R] = abd_dca[ABD_R]/abd_dsr;                             

        if(encoderFeedback)
        {
          input(14);
          // Error ticks = calculated - measured 
          abd_ed[lr] = abd_dc[lr] - abd_ticks[lr];

          // abd_ea[lr] += abd_ed[lr]; // Replaced 170612
          if(abd_ed[lr] > abd_edMax)
          {
            abd_ed[lr] = abd_edMax;
            abd_dc[lr] = abd_ticks[lr] + abd_edMax;
            abd_dca[lr] = abd_dc[lr] * abd_dsr;
          }
          else if(abd_ed[lr] < -abd_edMax)
          {
            abd_ed[lr] = -abd_edMax;
            abd_dc[lr] = abd_ticks[lr] - abd_edMax;
            abd_dca[lr] = abd_dc[lr] * abd_dsr;
          }
          else
          {
            // Integral error accumulation
            abd_ea[lr] += abd_ed[lr];
          }            

          
          if(abd_speed[lr] != 0)
          {
            //iL += edL;
            if(abd_speed[lr] > 0)
            {
              abd_p[lr] = abd_ed[lr] * (3+(abd_speed[lr]/10));  
              if((abd_ed[lr]>0) && (abd_ed[lr] != abd_edMax))abd_i[lr]+=1; else if((abd_ed[lr]<0) && (abd_ed[lr] != -abd_edMax)) abd_i[lr]-=1;
            }
            else if(abd_speed[lr] < 0)
            {
              abd_p[lr] = abd_ed[lr] * (-3+(abd_speed[lr]/10));  
              if((abd_ed[lr]>0) && (abd_ed[lr] != abd_edMax))abd_i[lr]-=1; else if((abd_ed[lr]<0) && (abd_ed[lr] != -abd_edMax)) abd_i[lr]+=1;
            }

            if((CNT - abd_tdst) >= abd_td) abd_sample();
  
            maxIL = abd_speed[lr];
            if(maxIL < 0) maxIL = -maxIL;
            if(abd_i[lr] > maxIL) abd_i[lr] = maxIL;
            if(abd_i[lr] < -maxIL) abd_i[lr] = -maxIL;
  
            int tsign;
            if(lr == ABD_L) {tsign = 1;} else {tsign = -1;}
          
            if(abd_speed[lr] > 0)
              drive[lr] = (tsign * abd_i[lr]) + (tsign * abd_p[lr]) + ssi[lr] + 1500;
            if(abd_speed[lr] < 0)
              drive[lr] = (tsign * (-abd_i[lr])) - (tsign * abd_p[lr]) + ssi[lr] + 1500;
          }
          else
          {
            drive[lr] = ssi[lr] + 1500;
            abd_i[lr] = 0;
          }

          phsr[lr] = drive[lr]; 
        }  
        else // if(!encoder_feedback)
        {
          phsr[lr] = ssi[lr] + 1500;
        }

        phs[lr] = phsr[lr];

        if(abd_speed[lr] != 0)
        {
          if(lr == ABD_L)
          {
            PHSA = -phs[lr]*abd_us;
          }            
          else
          {
            PHSB = -phs[lr]*abd_us;  
          }            
        }        
        else
        {
          if(lr == ABD_L)
          {
            PHSA = 0;
          }            
          else
          {
            PHSB = 0;  
          }            
          if(abd_stopCtr[lr] > 0)
            abd_stopCtr[lr]--;
          if(abd_stopCtr[lr] == 0)
          {
            abd_ed[lr] = 0;
            //abd_dc[lr] = 0;
            abd_ea[lr] = 0;
            abd_dc[lr] = abd_ticks[lr];
            //abd_dca[lr] = abd_dc[lr] * 400;
            abd_dca[lr] = abd_dc[lr] * abd_dsr;
            //abd_gotoFlag[ABD_ABD_L] = 0;
          }           
        }         
      }  //for etc        
      _servoPulseReps++;
    }
  }
}



void abd_sample(void)
{
  abd_td += abd_tdst;                                     // Reset sample timer         '
  abd_sampleCount++;
  
  for(int rl = ABD_L; rl <= ABD_R; rl++)
  {
    stateNow[rl] = ((INA >> abd_ePin[rl]) & 1);
    if( (stateNow[rl] == statePrev[rl]) && (state[rl] != stateNow[rl]) )
    {
      state[rl] = stateNow[rl];
      statePrev[rl] = stateNow[rl];
      //if( ((rl == ABD_L) && (phs[rl] == 0)) || ((rl == ABD_R) && (phs[rl] == 0)) )
      if( ((rl == ABD_L) && (PHSA == 0)) || ((rl == ABD_R) && (PHSB == 0)) )
      {
        abd_ticks[rl] += abd_zdir[rl];
      }          
      //if(phs[rl] > cntrVal[rl] + 1500)
      else if( ( (rl == ABD_L) && (phs[rl] > (cntrVal[rl] + 1500)) ) || ((rl == ABD_R) && (phs[rl] < (1500 - cntrVal[rl]))) )
      {
        abd_ticks[rl]++;
        abd_zdir[rl] = 1;
      }
      //else if(phs[rl] < cntrVal[rl] + 1500)
      else if( ( (rl == ABD_L) && (phs[rl] < (cntrVal[rl] + 1500)) ) || ((rl == ABD_R) && (phs[rl] > (1500 - cntrVal[rl]))) )
      {
        abd_ticks[rl]--;
        abd_zdir[rl] = -1;
      }
      else
      {
        abd_ticks[rl] += abd_zdir[rl];
      }
      //
    }
    else
    {
      statePrev[rl] = stateNow[rl];
    }      
  }

  // Calculated distance accumulator

  #ifdef test_t_interval
    if( (n*4) < (sizeof(rec_t)-8) )
      rec_t[n++] = CNT;  
  #endif

  //  Every sampling rate x per second d*c is the calculated distance:
  //    accumulator add number ot ticks per second you want the wheel to turn
  //    calculated = accumulator / sampling rate
  //  In other words, if you are adding the number of ticks per second you want
  //  at a rate of 400x/second, you'll need to divide that accumulated value by
  //  400.

  // distance calculated (accumulated) += encoder ticks per second requested  
  //abd_dca[ABD_L] += etpsL;                              // + velocityL for dt
  //abd_dca[ABD_R] += etpsR;                              // + velocityR for dt
  abd_dca[ABD_L] += abd_speed[ABD_L];                              // + velocityL for dt
  abd_dca[ABD_R] += abd_speed[ABD_R];                              // + velocityR for dt
  
  // distance calculated = distance calculated (accumulated) / sampling rate
  abd_dc[ABD_L] = abd_dca[ABD_L]/abd_dsr;                     // ticks expected
  abd_dc[ABD_R] = abd_dca[ABD_R]/abd_dsr;                             
}


/*
//                    ----> DO NOT DELETE <----
// This was the previous incarnation of the sample function.  
void abd_sample(void)
{
  abd_td += abd_tdst;                                     // Reset sample timer         '
  abd_sampleCount++;
  
  for(int rl = ABD_L; rl <= ABD_R; rl++)
  {
    if(((INA >> abd_ePin[rl]) & 1) != state[rl])
    {
      state[rl] = (~state[rl]) & 1;
      //if( ((rl == L) && (phs[rl] == 0)) || ((rl == R) && (phs[rl] == 0)) )
      if( ((rl == ABD_L) && (PHSA == 0)) || ((rl == ABD_R) && (PHSB == 0)) )
      {
        abd_ticks[rl] += abd_zdir[rl];
      }          
      //if(phs[rl] > cntrVal[rl] + 1500)
      else if( ( (rl == ABD_L) && (phs[rl] > (cntrVal[rl] + 1500)) ) || ((rl == ABD_R) && (phs[rl] < (1500 - cntrVal[rl]))) )
      {
        abd_ticks[rl]++;
        abd_zdir[rl] = 1;
      }
      //else if(phs[rl] < cntrVal[rl] + 1500)
      else if( ( (rl == ABD_L) && (phs[rl] < (cntrVal[rl] + 1500)) ) || ((rl == ABD_R) && (phs[rl] > (1500 - cntrVal[rl]))) )
      {
        abd_ticks[rl]--;
        abd_zdir[rl] = -1;
      }
      else
      {
        abd_ticks[rl] += abd_zdir[rl];
      }
    }
  }

  // Calculated distance accumulator

  #ifdef test_t_interval
    if( (n*4) < (sizeof(rec_t)-8) )
      rec_t[n++] = CNT;  
  #endif

  //  Every sampling rate x per second d*c is the calculated distance:
  //    accumulator add number ot ticks per second you want the wheel to turn
  //    calculated = accumulator / sampling rate
  //  In other words, if you are adding the number of ticks per second you want
  //  at a rate of 400x/second, you'll need to divide that accumulated value by
  //  400.

  // distance calculated (accumulated) += encoder ticks per second requested  
  //abd_dca[L] += etpsL;                              // + velocityL for dt
  //abd_dca[R] += etpsR;                              // + velocityR for dt
  abd_dca[ABD_L] += abd_speed[ABD_L];                              // + velocityL for dt
  abd_dca[ABD_R] += abd_speed[ABD_R];                              // + velocityR for dt
  
  // distance calculated = distance calculated (accumulated) / sampling rate
  abd_dc[ABD_L] = abd_dca[ABD_L]/abd_dsr;                     // ticks expected
  abd_dc[ABD_R] = abd_dca[ABD_R]/abd_dsr;                             
}
*/






/*
        //  test 170412
        //                    ----> DO NOT DELETE <----
        // This nudge correction has states for responding to overcorrection.
        // It needs tuning.
        if((( ((abd_gotoFlag[lr] == 2) || (abd_gotoFlag[lr] == 4)) && (abd_stopCtr[lr] == 0) && (abd_speed[lr] == 0))) 
        || (((abd_gotoFlag[lr] == 3))))// && (abd_stopCtr[lr] == 0))))
        {
          if((CNT - abd_tdst) >= abd_td) abd_sample();
          abd_distError[lr] = abd_ticksf[lr] - abd_ticks[lr];
          sign[lr] = abd_abs(abd_distError[lr]) / abd_distError[lr];


          if(abd_distError[lr] == 0)
          {
            if(abd_gotoFlag[lr] == 2)
            {
              abd_gotoFlag[lr] = 4;
              abd_speed[lr] = 0;
            }
            else if(abd_gotoFlag[lr] == 3)
            {
              abd_speed[lr] = 0;
              abd_gotoFlag[lr] = 4;
            } 
            else if(abd_gotoFlag[lr] == 4)
            {
              abd_gotoFlag[lr] = 0;
              abd_speed[lr] = 0;
              abd_nudgeCtr[lr] = 0;
            } 
          }
          else if(abd_distError[lr] != 0)
          {
            if(abd_gotoFlag[lr] == 2)
            {
              abd_nudgeCtr[lr]++;
              abd_speed[lr] = (sign[lr] * ABD_NUDGE_SPEED);
              abd_gotoFlag[lr] = 3; //18
            } 
            else if(abd_gotoFlag[lr] == 3)
            {
              
            } 
            else if(abd_gotoFlag[lr] == 4)
            {
              abd_gotoFlag[lr] = 2;
            } 
          }                                     
          //
        
                  
        } // End of for(int lr = 0; lr <= 1; lr++) that follows while(1) main loop
*/