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







//#ifdef interactive_development_mode
void drive_displayInterpolation(void)
{
  //
  if(!abd_intTabSetup) interpolation_table_setup();
  
  print("\rINTERPOLATION TABLE DATA\r\r");
 
  print("=== LEFT SERVO ===\n\n");
  print("Table Entries = %d\nZero Speed Index = %d\n\n", abd_elCnt[ABD_L], abd_cntrIdx[ABD_L]);
  print("Index\tServo Drive\tEncoder Ticks/Second\n");
  print("-----\t-----------\t--------------------\n");
  for(int r = 0; r < abd_elCnt[ABD_L]; r++)
  {
    print("%d\t%d\t\t%d\n", r, abd_spdrL[r], abd_spdmL[r]);
  }
  
  print("\n\n=== RIGHT SERVO ===\n\n");
  print("Table Entries = %d\nZero Speed Index = %d\n\n",  abd_elCnt[ABD_R], abd_cntrIdx[ABD_R]);
  print("Index\tServo Drive\tEncoder Ticks/Second\n");
  print("-----\t-----------\t--------------------\n");
  for(int r = 0; r < abd_elCnt[ABD_R]; r++)
  {
    print("%d\t%d\t\t%d\n", r, abd_spdrR[r], abd_spdmR[r]);
  }
  
  //getchar();  
  //#endif
  //
}
//#endif // interactive_development_mode

/*
//#ifdef interactive_development_mode
void drive_trimDisplay(void)
{
  //
  if(!abd_intTabSetup) interpolation_table_setup();

  print("trimFL %d, trimFR %d, trimBL %d, trimBR %d, trimticksF %d, trimticksB %d\n",
         abd_trimF[L], abd_trimF[R], abd_trimB[L], abd_trimB[R], abd_trimticksF, abd_trimticksB);
  //       
}
//#endif // interactive_development_mode
*/


