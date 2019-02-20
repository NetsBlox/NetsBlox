//#define _monitor_

#include "abdrive.h"

volatile int abd_speedd[2];
volatile int abd_speedi[2];
volatile int abd_speedT[2];
volatile int abd_speed[2];   
volatile int abd_speedLimit[4];

volatile int abd_rampStep[3];
volatile int abd_stopCtr[2];
volatile unsigned int _servoPulseReps;  
volatile int speedPrev[2];
volatile int abd_cog;
                   

volatile int abd_dvFlag[2];

#ifdef _monitor_
  volatile char abd_str[128];
#endif

//volatile unsigned int abd_stack[44 + 128];
//volatile unsigned int abd_stack[44 + 128];
unsigned int abd_stack[44 + 128];

volatile int abd_ditherA[2];
volatile int abd_ditherAa[2];
volatile int abd_ditherAd[2];
volatile int abd_ditherAp[2];

volatile int abd_ditherV[2];
volatile int abd_ditherVa[2];
volatile int abd_ditherVd[2];
volatile int abd_ditherVp[2];

volatile int abd_gotoFlag[2];
volatile int abd_intTabSetup;


void abd_encoders(void *par);
void interpolation_table_setup(void);
int abd_abs(int value);


void set_drive_speed(int left, int right)
{
  //low(26); low(27);
  /*
  if(encoderFeedback)
  {
    if(left > abd_speedLimit[B]) left = abd_speedLimit[B];
    if(left < -abd_speedLimit[B]) left = -abd_speedLimit[B];
    if(right > abd_speedLimit[B]) right = abd_speedLimit[B];
    if(right < -abd_speedLimit[B]) right = -abd_speedLimit[B];
  }
  */


  abd_speedT[ABD_L] = left;
  abd_speedT[ABD_R] = right;

  abd_speedi[ABD_L] = abd_speed[ABD_L];
  abd_speedi[ABD_R] = abd_speed[ABD_R];
  abd_speedd[ABD_L] = abd_speedT[ABD_L] - abd_speedi[ABD_L];
  abd_speedd[ABD_R] = abd_speedT[ABD_R] - abd_speedi[ABD_R];

  for(int lr = ABD_L; lr <= ABD_R; lr++)
  {
    input(14);
    //abd_speedi[lr] = abd_speed[lr];
    //abd_speedd[lr] = abd_speedT[lr] - abd_speedi[lr];
    //abd_speedLimit[lr] = abd_speedLimit[ABD_B];
    abd_ditherAa[lr] = 0;
    abd_ditherAd[lr] = 0;
    abd_ditherAp[lr] = 0;
    
    abd_ditherVa[lr] = 0;
    abd_ditherVd[lr] = 0;
    abd_ditherVp[lr] = 0;
    
    abd_gotoFlag[lr] = 0;
    abd_dvFlag[lr] = 1;
    abd_speedLimit[lr] = abd_speedLimit[ABD_B];
    abd_rampStep[lr] = abd_rampStep[ABD_B];
    abd_ditherA[lr] = 0;
    abd_ditherV[lr] = 0;
    int Rp, Lp;
    if(lr == 0) {Rp = 1; Lp = 0;} else {Rp = 0; Lp = 1;}
    //
    //sprint(abd_str, "\r\rsdd %d %d\r\r", abd_speedd[Rp], abd_speedd[Lp]); 
    if(abd_abs(abd_speedd[Rp]) > abd_abs(abd_speedd[Lp]))
    {
      //if(Rp == 1) {high(26); low(27);}
      //if(Rp == 0) {high(27); low(26);} 
      //abd_speedLimit[Lp] = abd_speedLimit[B] * abd_abs(abd_speedd[Lp]) / abd_abs(abd_speedd[Rp]);
      abd_rampStep[Lp] = abd_rampStep[ABD_B] * abd_abs(abd_speedd[Lp]) / abd_abs(abd_speedd[Rp]);
  
      abd_ditherA[Lp] = (abd_rampStep[ABD_B] * abd_speedd[Lp]) % abd_abs(abd_speedd[Rp]);
      abd_ditherA[Lp] *= 50;
      abd_ditherA[Lp] /= abd_abs(abd_speedd[Rp]);
      abd_ditherA[Lp] = abd_abs(abd_ditherA[Lp]);
    } 
  }    

  #ifdef _monitor_
  sprint(
        abd_str, "\rvL%d, rspdLimL=%d, rmpStpL=%d dthrAL=%d, dthrVL=%d | "\
        "vR%d, spdLimR=%d, rmpStpR=%d dthrAR=%d, dthrVR=%d\r\r",
        abd_speedT[ABD_L], abd_speedLimit[ABD_L], abd_rampStep[ABD_L], abd_ditherA[ABD_L], abd_ditherV[ABD_L],
        abd_speedT[ABD_R], abd_speedLimit[ABD_R], abd_rampStep[ABD_R], abd_ditherA[ABD_R], abd_ditherV[ABD_R]
        );
  #endif       
  //
  if(!abd_cog)
  {
    /////print("\n\n!!!!! Starting COG !!!!!!\n\n");
    abd_cog = 1 + cogstart(abd_encoders, NULL, abd_stack, sizeof(abd_stack)-1);
  }

  //
  if(abd_stopCtr[ABD_L] || abd_stopCtr[ABD_R])
  {
    while(abd_stopCtr[ABD_L] || abd_stopCtr[ABD_R]);
  }        
  //int n = _servoPulseReps + 6;
  int n = _servoPulseReps + 6;
  while(_servoPulseReps != n);
  if(abd_stopCtr[ABD_L] || abd_stopCtr[ABD_R])
  {
    while(abd_stopCtr[ABD_L] || abd_stopCtr[ABD_R]);
  }        
  //
} 
//

void drive_speed(int left, int right)        // driveSpeeds function
{
  if(!abd_intTabSetup)
  {
    interpolation_table_setup();
    set_drive_speed(0, 0);
  }
  
  if((left != speedPrev[ABD_L]) || (right != speedPrev[ABD_R]))
  {
  
    set_drive_speed(left, right);
    
  }    

  speedPrev[ABD_L] = abd_speedT[ABD_L];
  speedPrev[ABD_R] = abd_speedT[ABD_R];
}


