//#define _monitor_

#include "abdrive.h"

volatile int abd_speedLimit[4];
volatile int abd_intTabSetup;
volatile int abd_dist[2];
volatile int abd_ticks[2];                                
volatile int abd_ticksf[2];
volatile int abd_ticksi[2];
volatile int abd_gotoFlag[2];
volatile int abd_dvFlag[2];
volatile int abd_rampStep[3];
volatile int abd_gotoRampStep[3];
volatile int abd_speedLimit[4];
volatile int abd_gotoSpeedLimit[4];
volatile int abd_ditherA[2];
volatile int abd_ditherAa[2];
volatile int abd_ditherAd[2];
volatile int abd_ditherAp[2];
volatile int abd_blockGoto;
volatile int abd_ditherV[2];
volatile int abd_ditherVa[2];
volatile int abd_ditherVd[2];
volatile int abd_ditherVp[2];
volatile int abd_stopCtr[2];

#ifdef _monitor_
  volatile char abd_str[128];
#endif


void interpolation_table_setup();
void set_drive_speed(int left, int right);
int abd_abs(int value);


void drive_goto(int left, int right)
{
  // Patch to prevent certain combinations of initial speeds 
  // from putting drive_goto into a mode that doesn't terminate.
  //
  if( (abd_dvFlag[ABD_L] == 1) || (abd_dvFlag[ABD_R] == 1))
  {
    drive_speed(0, 0);
  } 
  //   
  
  int rampStepSave = abd_rampStep[ABD_B];
  abd_rampStep[ABD_B] = abd_gotoRampStep[ABD_B];

  int topSpeedSave = abd_speedLimit[ABD_B];
  abd_speedLimit[ABD_B] = abd_gotoSpeedLimit[ABD_B];

  //sprint("\r\r\rdrive_goto(%d, %d)\r\r", left, right);
  if(!abd_intTabSetup)
  {
    interpolation_table_setup();
    set_drive_speed(0, 0);
  }
  
  abd_dist[ABD_L] = left;
  abd_dist[ABD_R] = right;
  
  for(int lr = 0; lr <=1; lr++)
  {

    if(abd_abs(abd_ticksf[lr] - abd_ticks[lr]) < 6)
    {
      abd_ticksi[lr] = abd_ticksf[lr];
    }
    else
    {
      abd_ticksi[lr] = abd_ticks[lr];
    }        

    abd_ticksf[lr] = abd_ticksi[lr] + abd_dist[lr];
  
    abd_speedLimit[lr] = abd_speedLimit[ABD_B];
    abd_rampStep[lr] = abd_rampStep[ABD_B];
    abd_ditherA[lr] = 0;
    abd_ditherV[lr] = 0;
    
    abd_ditherAa[lr] = 0;
    abd_ditherAd[lr] = 0;
    abd_ditherAp[lr] = 0;
  
    abd_ditherVa[lr] = 0;
    abd_ditherVd[lr] = 0;
    abd_ditherVp[lr] = 0;
  
    abd_gotoFlag[lr] = 1;
    abd_dvFlag[lr] = 0;
    
    
    int Rp, Lp;
    if(lr == 0) {Rp = 1; Lp = 0;} else {Rp = 0; Lp = 1;}
    
    if(abd_abs(abd_dist[Rp]) > abd_abs(abd_dist[Lp]))
    {
      abd_speedLimit[Lp] = abd_speedLimit[ABD_B] * abd_abs(abd_dist[Lp]) / abd_abs(abd_dist[Rp]);
      abd_rampStep[Lp] = abd_rampStep[ABD_B] * abd_abs(abd_dist[Lp]) / abd_abs(abd_dist[Rp]);
  
      abd_ditherA[Lp] = (abd_rampStep[ABD_B] * abd_dist[Lp]) % abd_abs(abd_dist[Rp]);
      abd_ditherA[Lp] *= 50;
      abd_ditherA[Lp] /= abd_abs(abd_dist[Rp]);
      abd_ditherA[Lp] = abd_abs(abd_ditherA[Lp]);
  
      abd_ditherV[Lp] = (abd_speedLimit[ABD_B] * abd_dist[Lp]) % abd_abs(abd_dist[Rp]);
      abd_ditherV[Lp] *= 50;
      abd_ditherV[Lp] /= abd_abs(abd_dist[Rp]);
      abd_ditherV[Lp] = abd_abs(abd_ditherV[Lp]);
    }    
  }    

  #ifdef _monitor_         
  if(abd_blockGoto == 1)
  {
    sprint(abd_str, "\r\rddL%d, spdLimL=%d, rmpStpL=%d dthrAL=%d, dthrVL=%d | "\
          "ddR%d, spdLimL=%d, rmpStpL=%d dthrAL=%d, dthrVL=%d\r\r",
          left, abd_speedLimit[ABD_L], abd_rampStep[ABD_L], abd_ditherA[ABD_L], abd_ditherV[ABD_L],
          right, abd_speedLimit[ABD_R], abd_rampStep[ABD_R], abd_ditherA[ABD_R], abd_ditherV[ABD_R]
          );// 
  }         
  #endif      
        
  if(abd_blockGoto == 1)
  {
    //19 while((abd_gotoFlag[L] != 0) || (abd_gotoFlag[R] != 0));
    while((abd_gotoFlag[ABD_L] != 0) || (abd_gotoFlag[ABD_R] != 0) || (abd_stopCtr[ABD_L] > 0) || (abd_stopCtr[ABD_R] > 0));
    pause(40); //19
    while((abd_gotoFlag[ABD_L] != 0) || (abd_gotoFlag[ABD_R] != 0) || (abd_stopCtr[ABD_L] > 0) || (abd_stopCtr[ABD_R] > 0)); //19
  } 
  #ifdef _monitor_         
  sprint(abd_str, "\r\rddL%d, spdLimL=%d, rmpStpL=%d dthrAL=%d, dthrVL=%d | "\
        "ddR%d, spdLimR=%d, rmpStpR=%d dthrAR=%d, dthrVR=%d\r\r",
        left, abd_speedLimit[ABD_L], abd_rampStep[ABD_L], abd_ditherA[ABD_L], abd_ditherV[ABD_L],
        right, abd_speedLimit[ABD_R], abd_rampStep[ABD_R], abd_ditherA[ABD_R], abd_ditherV[ABD_R]
        );// 
  #endif 
  
  abd_rampStep[ABD_B] = rampStepSave;
  abd_speedLimit[ABD_B] = topSpeedSave;
}
//




