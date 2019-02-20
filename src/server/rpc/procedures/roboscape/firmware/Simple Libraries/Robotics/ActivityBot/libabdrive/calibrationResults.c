#include "abdrive.h"

#ifdef _monitor_
  volatile char abd_str[128];
#endif

//#define test_t_interval
#ifdef test_t_interval
  volatile int rec_t[8000 / 4];
#endif


//volatile int abd_record;               // Record values to an array

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
volatile int abd_dsr;                                // Distance sampling rate
volatile int abd_zeroDelay;
volatile int abd_us;
volatile int abd_intTabSetup;

//static int cog;
//static int servoCog2 = 0;
//static unsigned int stack[44 + 252];
//static unsigned int stack[44 + 352];
//static unsigned int servoStack[(160 + (150 * 4)) / 4];

//int abd_spdrL[120];
//int abd_spdmL[120];
//int abd_spdrR[120];
//int abd_spdmR[120];
short abd_spdrL[120];
short abd_spdmL[120];
short abd_spdrR[120];
short abd_spdmR[120];

//static int a = 0;
volatile int r;

int abd_eeAddr;

//static volatile int trimctr;
//static volatile int dca, trimticks;

static volatile int kp[6];

static volatile int ridx;

//static volatile int *pwL;
//static volatile int *pwR;
//static volatile int *spdL;
//static volatile int *spdR;

static volatile int pcount;
static volatile unsigned int _sprOld;

//static volatile int phsL;
//static volatile int phsR;
//static volatile int phs[L];
//static volatile int phs[R];
static volatile int phs[2];

static volatile int phsr[2];

//static int trimFunction;
//static int encoderFeedback;

volatile int abd_blockGoto;

// drive_trimset
//volatile int abd_trimF[2];
//volatile int abd_trimB[2];

//volatile int abd_trimticksF;
//volatile int abd_trimticksB;

volatile int abd_speedOld[2];
volatile int abd_stopCtr[2];

volatile int abd_stopPulseReps[2];
// Measured distance left/right
volatile int abd_ticks[2];                                
// Target speed left/right
volatile int abd_speedT[2];                                   
// Current requested speed
volatile int abd_speed[2];   

                                 
volatile int abd_ticksi[2];


volatile int abd_ticksf[2];


volatile int abd_gotoFlag[2];

volatile int abd_rampStep[3];
volatile int abd_speedLimit[4];

volatile int abd_ticksGuard[2];

// distance calculated
volatile int abd_dc[2];                                      

// distance calculated (accumulated)
volatile int abd_dca[2];                                 

// error distance 
volatile int abd_ed[2];                                      

// proportional
volatile int abd_p[2];

// integral
volatile int abd_i[2];

// Accumulated errors L/R
volatile int abd_ea[2];                                  


// servoPins
volatile int abd_sPin[2];

// Encoder Pins 
volatile int abd_ePin[2];

// display
volatile int abd_elCnt[2];    // ?????? Instance count different
volatile int abd_cntrIdx[2];


// Center values
static volatile int cntrVal[2];
static volatile int ti[2];
static volatile int state[2];
// servo speeed interpolated
static volatile int ssi[2];
static volatile int drive[2];

static volatile int speedPrev[2];
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
volatile int abd_dvFlag[2];

int abd_abs(int value);


/*
int abd_checkForSwappedCables(void)
{
  int state = 0;
  if( (abd_elCnt[ABD_L] == 80) && (abd_cntrIdx[ABD_L] == 0))
  {
    state |= (1 << 0);
  }
  if( (abd_elCnt[ABD_R] == 80) && (abd_cntrIdx[ABD_R] == 0))
  {
    state |= (1 << 1);
  }
  return state;  // Left 1, right 2, both 3
}      
*/

int abd_checkActivityBotStrings(void)
{
  int state = 0;
  char str[4];
  ee_getStr((unsigned char *) str, 3, _ActivityBot_EE_Start_ + 12);
  if(strncmp(str, "spL", 3) != 0) state |= (1 << 0);
  /*
  for(int n = 0; n <= 2; n++)
  {
    if(str[n] >= ' ' && str[n] <= 'z')
    {
      print("%c", str[n]);
    }
    else
    {
      print("[%d]", str[n]);
    }
  }      
  print("\rcomparison = %d\r", strncmp(str, "spL", 3));
  */

  ee_getStr((unsigned char *) str, 3, _ActivityBot_EE_Start_ + 20);
  if(strncmp(str, "epL", 3) != 0) state |= (1 << 1);

  return state;

  /*
  for(int n = 0; n <= 2; n++)
  {
    if(str[n] >= ' ' && str[n] <= 'z')
    {
      print("%c", str[n]);
    }
    else
    {
      print("[%d]", str[n]);
    }
  }      
  print("\rcomparison = %d\r", strncmp(str, "epL", 3));
  */
  //print("string = %s\r", str);
}  
  


int abd_checkForSwappedCables(void)
{
  int state = 0;
  int deviations = 25;
  int sum = 0;
  int avgPt = (int)((abd_spdmL[2] + abd_spdmL[3] + abd_spdmL[4]) / 3);
  if
  (
    (avgPt < 60) 
      //&& 
    //(avgPt > 0)
  )
  {
    for(int n = 5; n < 30; n ++)
    {
      sum += abd_spdmL[n];
      if(abd_abs((int)(abd_spdmL[n] - avgPt)) < 8)
      {
        deviations--;
      }
      //print("deviations = %d\r", deviations);
    }
    if((deviations < 4) && (sum != 0)) state |= (1 << 0);
  }    

  deviations = 17;
  avgPt = (int)((abd_spdmR[50] + abd_spdmR[51] + abd_spdmR[52]) / 3);
  sum = 0;
  if
  (
    (avgPt < 50) 
      //&& 
    //(avgPt > 0)
  )
  {  
    for(int n = 53; n < 53 + 17; n ++)
    {
      sum += abd_spdmR[n];
      if(abd_abs((int)(abd_spdmR[n] - avgPt)) < 8)
      {
        deviations--;
      }
    }
    if((deviations < 4) && (sum != 0)) state |= (1 << 1);
  }
  return state;  // Left 1, right 2, both 3
}      


int abd_checkForNoSignal(void)
{
  int state = 0;
  if( (abd_elCnt[ABD_L] == 67) && (abd_cntrIdx[ABD_L] == 1))
  {
    state |= (1 << 0);
  }
  if( (abd_elCnt[ABD_R] == 199) && (abd_cntrIdx[ABD_R] == 49))
  {
    state |= (1 << 1);
  }
  return state;  // Left 1, right 2, both 3
}  


int abd_checkCenterPulseWidth(void)
{
  int state = 0;
  if( (abd_abs(abd_spdrL[abd_cntrIdx[ABD_L]]) > 45) )
  {
    state |= (1 << 0);
  }
  if( (abd_abs(abd_spdrR[abd_cntrIdx[ABD_R]]) > 45) )
  {
    state |= (1 << 1);
  }
  return state;
}      


int abd_checkServoCalSupply(int side)
{
  int sum = 1;
  for(int n = 1; n <= 10; n++)
  {
    if(side == ABD_L)
    {
      sum += abd_spdmL[n];
      sum += (abd_spdmL[abd_elCnt[side] - 1 - n]);
    }
    else      
    {
      sum += abd_spdmR[n];
      sum += (abd_spdmR[abd_elCnt[side] - 1 - n]);
    }
  }
  return sum/20;
}


void abd_displaySide(int side, char *s)
{
  switch(side - 1)
  {
    case ABD_L:
    {
      sprint(s, "the ActivityBot's left ");
      break;
    }
    case ABD_R:
    {
      sprint(s, "the ActivityBot's right ");
      break;
    }
    case ABD_B:
    {
      sprint(s, "either of the ActivityBot's ");
      break;
    }
    case (ABD_B + 1):
    {
      sprint(s, "both of the ActivityBot's ");
      break;
    }
  }    
}
  

void drive_calibrationResults(void)
{
  char s[20];
  if(!abd_intTabSetup) interpolation_table_setup();
  int cfgStrs = abd_checkActivityBotStrings();
  int cables = abd_checkForSwappedCables();
  int noSignal = abd_checkForNoSignal();
  int centerError = abd_checkCenterPulseWidth();
  int supplyL = abd_checkServoCalSupply(ABD_L);
  int supplyR = abd_checkServoCalSupply(ABD_R);
  
  /*
  print("%d swapped cable errors\r", cables);
  print("%d missing encoder signals\r", noSignal);
  print("%d servos need centering\r", centerError);
  print("%d average max speed on left\r", supplyL);
  print("%d average max speed on right\r\r", supplyR);
  */  
  
  if
  (
    (cfgStrs == 0)
      &&
    (cables == 0)
      &&
    (noSignal == 0)
      &&
    (centerError == 0)
      &&
    (supplyL >= 150)
      &&
    (supplyR >= 150)
      &&
    (supplyL < 205)
      &&
    (supplyR < 205)
  )
  {
    print("The calibration completed successfully!\r\r");
    print("Have fun with your ActivityBot.  Make sure\r\r");
    print("to try the activities at learn.parallax.com.\r\r");
  }    
  else
  {
    print("One or more problems were detected.  For\r");
    print("help, go to the troubleshooting page in\r");
    print("the learn.parallax.com tutorial you are\r");
    print("following.\r\r");
    print("Details:\r\r");
    
    pause(10);
    //    
    if(cfgStrs)
    {
      print("It does not look like the calibration\r");
      print("procedure has been completed.\r\r");
    }
    //
    if(
        //(noSignal != 3) 
          //&& 
        cables
      )
    {
      print("Either your ActivityBot's servo cables\r");
      print("or its encoder cables are swapped.\r\r");
    }
    
    if(noSignal && (cables == 0))
    {
      print("The Propeller cannot detect\r");
      abd_displaySide(noSignal, s);
      print("%s", s);
      print("encoder signal(s).\r\r");
    }      
    
    if
    (
      centerError
        &&
      !
      (
        cables
          ||
        noSignal
      )  
    )
    {
      if(centerError == 3) centerError = 4;
      print("The servo on \r");
      abd_displaySide(centerError, s);
      print("%s", s);
      print("side(s) needs mechanical\r");
      print("calibration.\r\r");
    }
    
    if
    (
      !
      (
        cables
          ||
        noSignal  
          ||
        centerError
      )
    )
    {        
      int supply = (supplyL + supplyR) / 2;
      if(supply < 100)
      {
        print("The ActivityBot's batteries are either\r");
        print("really dead, or one of the cells is in\r");
        print("the battery holder backwards.  A short \r");
        print("circuit in the prototyping area could also \r");
        print("explain the slow-moving behavior.\r\r");
      }
      else if(supply < 140)
      {
        print("The ActivityBot's batties are either dead,\r");
        print("or the P13/P12 PWR select jumper is still at\r");
        print("the 5V setting.  It should be at the VIN\r");
        print("setting.\r\r");
      }
      else if(supply < 150)
      {
        print("The ActivityBot's batteries are too low.\r");
        print("Try a new set of 5 alkaline batteries, or\r");
        print("recharge your power pack to the 7 to 8 V range.\r\r");
      }      
      else if(supply > 205)
      {
        print("Yikes! Servo speeds indicate your\r");
        print("ActivityBot may have a power pack that's\r");
        print("more than 8.5 V.  Use an appropriate\r");
        print("power source to avoid servo damage.\r\r");
      }
    }            
  }    
}


/*
void drive_calibrationResults(void)
{
  if(!abd_intTabSetup) interpolation_table_setup();
  int cables = abd_checkForSwappedCables();
  int noSignal = abd_checkForNoSignal();
  int centerError = abd_checkCenterPulseWidth();
  int supplyL = abd_checkServoCalSupply(ABD_L);
  int supplyR = abd_checkServoCalSupply(ABD_R);
  
  print("%d swapped cable errors\r", cables);
  print("%d missing encoder signals\r", noSignal);
  print("%d servos need centering\r", centerError);
  print("%d average max speed on left\r", supplyL);
  print("%d average max speed on right\r\r", supplyR);
        
  if(cables == 1) 
  {
    print("Cables are swapped!\r\r");
  }    
}
*/
