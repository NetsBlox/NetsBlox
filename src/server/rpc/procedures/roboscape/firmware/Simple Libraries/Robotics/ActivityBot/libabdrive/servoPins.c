#include "abdrive.h"

void interpolation_table_setup();

#ifdef _monitor_
  volatile char abd_str[128];
#endif

//#define test_t_interval
#ifdef test_t_interval
  volatile int rec_t[8000 / 4];
#endif


volatile int abd_record;               // Record values to an array


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

int abd_spdrL[120];
int abd_spdmL[120];
int abd_spdrR[120];
int abd_spdmR[120];

//static int a = 0;
volatile int r;

int abd_eeAddr;

static volatile int trimctr;
static volatile int dca, trimticks;

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
volatile int abd_trimF[2];
volatile int abd_trimB[2];

volatile int abd_trimticksF;
volatile int abd_trimticksB;

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



void interpolation_table_setup(void);

volatile int abd_sPinL, abd_sPinR;   // Global variables
volatile int abd_ePinL, abd_ePinR;
volatile int abd_us;
volatile int abd_intTabSetup;


void drive_servoPins(int servoPinLeft, int servoPinRight)          // drivePins function
{
  //abd_sPinL = servoPinLeft;                                       // Local to global assignments
  //abd_sPinR = servoPinRight;
  //if(!abd_us) abd_us = CLKFREQ/1000000; 

  int eeAddr = _ActivityBot_EE_Start_  + _ActivityBot_EE_Pins_;
  unsigned char pinInfo[8] = {'s', 'p', 'L', 12, ' ', 'R', 13, ' '};  
  pinInfo[3] = (char) servoPinLeft;
  pinInfo[6] = (char) servoPinRight;

  ee_putStr(pinInfo, 8, eeAddr);
  /*
  if(!abd_intTabSetup)
  {
    interpolation_table_setup();
  }
  */
}

void drive_encoderPins(int encPinLeft, int encPinRight)          // drivePins function
{
  //abd_ePinL = encPinLeft;
  //abd_ePinR = encPinRight;
  //if(!abd_us) abd_us = CLKFREQ/1000000; 

  int eeAddr = 8 + _ActivityBot_EE_Start_  + _ActivityBot_EE_Pins_;
  unsigned char pinInfo[8] = {'e', 'p', 'L', 14, ' ', 'R', 15, ' '};  
  pinInfo[3] = (char) encPinLeft;
  pinInfo[6] = (char) encPinRight;

  ee_putStr(pinInfo, 8, eeAddr);

  /*
  if(!abd_intTabSetup)
  {
    interpolation_table_setup();
  }
  */
}

void drive_pins(int servoPinLeft, int servoPinRight, int encPinLeft, int encPinRight)          // drivePins function
{
  drive_servoPins(servoPinLeft, servoPinRight);
  drive_encoderPins(encPinLeft, encPinRight);
}



