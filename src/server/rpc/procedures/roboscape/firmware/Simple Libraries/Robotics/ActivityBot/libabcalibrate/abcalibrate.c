#include "abcalibrate.h"    
#include "servo.h"             
#include "simpletools.h" 
#include "simpletext.h"
#include "fdserial.h"

/*
#define _ActivityBot_EE_Start_ 63418
#define _ActivityBot_EE_Pins_ 12
#define _ActivityBot_EE_Trims_ 28
#define _ActivityBot_EE_Left_ 52
#define _ActivityBot_EE_Right_ 1052
#define _ActivityBot_EE_End_ 63418 + 2052
*/

void cal_drive_pins(int servoPinLeft, int servoPinRight, int encPinLeft, int encPinright);
void cal_drive_speeds(int left, int right);
void cal_drive_setramp(int left, int right);
void cal_drive_sleep();
void cal_drive_stop();
void cal_drive_display(void);


static int ticksRprev;

static int spdr[150];
static int spdm[150];
static int a = 0;
static int r = 0;

volatile int ticksL;
volatile int ticksR;
volatile int tcL;
volatile int tcR;

int us;

static int eeAddr;

static volatile int sPinL = 12, sPinR = 13, rampLeft, rampRight;   // Global variables
static volatile int ePinL = 14, ePinR = 15;


void cal_activityBot()
{

 #ifdef xbee_abcalibrate_debug
  fdserial *xbee = fdserial_open(11, 10, 0, 9600);
  writeChar(xbee, CLS);
 #endif

  //dprint(xbee, "%cPress any key...\n", CLS);
  //readChar(xbee);  

  freqout(4, 2000, 3000);      
  cal_drive_pins(sPinL, sPinR, ePinL, ePinR); 

  eeAddr = _ActivityBot_EE_Start_ + _ActivityBot_EE_Trims_;
  ee_putInt(0,     eeAddr +  0);
  ee_putInt(0,     eeAddr +  4);
  ee_putInt(0,     eeAddr +  8);
  ee_putInt(0,     eeAddr + 12);
  ee_putInt(0,     eeAddr + 16);
  ee_putInt(0,     eeAddr + 20);

  int speed = -200;
  int i = 0;
  int dt = CLKFREQ/2;
  int t = CNT;
  int step = 6;
  int tcLav = 0;

  //int eeBaseAddr = 32768;
  //int eeAddrInc = 4;
  //int eeIdx = eeBaseAddr + 16;

  int ticksLprev = ticksL;
  do 
  {
    speed += step;
    TryAgainLeft:

    #ifdef xbee_abcalibrate_debug
    dprint(xbee,"a = %d, speed = %d, ", 
           a, speed);
    #endif

    cal_drive_speeds(speed, 0);
    pause(200);
    ticksLprev = ticksL;
    tcLav = 0;
    spdr[a] = speed;
    for(int i = 0; i < 10; i++)
    {
      while(ticksL <= ticksLprev + 1)
      {
        if((CNT - t) > dt)
        {
          tcL = 0;
          t = CNT;
          break;
        }
        if((tcL == 0)&&(i>0)) break;
      }
      //if(tcL > 0) tcL = -tcL;
      tcLav += tcL;
      //ticksLprev = ticksL;
      t = CNT;
      if((tcL < 20)&&(step == 5))
      {
        //speed -= step;
        //speed += 2;
        step = 2;
      }
      if(tcL > 20) step = 5;
    }
    tcLav /= 10;
    if(tcLav > 210 || tcLav < 0) goto TryAgainLeft;
    spdm[a] = tcLav;

    #ifdef xbee_abcalibrate_debug
    dprint(xbee,"ticksL = %d, tcL = %d, \n", 
           ticksL, tcLav);
    #endif
    a++;
  } while(speed < 200);


  /* TEST CODE - MUST BE COMMENTED OUT */


  //spdm[38] = 0;
  //spdm[33] = 150;

  
  /* /TEST CODE - MUST BE COMMENTED OUT */




  //drive_stop();
  cal_drive_speeds(0, 0);

  // <2013.09.02 removed>
  /*
  for(r = 0; r < a; r++)
  {
    dprint(xbee,"r = %d, spdr = %d, spdm = %d, \n", r, spdr[r], spdm[r]);
  }
  */
  // </2013.09.02 removed>


  // <2013.09.02 added>

  #ifdef xbee_abcalibrate_debug
  dprint(xbee,"Before\n");
  for(r = 0; r < a; r++)
  {
    dprint(xbee,"r = %d, spdr = %d, spdm = %d, \n", r, spdr[r], spdm[r]);
  }
  #endif

  // Look for and correct any measurement errors
  for(r = 1; r < a-1; r++)
  {
    if((spdm[r] > spdm[r-1] + 30) && (spdm[r] > spdm[r+1] + 30)) spdm[r] = (spdm[r+1] + spdm[r-1])/2;
    //if((spdm[r] < spdm[r-1] - 30) && (spdm[r] < spdm[r-1] - 30)) spdm[r] = (spdm[r+1] + spdm[r-1])/2;
  }

  // Look for and correct stray zeros
  for(r = 1; r < a-1; r++)
  {
    if((spdm[r] == 0) && (spdm[r+1] != 0) && (spdm[r-1] != 0)) spdm[r] = (spdm[r+1] + spdm[r-1])/2;
  }

  #ifdef xbee_abcalibrate_debug
  dprint(xbee,"After\n");
  for(r = 0; r < a; r++)
  {
    dprint(xbee,"r = %d, spdr = %d, spdm = %d, \n", r, spdr[r], spdm[r]);
  }
  #endif

  // </2013.09.02 added>



  #ifdef xbee_abcalibrate_debug
  dprint(xbee,"r = %d\n", r);
  #endif

  int zstart = 0;
  int zend = 0;
  int lcnt;

  for(r = 0; r < a; r++)
  {
    if((spdm[r]==0)&&(zstart==0)) zstart = r;
    if((zstart!=0)&&(spdm[r]!=0)&&(zend==0)) zend = r;
  }

  #ifdef xbee_abcalibrate_debug
  dprint(xbee,"zstart = %d, zend = %d\n", zstart, zend);
  #endif


  lcnt = r;

  for(r = 1; r < lcnt-1; r++)
  {  
    if((spdm[r] < 0)||(spdm[r] > 200)) spdm[r] = (spdm[r+1] + spdm[r-1])/2;
  }

  spdr[zstart] = (spdr[zstart] + spdr[zend - 1])/2;

  int subval = zend - zstart - 1;

  for(r = zend; r < lcnt; r++)
  {
    spdr[r - subval] = spdr[r];
    spdm[r - subval] = spdm[r];
  }

  a -= subval;

  #ifdef xbee_abcalibrate_debug
  for(r = 0; r < a; r++)
  {
    dprint(xbee,"r = %d, spdr = %d, spdm = %d, \n", r, spdr[r], spdm[r]);
  }
  #endif

  lcnt = r;

  #ifdef xbee_abcalibrate_debug
  dprint(xbee,"lcnt = %d\n", lcnt);
  dprint(xbee,"zstart = %d\n", zstart);
  #endif

  eeAddr = _ActivityBot_EE_Start_ + _ActivityBot_EE_Left_;

  #ifdef xbee_abcalibrate_debug
  print("left eeAddr = %d\n", eeAddr);
  #endif

  ee_putInt(lcnt, eeAddr);
  eeAddr+=4;
  ee_putInt(zstart, eeAddr);
  eeAddr += 4;
  for(r = 0; r < lcnt; r++)
  {
    //ee_putInt(spdr[r], eeAddr);
    //eeAddr+=4;
    ee_putByte((char) spdr[r], eeAddr);
    eeAddr++;
    pause(10);
    ee_putByte((char) (spdr[r] >> 8), eeAddr);
    eeAddr++;
    pause(10);
    ee_putByte((char) (spdr[r] >> 16), eeAddr);
    eeAddr++;
    pause(10);
    ee_putByte((char) (spdr[r] >> 24), eeAddr);
    eeAddr++;
    pause(10);


    //ee_putInt(spdm[r], eeAddr);
    //eeAddr += 4;  
    ee_putByte((char) spdm[r], eeAddr);
    eeAddr++;
    pause(10);
    ee_putByte((char) (spdm[r] >> 8), eeAddr);
    eeAddr++;
    pause(10);
    ee_putByte((char) (spdm[r] >> 16), eeAddr);
    eeAddr++;
    pause(10);
    ee_putByte((char) (spdm[r] >> 24), eeAddr);
    eeAddr++;
    pause(10);

  }


  // <2013.09.02 removed>
  /*
  for(r = 0; r < 120; r++)
  {
    spdr[r] = 0;
    spdm[r] = 0;
  }
  */
  // </2013.09.02 removed>


  eeAddr = _ActivityBot_EE_Start_ + _ActivityBot_EE_Left_;

  #ifdef xbee_abcalibrate_debug
  print("left eeAddr = %d\n", eeAddr);
  #endif

  lcnt = ee_getInt(eeAddr);
  eeAddr += 4;
  zstart = ee_getInt(eeAddr);
  eeAddr += 4;

  // <2013.09.02 removed>
  /*
  for(r = 0; r < lcnt; r++)
  {
    spdr[r] = ee_getInt(eeAddr);
    eeAddr+=4;
    spdm[r] = ee_getInt(eeAddr);
    eeAddr += 4;  
  }
  */
  // </2013.09.02 removed>
  


  // <2013.09.02 added>
  for(r = 0; r < lcnt; r++)
  {
    if(spdr[r] != ee_getInt(eeAddr)) ee_putInt(spdr[r], eeAddr);
    eeAddr+=4;
    if(spdm[r] != ee_getInt(eeAddr)) ee_putInt(spdm[r], eeAddr);
    eeAddr += 4;  
  }
  // </2013.09.02 added>
  
  #ifdef xbee_abcalibrate_debug
  for(r = 0; r < lcnt; r++)
  {
    dprint(xbee,"r = %d, spdr = %d, spdm = %d, \n", r, spdr[r], spdm[r]);
  }
  dprint(xbee,"\n\nDONE!!!\n\n");
  #endif




  /*============= RIGHT SIDE =============*/



  speed = -200;
  step = 5;
  i = 0;
  dt = CLKFREQ/2;
  t = CNT;
  int tcRav = 0;

  ticksR = 0;
  ticksRprev = ticksR;

  a = 0;

  do 
  {
    speed += step;
    TryAgainRight:

    #ifdef xbee_abcalibrate_debug
    dprint(xbee,"a = %d, speed = %d, ", 
           a, speed);
    #endif

    cal_drive_speeds(0, speed);
    pause(200);
    ticksRprev = ticksR;
    tcRav = 0;
    spdr[a] = speed;
    for(int i = 0; i < 10; i++)
    {
      while(ticksR <= ticksRprev + 1)
      {
        if((CNT - t) > dt)
        {
          tcR = 0;
          t = CNT;
          break;
        }
        if((tcR == 0)&&(i>0)) break;
      }
      //if(tcL > 0) tcL = -tcL;
      tcRav += tcR;
      //ticksLprev = ticksL;
      t = CNT;
      if((tcR < 20)&&(step == 5))
      {
        //speed -= step;
        //speed += 2;
        step = 2;
      }
      if(tcR > 20) step = 5;
    }
    tcRav /= 10;
    if(tcRav > 210 || tcRav < 0) goto TryAgainRight;
    spdm[a] = tcRav;

    #ifdef xbee_abcalibrate_debug
    dprint(xbee,"ticksR = %d, tcR = %d, \n", 
           ticksR, tcRav);
    #endif

    a++;
  } while(speed < 200);
  
  cal_drive_stop();






  // <2013.09.02 removed> 
  /*
  for(r = 0; r < a; r++)
  {
    dprint(xbee,"r = %d, spdr = %d, spdm = %d, \n", r, spdr[r], spdm[r]);
  }
  */
  // </2013.09.02> 


  // <2013.09.02>

  #ifdef xbee_abcalibrate_debug
  dprint(xbee,"Before\n");
  for(r = 0; r < a; r++)
  {
    dprint(xbee,"r = %d, spdr = %d, spdm = %d, \n", r, spdr[r], spdm[r]);
  }
  #endif

  // Look for and correct any measurement errors
  for(r = 1; r < a-1; r++)
  {
    if((spdm[r] > spdm[r-1] + 30) && (spdm[r] > spdm[r+1] + 30)) spdm[r] = (spdm[r+1] + spdm[r-1])/2;
    //if((spdm[r] < spdm[r-1] - 30) && (spdm[r] < spdm[r-1] - 30)) spdm[r] = (spdm[r+1] + spdm[r-1])/2;
  }

  // Look for and correct stray zeros
  for(r = 1; r < a-1; r++)
  {
    if((spdm[r] == 0) && (spdm[r+1] != 0) && (spdm[r-1] != 0)) spdm[r] = (spdm[r+1] + spdm[r-1])/2;
  }

  #ifdef xbee_abcalibrate_debug
  dprint(xbee,"After\n");
  for(r = 0; r < a; r++)
  {
    dprint(xbee,"r = %d, spdr = %d, spdm = %d, \n", r, spdr[r], spdm[r]);
  }
  #endif

  // </2013.09.02>








  #ifdef xbee_abcalibrate_debug
  dprint(xbee,"r = %d\n", r);
  #endif

  zstart = 0;
  zend = 0;
  int rcnt;

  for(r = 0; r < a; r++)
  {
    if((spdm[r]==0)&&(zstart==0)) zstart = r;
    if((zstart!=0)&&(spdm[r]!=0)&&(zend==0)) zend = r;
  }

  #ifdef xbee_abcalibrate_debug
  dprint(xbee,"zstart = %d, zend = %d\n", zstart, zend);
  #endif

  rcnt = r;

  for(r = 1; r < rcnt-1; r++)
  {  
    if((spdm[r] < 0)||(spdm[r] > 200)) spdm[r] = (spdm[r+1] + spdm[r-1])/2;
  }

//  dprint(xbee,"\n\n


  spdr[zstart] = (spdr[zstart] + spdr[zend - 1])/2;

  subval = zend - zstart - 1;

  for(r = zend; r < rcnt; r++)
  {
    spdr[r - subval] = spdr[r];
    spdm[r - subval] = spdm[r];
  }

  a -= subval;

  #ifdef xbee_abcalibrate_debug
  for(r = 0; r < a; r++)
  {
    dprint(xbee,"r = %d, spdr = %d, spdm = %d, \n", r, spdr[r], spdm[r]);
  }
  #endif

  rcnt = r;

  #ifdef xbee_abcalibrate_debug
  dprint(xbee,"rcnt = %d\n", rcnt);
  dprint(xbee,"zstart = %d\n", zstart);
  #endif

  eeAddr = _ActivityBot_EE_Start_ + _ActivityBot_EE_Right_;
  ee_putInt(rcnt, eeAddr);
  eeAddr+=4;
  ee_putInt(zstart, eeAddr);
  eeAddr += 4;
  for(r = 0; r < rcnt; r++)
  {
    //ee_putInt(spdr[r], eeAddr);
    //eeAddr+=4;
    ee_putByte((char) spdr[r], eeAddr);
    eeAddr++;
    pause(10);
    ee_putByte((char) (spdr[r] >> 8), eeAddr);
    eeAddr++;
    pause(10);
    ee_putByte((char) (spdr[r] >> 16), eeAddr);
    eeAddr++;
    pause(10);
    ee_putByte((char) (spdr[r] >> 24), eeAddr);
    eeAddr++;
    pause(10);


    //ee_putInt(spdm[r], eeAddr);
    //eeAddr += 4;  
    ee_putByte((char) spdm[r], eeAddr);
    eeAddr++;
    pause(10);
    ee_putByte((char) (spdm[r] >> 8), eeAddr);
    eeAddr++;
    pause(10);
    ee_putByte((char) (spdm[r] >> 16), eeAddr);
    eeAddr++;
    pause(10);
    ee_putByte((char) (spdm[r] >> 24), eeAddr);
    eeAddr++;
    pause(10);
  }

  eeAddr = _ActivityBot_EE_Start_ + _ActivityBot_EE_Right_;

  #ifdef xbee_abcalibrate_debug
  print("right eeAddr = %d\n", eeAddr);
  #endif

  rcnt = ee_getInt(eeAddr);
  eeAddr += 4;
  zstart = ee_getInt(eeAddr);
  eeAddr += 4;

  // <2013.09.02 added>
  //
  for(r = 0; r < rcnt; r++)
  {
    if(spdr[r] != ee_getInt(eeAddr)) ee_putInt(spdr[r], eeAddr);
    eeAddr+=4;
    if(spdm[r] != ee_getInt(eeAddr)) ee_putInt(spdm[r], eeAddr);
    eeAddr += 4;  
  }
  //
  // </2013.09.02>



  // // <2013.09.02 removed>
  eeAddr = _ActivityBot_EE_Start_ + _ActivityBot_EE_Right_;

  rcnt = ee_getInt(eeAddr);
  eeAddr += 4;
  zstart = ee_getInt(eeAddr);
  eeAddr += 4;


  for(r = 0; r < 120; r++)
  {
    spdr[r] = 0;
    spdm[r] = 0;
  }
  // // </2013.09.02>


  // // <2013.09.02 removed>
  for(r = 0; r < rcnt; r++)
  {
    spdr[r] = ee_getInt(eeAddr);
    eeAddr+=4;
    spdm[r] = ee_getInt(eeAddr);
    eeAddr += 4;  
  }
  // // </2013.09.02>
  


  
  #ifdef xbee_abcalibrate_debug
  for(r = 0; r < rcnt; r++)
  {
    dprint(xbee,"r = %d, spdr = %d, spdm = %d, \n", r, spdr[r], spdm[r]);
  }

  ee_putStr("ActivityBot", 12, _ActivityBot_EE_Start_);
  dprint(xbee,"\n\nDONE!!!\n\n");
  #endif


  // <2013.09.02 added>
  for(i = 0; i <=16; i++) ee_putByte(0xFF, i);
  // </2013.09.02>

}


static int cog = 0;
static int stack[(160 + (400 * 4)) / 4];

volatile int tcL;
volatile int tcR;
static volatile int tiL;
static volatile int* sspAddrL;
static volatile int* sspAddrR;
static volatile int* ssrAddrL;
static volatile int* ssrAddrR;
volatile int ticksL = 0;
volatile int ticksR = 0;
static volatile int speedL;
static volatile int speedR;
static volatile int tfL;
static volatile int cL;
static volatile int tR;
static volatile int tiR;
static volatile int tfR;
static volatile int cR;
static volatile int stateL;
static volatile int stateR;
static volatile int dirL;
static volatile int ssReqL;

void cal_encoders(void *par);

void cal_drive_pins(int servoPinLeft, int servoPinRight, int encPinLeft, int encPinRight)          // drivePins function
{
  sPinL = servoPinLeft;                             // Local to global assignments
  sPinR = servoPinRight;
  ePinL = encPinLeft;
  ePinR = encPinRight;
}

void cal_drive_speeds(int left, int right)        // driveSpeeds function
{
  servo_speed(sPinL, left);                 // Use vals in servoSpeed calls
  servo_speed(sPinR, -right);
  
  speedL = left;
  speedR = right;
  
  /*
  if((!ssrAddrL)&&(!ssrAddrR))
  {
    sspAddrL = servo_paddr(sPinL);
    sspAddrR = servo_paddr(sPinR);
    ssrAddrL = servo_raddr(sPinL);
    ssrAddrR = servo_raddr(sPinR);
  } 
  */
  if(!cog)
  {
    cog = 1 + cogstart(cal_encoders, NULL, stack, sizeof(stack));
  }
}


void cal_drive_display(void)
{
  static int ticksLprev;
  static int ticksRprev;
  //print("ticksL = %d, ticksR = %d\n",
  //       ticksL - ticksLprev, ticksR - ticksRprev);
  ticksLprev = ticksL;
  ticksRprev = ticksR;
}

void cal_drive_setramp(int left, int right)       // driveRampSteps function
{
  servo_setramp(sPinL, left);               // Use vals in rampStep calls
  servo_setramp(sPinR, right);
}

void cal_drive_sleep()                            // driveSleep function
{
  servo_set(sPinL, 0);                      // Put servos to sleep
  servo_set(sPinR, 0);
}

void cal_drive_stop()                             // driveStop function
{
  servo_stop();                               // Stop the servo processor
}


void cal_encoders(void *par)
{
  stateL = (INA >> ePinL) & 1;
  stateR = (INA >> ePinR) & 1;
  
  cL = -1;
  cR = -1;
  unsigned int sl, sr;
  tiL = CNT;
  tiR = CNT;
//  int dt = CLKFREQ/50;
//  int t = cnt;
  
  while(1)
  {
    if(((INA >> ePinL) & 1) != stateL)
    {
      stateL = (~stateL) & 1;
      if(stateL == 1) 
      {
        //if((CNT - tiL) > (CLKFREQ/220))
        if((CNT - tiL) > (CLKFREQ/400))
        {
          tcL = ((2*CLKFREQ)/(CNT - tiL));       //added
          tiL = CNT;
        }  
      }
      ticksL++;
    }
    
    if(((INA >> ePinR) & 1) != stateR)
    {
      stateR = (~stateR) & 1;
      if(stateR == 1) 
      {
        //if((CNT - tiR) > (CLKFREQ/220))
        if((CNT - tiR) > (CLKFREQ/400))
        {
          tcR = ((2*CLKFREQ)/(CNT - tiR));       //added
          tiR = CNT;
        }  
      }
      ticksR++;
    }
  }
}






void cal_servoPins(int servoPinLeft, int servoPinRight)          // drivePins function
{
  sPinL = servoPinLeft;                                       // Local to global assignments
  sPinR = servoPinRight;

  int eeAddr = _ActivityBot_EE_Start_  + _ActivityBot_EE_Pins_;
  unsigned char pinInfo[8] = {'s', 'p', 'L', 12, ' ', 'R', 13, ' '};  
  pinInfo[3] = (char) servoPinLeft;
  pinInfo[6] = (char) servoPinRight;
  ee_putStr(pinInfo, 8, eeAddr);
}


//To-do: Make write to EEPROM
void cal_encoderPins(int encPinLeft, int encPinRight)          // drivePins function
{
  ePinL = encPinLeft;
  ePinR = encPinRight;

  int eeAddr = 8 + _ActivityBot_EE_Start_  + _ActivityBot_EE_Pins_;
  unsigned char pinInfo[8] = {'e', 'p', 'L', 14, ' ', 'R', 15, ' '};  
  pinInfo[3] = (char) encPinLeft;
  pinInfo[6] = (char) encPinRight;

  ee_putStr(pinInfo, 8, eeAddr);
}

