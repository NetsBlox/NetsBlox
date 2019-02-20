#include "abcalibrate360.h"    
#include "simpletools.h"
#include "servo360.h"
//#include "abdrive360.h"

/*
static volatile int abd360_pinCtrlLeft = ABD60_PIN_CTRL_L;
static volatile int abd360_pinCtrlRight = ABD360_PIN_CTRL_R;
static volatile int abd360_pinFbLeft = ABD60_PIN_FB_L;
static volatile int abd360_pinFbRight = ABD360_PIN_FB_R;
*/

void get_pulse_left();
void get_pulse_right();
int *cogPulseLeft;
int *cogPulseRight;
volatile int pulseLeft;
volatile int pulseRight;

/*
  VM_CCW = 180
  VB_CCW 200
  VM_CCW = 180
  VB_CW -200
*/

static int errorVal = AB360_ERROR_CONDITION_UNKNOWN;

void playNotes(float tempo, float beatVal, int *note, float *hold);

enum {  C6 = 1047, D6b = 1109,  D6 = 1175, E6b = 1245,  E6 = 1319, F6 = 1397, 
       G6b = 1480,  G6 = 1568, A6b = 1661,  A6 = 1760, B6b = 1865, B6 = 1976,  
        C7 = 2093, D7b = 2219,  D7 = 2349, E7b = 2489,  E7 = 2637, F7 = 2794, 
       G7b = 2960,  G7 = 3136, A7b = 3322,  A7 = 3520, B7b = 3729, B7 = 3951, 
        C8 = 4186 };
        
void playNotes(float tempo, float beatVal, int *note, float *hold)
{
  float msBeat = 60000.0 / tempo;
  float tFullNote = msBeat * beatVal;               

  int t, i = 0;
  
  while(note[i] != 'Q')
  {
    t = (int) (hold[i] * tFullNote);
    freqout(4, t - 20, note[i]);
    pause(20);
    i++;
  }    
}

void cal_fail_dance(void);

void get_pulse_left()
{
  while(1)
  {
      pulseLeft = pulse_in(14, 1);
  }  
}  

  
void get_pulse_right()
{
  {
      pulseRight = pulse_in(15, 1);
  }  
}  


void cal_activityBot(void)                    
{
  //ee_putStr("AB360      ", 12, _AB360_EE_Start_);
  /*
  unsigned char str[12];
  ee_getStr(str, 12, _AB360_EE_Start_);

  str[11] = 0;
  
  if(strcmp(str, "AB360 wait "))
  {
    print("Calibration program loaded.\r\r");
    print("Set the PWR switch to 0.\r\r");
    print("Set your ActivityBot 360 on the floor.\r\r");
    print("Set the PWR switch to 2.\r\r");
    print("The yellow P26 and P27 lights will turn on.\r\r");
    print("When the lights either turn off or start flickering,\r");
    print("set PWR back to 0.\r\r");
    
    print("If the lights flicker, it means there's a problem\r");
    print("for you to fix.  Use Display Calibration Results\r");
    print("to find out more.\r\r");
    
    print("If the lights stay on, wait while the ActivityBot 360\r");
    print("performs its calibration maneuvers.  When it is done\r");
    print("the lights will turn back off.  At that point, your\r");
    print("ActivityBot 360 will be calibrated and ready for the\r");
    print("next program.\r\r");
    ee_putStr("AB360 wait ", 12, _AB360_EE_Start_);
    while(1);
  } 
  */
  
  cog_run(get_pulse_left, 128);
  cog_run(get_pulse_right, 128);
  
  int dt = CLKFREQ * 10;
  int t = CNT;
  
  //int errorVal = AB360_ERROR_CABLE_SWAP;

  while((CNT-t) < dt)
  {
    if
    (
      (pulseLeft  < 1200) 
       &&
      (pulseLeft  > 25) 
       &&
      (pulseRight < 1200) 
       &&
      (pulseRight > 25) 
    )
    {
      errorVal = 0;
      break;
    }
  }
  

  if
  (
    (
      (pulseLeft  > 1200) 
       ||
      (pulseLeft  < 25) 
    )
     &&
    (
      (pulseRight > 1200) 
       ||
      (pulseRight < 25) 
    )
  )
  {
    errorVal = AB360_ERROR_NO_ENC_SIG_BOTH;
  }
  else if
  (
    (
      (pulseLeft  > 1200) 
       ||
      (pulseLeft  < 25) 
    )
  )
  {
    errorVal = AB360_ERROR_NO_ENC_SIG_LEFT;
  }
  else if
  (
    (
      (pulseRight > 1200) 
       ||
      (pulseRight < 25) 
    )
  )
  {
    errorVal = AB360_ERROR_NO_ENC_SIG_RIGHT;
  }


  //print("pulseLeft = %d, pulseRight = %d \r", pulseLeft, pulseRight);
  //print("errorVal = %d \r", errorVal);
  
  
  servo360_connect(abd360_pinCtrlLeft, abd360_pinFbLeft);
  servo360_feedback(abd360_pinCtrlLeft, 0);
  servo360_connect(abd360_pinCtrlRight, abd360_pinFbRight);
  servo360_feedback(abd360_pinCtrlRight, 0);

  int brad12bitL, brad12bitR;
  if(errorVal == 0)
  {
    /*
    servo360_connect(abd360_pinCtrlLeft, abd360_pinFbLeft);
    servo360_feedback(abd360_pinCtrlLeft, 0);
    servo360_connect(abd360_pinCtrlRight, abd360_pinFbRight);
    servo360_feedback(abd360_pinCtrlRight, 0);
    */
    
    pause(100);  
    
    brad12bitL = servo360_getAngle12Bit(abd360_pinCtrlLeft);
    brad12bitR = servo360_getAngle12Bit(abd360_pinCtrlRight);
      
    servo360_set(abd360_pinCtrlLeft, 1500+120);
    servo360_set(abd360_pinCtrlRight, 1500-120);
    pause(500);
    servo360_set(abd360_pinCtrlLeft, 1500);
    servo360_set(abd360_pinCtrlRight, 1500);
    pause(500);

    brad12bitL = servo360_getAngle12Bit(abd360_pinCtrlLeft) - brad12bitL;
    brad12bitR = servo360_getAngle12Bit(abd360_pinCtrlRight) - brad12bitR;

    // print("brad12bitL = %d, brad12bitR = %d \r", brad12bitL, brad12bitR);
    
    if
    (
      (brad12bitL  > 1000) 
       &&
      (brad12bitL  < 3000) 
       &&
      (brad12bitR  < -1000) 
       &&
      (brad12bitR  > -3000) 
    )
    {
      errorVal = 0;
    }
    else if
    (
      (brad12bitR  > 1000) 
       &&
      (brad12bitR  < 3000) 
       &&
      (brad12bitL  < -1000) 
       &&
      (brad12bitL  > -3000) 
    )
    {
      errorVal = AB360_ERROR_CABLE_SWAP;
    }
    else if
    (
      (
        (brad12bitL  < 1000) 
         &&
        (brad12bitL  > -1000) 
      )
       &&
      (
        (brad12bitR  < 1000) 
         &&
        (brad12bitR  > -1000) 
      )  
    )
    {
      errorVal = AB360_ERROR_NO_MOTION_BOTH;
    }
    else if
    (
      (brad12bitL  < 1000) 
       &&
      (brad12bitL  > -1000) 
    )
    {
      errorVal = AB360_ERROR_NO_MOTION_LEFT;
    }
    else if
    (
      (brad12bitR  < 1000) 
       &&
      (brad12bitR  > -1000) 
    )
    {
      errorVal = AB360_ERROR_NO_MOTION_RIGHT;
    }

    // print("errorVal = %d \r", errorVal);

  }
  
  print("error = %d\r\r", errorVal);
  
  if(errorVal == AB360_ERROR_NO_ENC_SIG_BOTH)
  {
    int pulseLeftPrev = pulseLeft;
    int pulseRightPrev = pulseRight;
    int countLeft = 0, countRight = 0;
    for(int n = 0; n < 50; n++)
    {
      pulse_out(12, 1500 + 60);
      pulse_out(13, 1500 - 60);   
      if(pulseLeft != pulseLeftPrev) 
      {
        countLeft++;
        pulseLeftPrev = pulseLeft;
      }
      if(pulseRight != pulseRightPrev) 
      {
        countRight++;
        pulseRightPrev = pulseRight;
      }
      pause(20);
    }
    if((countLeft > 3) || (countRight > 3))
    {
      errorVal = AB360_ERROR_POSSIBLE_AB_NOT_360;
    }      
  }          
      
  
  if(errorVal == 0)
  {

    ee_putStr("AB360cstart", 12, _AB360_EE_Start_);
    
    // Left servo counterclockwise
  
    
    int n, x, angle, angleP; 
    int mVccwL, mVcwL, bVccwL, bVcwL;
    int mVccwR, mVcwR, bVccwR, bVcwR;
    int increases = 0, decreases = 0, diffCount = 0;
    
    servo360_set(abd360_pinCtrlLeft, 1500+240);
    pause(1000);
    x = servo360_getAngle12Bit(abd360_pinCtrlLeft);
    // print("x = %d\r", x);
    pause(1000);
    x = servo360_getAngle12Bit(abd360_pinCtrlLeft) - x;
    // print("x = %d\r", x);
    //x1 &= 0xFFF;
    //print("x1 = %d\r", x1);
  
    servo360_set(abd360_pinCtrlLeft, 1500);
    
    pause(2000);
  
    angle = servo360_getAngle(abd360_pinCtrlLeft);
    angleP = angle;
  
    for(n = 0; n < 60; n++)
    {
      servo360_set(abd360_pinCtrlLeft, 1500 + n);
      angle = servo360_getAngle(abd360_pinCtrlLeft);
      // print("angle = %d\r", angle);
      if(angle != angleP) increases++;
      if(increases > 3) break;
      pause(20);
      angleP = angle;
    }  
    
    bVccwL = (n - 4) * 10 * 2 / 3;
    // print("bVccwL = %d\r", bVccwL); 
    
    servo360_set(abd360_pinCtrlLeft, 1500);
  
    mVccwL = 1000 * (2200 - bVccwL) / x;
  
    // print("mVccwL = %d\r", mVccwL); 
    
    
    // Left servo clockwise
  
  
    servo360_set(abd360_pinCtrlLeft, 1500-240);
    pause(2000);
    x = servo360_getAngle12Bit(abd360_pinCtrlLeft);
    // print("x = %d\r", x);
    pause(1000);
    x = abs(servo360_getAngle12Bit(abd360_pinCtrlLeft) - x);
    // print("x = %d\r", x);
    //x1 &= 0xFFF;
    //print("x1 = %d\r", x1);
  
    servo360_set(abd360_pinCtrlLeft, 1500);
    
    pause(2000);
  
    angle = servo360_getAngle(abd360_pinCtrlLeft);
    angleP = angle;
  
    for(n = 0; n > -60; n--)
    {
      servo360_set(abd360_pinCtrlLeft, 1500 + n);
      angle = servo360_getAngle(abd360_pinCtrlLeft);
      // print("angle = %d\r", angle);
      if(angle != angleP) decreases++;
      if(decreases > 3) break;
      pause(20);
      angleP = angle;
    }  
    
    bVcwL = abs((n + 4) * 10 * 2 / 3);
    // print("bVcwL = %d\r", bVcwL); 
    
    servo360_set(abd360_pinCtrlLeft, 1500);
  
    mVcwL = 1000 * (2200 - bVcwL) / x;
  
    // print("mVccwL = %d\r", mVcwL); 
  
    
    // Right servo counterclockwise
  
    servo360_connect(abd360_pinCtrlRight, abd360_pinFbRight);
    servo360_feedback(abd360_pinCtrlRight, 0);
    
    servo360_set(abd360_pinCtrlRight, 1500+240);
    pause(2000);
    x = servo360_getAngle12Bit(abd360_pinCtrlRight);
    // print("x = %d\r", x);
    pause(1000);
    x = servo360_getAngle12Bit(abd360_pinCtrlRight) - x;
    // print("x = %d\r", x);
    //x1 &= 0xFFF;
    //// print("x1 = %d\r", x1);
  
    servo360_set(abd360_pinCtrlRight, 1500);
    
    pause(2000);
  
    angle = servo360_getAngle(abd360_pinCtrlRight);
    angleP = angle;
    increases = 0;
    
    for(n = 0; n < 60; n++)
    {
      servo360_set(abd360_pinCtrlRight, 1500 + n);
      angle = servo360_getAngle(abd360_pinCtrlRight);
      // print("angle = %d\r", angle);
      if(angle != angleP) increases++;
      if(increases > 3) break;
      pause(20);
      angleP = angle;
    }  
    
    bVccwR = (n - 4) * 10 * 2 / 3;
    // print("bVccwR = %d\r", bVccwR); 
    
    servo360_set(abd360_pinCtrlRight, 1500);
  
    mVccwR = 1000 * (2200 - bVccwR) / x;
  
    // print("mVccwR = %d\r", mVccwR); 
    
    
    // Right servo clockwise
  
  
    servo360_set(abd360_pinCtrlRight, 1500-240);
    pause(2000);
    x = servo360_getAngle12Bit(abd360_pinCtrlRight);
    // print("x = %d\r", x);
    pause(1000);
    x = abs(servo360_getAngle12Bit(abd360_pinCtrlRight) - x);
    // print("x1 = %d\r", x);
    //x1 &= 0xFFF;
    //// print("x1 = %d\r", x1);
  
    servo360_set(abd360_pinCtrlRight, 1500);
    
    pause(2000);
  
    angle = servo360_getAngle(abd360_pinCtrlRight);
    angleP = angle;
    decreases = 0;
  
    for(n = 0; n > -60; n--)
    {
      servo360_set(abd360_pinCtrlRight, 1500 + n);
      angle = servo360_getAngle(abd360_pinCtrlRight);
      // print("angle = %d\r", angle);
      if(angle != angleP) decreases++;
      if(decreases > 3) break;
      pause(20);
      angleP = angle;
    }  
    
    bVcwR = abs((n + 4) * 10 * 2 / 3);
    // print("bVcwR = %d\r", bVcwR); 
    
    servo360_set(abd360_pinCtrlRight, 1500);
  
    mVcwR = 1000 * (2200 - bVcwR) / x;
  
    // print("mVcwR = %d\r", mVcwR); 
  
    // print("\r=== Summary ===\r", mVcwR); 
    // print("mVccw = %d\r", mVccwL); 
    // print("bVccwL = %d\r", bVccwL); 
    // print("mVcwL = %d\r", mVcwL); 
    // print("bVcwL = %d\r", bVcwL); 
    // print("mVccwR = %d\r", mVccwR); 
    // print("bVccwR = %d\r", bVccwR); 
    // print("mVcwR = %d\r", mVcwR); 
    // print("bVcwR = %d\r", bVcwR); 
    //
    
    ee_putInt(mVccwL, _AB360_EE_Start_ + _AB360_EE_mVccwL_);
    ee_putInt(bVccwL, _AB360_EE_Start_ + _AB360_EE_bVccwL_);
    ee_putInt(mVcwL, _AB360_EE_Start_ + _AB360_EE_mVcwL_);
    ee_putInt(bVcwL, _AB360_EE_Start_ + _AB360_EE_bVcwL_);
  
    ee_putInt(mVccwR, _AB360_EE_Start_ + _AB360_EE_mVccwR_);
    ee_putInt(bVccwR, _AB360_EE_Start_ + _AB360_EE_bVccwR_);
    ee_putInt(mVcwR, _AB360_EE_Start_ + _AB360_EE_mVcwR_);
    ee_putInt(bVcwR, _AB360_EE_Start_ + _AB360_EE_bVcwR_);
    
    if
    (
      (mVccwL > (S360_VM_CCW * 3)) 
       || 
      (mVccwL < (S360_VM_CCW / 3)) 
       ||        
      (mVcwL > (S360_VM_CW * 3)) 
       || 
      (mVcwL < (S360_VM_CW / 3)) 
       ||        
      (mVccwR > (S360_VM_CCW * 3)) 
       || 
      (mVccwR < (S360_VM_CCW / 3)) 
       ||        
      (mVcwR > (S360_VM_CW * 3)) 
       || 
      (mVcwR < (S360_VM_CW / 3)) 
       ||   
      (bVccwL > (S360_VB_CCW + (S360_VB_CCW * 3))) 
       || 
      (bVccwL < (S360_VB_CCW - (S360_VB_CCW * 3))) 
       ||        
      (bVcwL < (S360_VB_CCW - (S360_VB_CCW * 3))) 
       || 
      (bVcwL > (S360_VB_CCW + (S360_VB_CCW * 3))) 
       ||        
      (bVccwR > (S360_VB_CCW + (S360_VB_CCW * 3))) 
       || 
      (bVccwR <  (S360_VB_CCW - (S360_VB_CCW * 3))) 
       ||        
      (bVcwL < (S360_VB_CCW - (S360_VB_CCW * 3))) 
       || 
      (bVcwL > (S360_VB_CCW + (S360_VB_CCW * 3))) 
    )
    {
      errorVal = AB360_ERROR_XFER_OUT_OF_RANGE;
    }
    else if( (mVccwL+mVccwR+mVcwR+mVcwL) > 940)
    {
      errorVal = AB360_ERROR_BATTERIES_TOO_LOW;
    }      
    else if( (mVccwL+mVccwR+mVcwR+mVcwL) < 625)
    {
      errorVal = AB360_ERROR_BATTERIES_TOO_HIGH;
    }      
    else
    {
      ee_putStr("AB360      ", 12, _AB360_EE_Start_);
      
      //drive_speed(48, 48);
      
      int   chargeNotes[] = {  G6,   C7,   E7,    G7,   E7,   G7,  'Q'};
      // float chargeHolds[] = {0.25, 0.25, 0.25, 0.375, 0.25, 0.50,   0 };
      float chargeHolds[] = {0.125, 0.125, 0.125, 0.187, 0.125, 0.50,   0 };
      /*
      //servo360_end();
      //pause(100);
      abd360_pinCtrlLeft = 12;
      abd360_pinCtrlRight = 13;
      servo360_feedback(abd360_pinCtrlLeft, 1);
      servo360_feedback(abd360_pinCtrlRight, 1);

      servo360_setUnitsFullCircle(abd360_pinCtrlLeft, ABD360_UNITS_REV);
      servo360_setUnitsFullCircle(abd360_pinCtrlRight, ABD360_UNITS_REV);
    
      servo360_setAcceleration(abd360_pinCtrlLeft, abd360_rampStep * 50);
      servo360_setAcceleration(abd360_pinCtrlRight, abd360_rampStep * 50);
    
      servo360_setMaxSpeed(abd360_pinCtrlLeft, abd360_speedLimit);
      servo360_setMaxSpeed(abd360_pinCtrlRight, abd360_speedLimit);
    
      servo360_couple(abd360_pinCtrlLeft, abd360_pinCtrlRight);
      
      servo360_setControlSys(abd360_pinCtrlLeft, S360_SETTING_KPA, 5000);             // KPV
      servo360_setControlSys(abd360_pinCtrlRight, S360_SETTING_KPA, 5000);             // KPV
      servo360_setControlSys(abd360_pinCtrlLeft, S360_SETTING_KIA, 150);               // KIV
      servo360_setControlSys(abd360_pinCtrlRight, S360_SETTING_KIA, 150);               // KIV
      servo360_setControlSys(abd360_pinCtrlLeft, S360_SETTING_KDA, 0);               // KDV
      servo360_setControlSys(abd360_pinCtrlRight, S360_SETTING_KDA, 0);               // KDV
      servo360_setControlSys(abd360_pinCtrlLeft, S360_SETTING_IA_MAX, 150);            // FB360_VEL_INTGRL_MAX
      servo360_setControlSys(abd360_pinCtrlRight, S360_SETTING_IA_MAX, 150);            // FB360_VEL_INTGRL_MAX
    
      servo360_setTransferFunction(abd360_pinCtrlLeft, S360_SETTING_VM_CCW, mVccwL);
      servo360_setTransferFunction(abd360_pinCtrlLeft, S360_SETTING_VB_CCW, bVccwL);
      servo360_setTransferFunction(abd360_pinCtrlLeft, S360_SETTING_VM_CW, mVcwL);
      servo360_setTransferFunction(abd360_pinCtrlLeft, S360_SETTING_VB_CW, -bVcwL );
    
      servo360_setTransferFunction(abd360_pinCtrlRight, S360_SETTING_VM_CCW, mVccwR );
      servo360_setTransferFunction(abd360_pinCtrlRight, S360_SETTING_VB_CCW, bVccwR);
      servo360_setTransferFunction(abd360_pinCtrlRight, S360_SETTING_VM_CW, mVcwR);
      servo360_setTransferFunction(abd360_pinCtrlRight, S360_SETTING_VB_CW, -bVcwR);
      
      servo360_setAngleOffset(12, servo360_getAngleOffset(12));
      servo360_setAngleOffset(13, servo360_getAngleOffset(13));
      
      servo360_speed(12, 50);
      servo360_speed(13, -50);
      
      
      //pause(100);
      
      //drive_speed(50, 50);
      
      */
      //playNotes(108.0, 4.0, chargeNotes, chargeHolds);
      playNotes(128.0, 4.0, chargeNotes, chargeHolds);
      //drive_speed(0, 0);
      /*
      servo360_speed(12, 0);
      servo360_speed(13, 0);
      */

      //drive_speed(-48, -48);

      //playNotes(108.0, 4.0, chargeNotes, chargeHolds);
      
      //drive_speed(0, 0);
    } 
  }    

  //
  if(errorVal != 0)
  {
    char str[] = "AB360      ";
    sprint(&str[6], "%d", errorVal);
    print("str = %s", str);
    ee_putStr(str, 12, _AB360_EE_Start_);
    cal_fail_dance();
  }           

  ee_putInt(0, 0);
}


void cal_servoPins(int servoPinLeft, int servoPinRight) 
{
  int eeAddr = _AB360_EE_Start_  + _AB360_EE_Pins_;
  unsigned char pinInfo[8] = {'s', 'p', 'L', 12, ' ', 'R', 13, ' '};  
  pinInfo[3] = (char) servoPinLeft;
  pinInfo[6] = (char) servoPinRight;

  ee_putStr(pinInfo, 8, eeAddr);

  abd360_pinCtrlLeft = servoPinLeft;
  abd360_pinCtrlRight = servoPinRight;
}


void cal_encoderPins(int encPinLeft, int encPinRight)
{
  int eeAddr = 8 + _AB360_EE_Start_  + _AB360_EE_Pins_;
  unsigned char pinInfo[8] = {'e', 'p', 'L', 14, ' ', 'R', 15, ' '};  
  pinInfo[3] = (char) encPinLeft;
  pinInfo[6] = (char) encPinRight;

  ee_putStr(pinInfo, 8, eeAddr);

  abd360_pinFbLeft = encPinLeft;
  abd360_pinFbRight = encPinRight;
}


void cal_clear(void)
{
  for(int addr = _AB360_EE_Start_; addr <_AB360_EE_End_; addr++)
  {
    ee_putByte(0xFF, addr); 
  }    
}  


void cal_fail_dance(void)
{
  ee_putInt(0, 0);

  //cog_run(cal_fail_song, 128);
  for(int i = 0; i < 3; i++)
  {
    freqout(4, 175, 1275);
    pause(150);
    freqout(4, 500, 850);
    pause(100);
    //print("i = %d\r", i);
    for(int j = 0 ; j < 3; j++)
    {
      // print("j = %d\r", j);
      servo360_set(abd360_pinCtrlLeft, 1500+80);
      servo360_set(abd360_pinCtrlRight, 1500+80);
      pause(125);
      servo360_set(abd360_pinCtrlLeft, 1500-80);
      servo360_set(abd360_pinCtrlRight, 1500-80);
      pause(125);
    }
    servo360_set(abd360_pinCtrlLeft, 1500);
    servo360_set(abd360_pinCtrlRight, 1500);

    pause(125);
    
    for(int j = 0 ; j < 3; j++)
    {
      //print("j = %d\r", j);
      for(int k = 0; k < 5; k++)
      {
        // print("k = %d\r", k);
        high(26); high(27);
        pause(5);
        low(26); low(27);
        pause(50);
      }        
      pause(120);
    }
  }      
}  

  


