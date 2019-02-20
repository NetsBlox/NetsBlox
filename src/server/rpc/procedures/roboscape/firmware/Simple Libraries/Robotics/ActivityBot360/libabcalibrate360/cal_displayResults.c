#include "abcalibrate360.h"    
#include "simpletools.h"
#include "servo360.h"
//#include "abdrive360.h"

static int errorVal;

void cal_displayResults(void)
{
  //if(!abd_us) abd_us = CLKFREQ/1000000; 
  
  unsigned char str[12];
  ee_getStr(str, 12, _AB360_EE_Start_);

  str[11] = 0;
  
  if(!strcmp(str, "AB360      "))
  {
    print("=== Success! ===\r\r");
    print("The last calibration worked. You are ready to go!\r\r");
    //return -1;
  } 
  else if( !strcmp(str, "AB360cstart") || !strcmp(str, "ActivityBot")) 
  {
    print("=== Whoops!!! ===\r\r");
    print("You might need to re-calibrate.\r\r");
      
    print("=== What's the problem? === \r\r");
  
    if(!strcmp(str, "AB360cstart"))
    {
      print("Calibration started but did not complete.\r\r");
      print("  Did you wait for the calibration maneuvers to\r");
      print("  complete AND for the yellow P26 P27 lights\r");
      print("  to turn off before setting PWR back to 0?\r\r");    
    }   
    else if(!strcmp(str, "ActivityBot"))
    {
      print("There is calibration data for a different kind of ActivityBot\r");
      print("(the kind with external encoders) in the EEPROM.\r\r");
      print("  Do you have an ActivityBot 360?\r");
      print("  If yes, find and follow the instructions for\r");    
      print("  calibrating your ActivityBot 360.\r\r");    
    } 

    print("=== What do I do now? ===\r\r");
    print(" - Go to the calibration instructions for your ActivityBot 360,\r");
    print("   and follow them carefully.\r");
    print(" - Re-run the calibration program.\r");
    print(" - Run the calibration results program.\r");       
  }
  else if(!strncmp(str, "AB360", 5))
  {
    sscan(&str[6], "%d", &errorVal);

    print("=== Uh oh!!! ===\r\r");
    
    //
    if
    (
      (errorVal == AB360_ERROR_CABLE_SWAP) 
       ||
       errorVal == AB360_ERROR_NO_ENC_SIG_BOTH
       ||
      (errorVal == AB360_ERROR_NO_ENC_SIG_LEFT) 
       ||
      (errorVal == AB360_ERROR_NO_ENC_SIG_RIGHT) 
    )
    {
      if(errorVal == AB360_ERROR_NO_ENC_SIG_BOTH)
      {
        print("You might need to do something different with \r");
        print("the PWR switch during calibration.\r\r");
        print("  or\r\r");
      }        
      print("You might need to fix a servo connection mistake.\r\r");
    }
    else if
    (
      (errorVal == AB360_ERROR_BATTERIES_TOO_LOW) 
       ||
      (errorVal == AB360_ERROR_BATTERIES_TOO_HIGH) 
    )
    {
      print("You might need to fix a power supply problem.\r\r");
    }
    else
    {
    //
      print("Something isn't right here...\r\r");
    //  
    }  
    //          
      
    print("=== What's the problem? === \r\r");

    //print("errorVal = %d\r", errorVal);
                                                            //         
    /*
    print("For best results, carefully re-check the\r");
    print("ActivityBot 360 setup instructions you followed,\r");
    print("and make sure you did every detail correctly.\r\r");

    print("Each time you think you've got all the mistakes\r");
    print("found and fixed, re-run the calibration program.\r");
    print("Then, re-run this program to find out if the\r"); 
    print("calibration was successful.\r\r");
    */
    switch(errorVal)
    {
      case AB360_ERROR_CABLE_SWAP:
        print("One pair of cables was swapped.\r\r");
        print("  Did your robot drive forward briefly?\r");
        print("  The yellow signal wires on P14 and P15 may have been swapped.\r\r");
        print("  Did your robot drive backward briefly?\r");
        print("  The 3-wire cables on P12 and P13 may have been swapped.\r\r");
        break;
      case AB360_ERROR_NO_ENC_SIG_BOTH:
        print("The servos did not respond when calibration started.\r\r");
        print("  Did you follow these steps during the calibration?\r");
        print("   - Click Load & Run (Save code to EEPROM) button.\r"); 
        print("   - Set PWR switch to 0 as soon as it's done loading.\r"); 
        print("   - Set the ActivityBot on the floor.\r"); 
        print("   - Set PWR switch to 2.\r\r"); 
        print("  Are the yellow wires firmly plugged onto the\r");
        print("  P14 and P15 pins?\r\r");
        print("  Is the jumper tab to the left of the P12/P13 servo ports\r");
        print("  set to VIN?\r\r");
        print("  Is each white wire on the 3-wire servo cable closest to\r");
        print("  the P12 P13 labels near the outside edge of the Activity\r");
        print("  Board WX?\r\r");
        print("  Are the P12, P13, P14 and P15 sockets by the white\r");
        print("  breadboard empty?\r\r");
        break;
      case AB360_ERROR_NO_ENC_SIG_LEFT:
        print("The left servo is not responding.\r\r");
        print("  Is the left servo's yellow feedback signal wire firmly plugged\r");
        print("  onto the P14 pin?\r\r");
        print("  Is the white wire on the left servo's 3-wire cable closest to the");
        print("  P12 label?\r\r");
        break;
      case AB360_ERROR_NO_ENC_SIG_RIGHT:
        print("The right servo is not responding.\r\r");
        print("  Is the right servo's yellow feedback signal wire firmly plugged\r");
        print("  onto the P15 pin?\r\r");
        print("  Is the white wire on the 3-wire cable closest to the P13 label?\r\r");
        break;
      case AB360_ERROR_NO_MOTION_LEFT:
        print("Something is preventing the left wheel from turning.\r\r");
        break;
      case AB360_ERROR_NO_MOTION_RIGHT:
        print("Something is preventing the right wheel from turning.\r\r");
        break;
      case AB360_ERROR_NO_MOTION_BOTH:
        print("Something is preventing the both wheels from turning.\r\r");
        break;
      case AB360_ERROR_BATTERIES_TOO_LOW:
        print("Weak power supply.\r\r");
        print("  Is the shut jumper to the left of the P12 port set to VIN?\r\r");
        print("  Are your batteries new or freshly recharged?\r\r");
        break;
      case AB360_ERROR_BATTERIES_TOO_HIGH:
        print("Servos turning faster than normal.\r\r");
        print("  Are you using 5 AA batteries?\r\r");
        print("  Did you place the ActivityBot on its wheels on the floor to\r");
        print("  execute its calibration maneuvers?\r\r");
        break;
      case AB360_ERROR_POSSIBLE_AB_NOT_360:
        print("Encoder signals could be non-360 ActivityBot.\r\r");
        print("  Does your ActivityBot have external encoders attached between the\r");
        print("  wheels and chassis?  Are there four 3-wire cables attached to\r");
        print("  P12, P13, P14, and P15?\r\r");
        break;
      case AB360_ERROR_XFER_OUT_OF_RANGE:
      default:
        print("Something isn't right, but this diagnostic cannot\r");
        print("identify it.\r\r");
        break;
    } 
    print("=== What do I do now? ===\r\r");
    if
    (
      (errorVal == AB360_ERROR_CABLE_SWAP) 
       ||
      (errorVal == AB360_ERROR_NO_ENC_SIG_BOTH) 
       ||
      (errorVal == AB360_ERROR_NO_ENC_SIG_LEFT) 
       ||
      (errorVal == AB360_ERROR_NO_ENC_SIG_RIGHT) 
       ||
      (errorVal == AB360_ERROR_BATTERIES_TOO_LOW) 
       ||
      (errorVal == AB360_ERROR_BATTERIES_TOO_HIGH) 
    )
    {
      print(" - Check your assembly instructions.\r");
      print(" - Double check your wiring connections.\r");
    }
    else if
    (
      (errorVal == AB360_ERROR_NO_MOTION_LEFT) 
       ||
      (errorVal == AB360_ERROR_NO_MOTION_RIGHT) 
       ||
      (errorVal == AB360_ERROR_NO_MOTION_BOTH) 
    )
    {
      print(" - Check for anything that's preventing.\r");
      print("   the wheel from turning, and remove any.\r");
      print("   obstructions.\r");
    }
    else if
    (
      (errorVal == AB360_ERROR_POSSIBLE_AB_NOT_360) 
    )
    {
      print(" - Check the web/book instructions to find out if you have.\r");
      print("   an ActivityBot, or an ActivityBot 360.  Then, follow the.\r");
      print("   calibration instructions for your version of ActivityBot.\r");
    }
          
    print(" - Re-run the calibration program.\r");
    print(" - If you get another uh-oh, re-run this\r");
    print("   calibration results program.\r");       
    if
    (
      (errorVal == AB360_ERROR_NO_MOTION_LEFT) 
       ||
      (errorVal == AB360_ERROR_NO_MOTION_RIGHT) 
       ||
      (errorVal == AB360_ERROR_NO_MOTION_BOTH) 
       ||
      (errorVal == AB360_ERROR_XFER_OUT_OF_RANGE) 
       ||
      (errorVal > 0) 
       ||
      (errorVal < AB360_ERROR_XFER_OUT_OF_RANGE) 
    )
    {
      print(" - If you need more help, try Parallax Technical\r");
      print("   Support:\r");
      print("      support@parallax.com\r");
      print("      888-512-1024\r\r");
    }      
  }
  else
  {
    print("Calibration records not found.  Default\r");
    print("calibration values will be used.\r\r");
    print("For better performance, follow instructions\r");
    print("for calibrating your ActivityBot360.\r");
  }   
    
  int mVccwL = ee_getInt(_AB360_EE_Start_ + _AB360_EE_mVccwL_);
  int bVccwL = ee_getInt(_AB360_EE_Start_ + _AB360_EE_bVccwL_); 
  int mVcwL = ee_getInt(_AB360_EE_Start_ + _AB360_EE_mVcwL_); 
  int bVcwL = ee_getInt(_AB360_EE_Start_ + _AB360_EE_bVcwL_); 

  int mVccwR = ee_getInt(_AB360_EE_Start_ + _AB360_EE_mVccwR_); 
  int bVccwR = ee_getInt(_AB360_EE_Start_ + _AB360_EE_bVccwR_); 
  int mVcwR = ee_getInt(_AB360_EE_Start_ + _AB360_EE_mVcwR_); 
  int bVcwR = ee_getInt(_AB360_EE_Start_ + _AB360_EE_bVcwR_); 
  
  /*
  servo360_setTransferFunction(abd360_pinCtrlLeft, S360_SETTING_VM_CCW, mVccwL);
  servo360_setTransferFunction(abd360_pinCtrlLeft, S360_SETTING_VB_CCW, bVccwL);
  servo360_setTransferFunction(abd360_pinCtrlLeft, S360_SETTING_VM_CW, mVcwL);
  servo360_setTransferFunction(abd360_pinCtrlLeft, S360_SETTING_VB_CW, -bVcwL );

  servo360_setTransferFunction(abd360_pinCtrlRight, S360_SETTING_VM_CCW, mVccwR );
  servo360_setTransferFunction(abd360_pinCtrlRight, S360_SETTING_VB_CCW, bVccwR);
  servo360_setTransferFunction(abd360_pinCtrlRight, S360_SETTING_VM_CW, mVcwR);
  servo360_setTransferFunction(abd360_pinCtrlRight, S360_SETTING_VB_CW, -bVcwR);
  */

  /*
  print("Inverse Transfer Function Constants\r");
  print("for y = mx + b\r");
  print("y: Offset from 15,000 in 0.1 us units\r");
  print("m: Slope in 1.0 us / 4096 increments\r");
  print("x: Desired speed in 4096ths of a revolution/second\r");
  print("b: Number of 0.1 us increments added to 15000\r");
  print("\r===================================\r"); 
  print("\rLeft Servo, Counterclockwise\r");
  print("m = %d\r", mVccwL); 
  print("b = %d\r", bVccwL); 
  print("\rLeft Servo, Clockwise\r");
  print("m = %d\r", mVcwL); 
  print("b = %d\r", bVcwL); 
  
  print("\rRight Servo, Counterclockwise\r");
  print("m = %d\r", mVccwR); 
  print("b = %d\r", bVccwR); 
  print("\rRight Servo, Clockwise\r");
  print("m = %d\r", mVcwR); 
  print("b = %d\r", bVcwR);  
  */ 
}


