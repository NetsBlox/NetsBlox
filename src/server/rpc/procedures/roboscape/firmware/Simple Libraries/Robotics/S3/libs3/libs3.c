/*

*********************************************
*  Scribbler Default Program                *
*  Author: Ben Wirz, Element Products, Inc. *
*  Copyright (c) 2010 Parallax, Inc.        *  
*  See end of file for terms of use.        *
********************************************* 

The Scribbler comes with a series of a 8 Demonstration
Programs installed when purchased new.  The programs
are ordered such that each of the Scribbler//s sensing
capabilities are shown statically followed by an
interactive demonstration of the sensor//s
capabilities.  The demonstration programs are
selected by by pushing the Blue Push Switch 1 to 8
times following power-on or by utilizing the
finger selection technique.  The 3 user LED//s
sequence with each  switch push to indicate the currently
selected program.  A new program can be selected at any
time by pushing the switch - the scribbler does not need
to be turned off.

1 Button Push    : Light Sensor Display
2 Button Pushes  : Light Follow Program
3 Button Pushes  : Obstacle Sensor Display
4 Button Pushes  : Obstacle Avoid Program
5 Button Pushes  : Line Sensor Display
6 Button Pushes  : Line Follow Program
7 Button Pushes  : Drawing Program
8 Button Pushes  : Ambulance Program  

(See the individual functions and the Scribbler Quick
Start Guide for additional documentation.)

Power Indicator LED:
  
The Blue LED serves as a power-on indicator as
well as displaying the battery condition.

 Solid Blue       : Battery Fully Charged
 Dim Blue         : Battery Partially Charged
 Blinking Blue    : Battery Low / Replace or Recharge

Over Current Condition:

In the case of a motor over current condition due
to an electrical short circuit, the motor driver
will be disabled in hardware.  This condition is
indicated by all three of the Red LED//s Blinking
and the Blue LED being turned off.  To reset the
condition, cycle the Scribblers//s power off for 15 seconds
and then back on.

Scribbler Test Utility:

A Serial Terminal Test Utility has been included with
the default program for testing the scribbler_  The utility
includes a factory test and several debugging
programs.  The utility was designed to be used with
a host PC running the Parallax Serial Terminal program.

Parallax Serial Terminal Program Setup

Com Port:  Choose the correct port for the Scribbler
Baud Rate:  19,200bps
Click Restore Defaults in the Preferences Window 
The DTR, RTS & Echo On Boxes should be unchecked
 
With the Parallax Serial Terminal enabled on the
host PC, hold down the blue button while turning on
the Scribbler//s power switch to start the utility.  To exit
the Test Utility, cycle the Scribbler//s power switch.

*/

#include "s3.h"



// ------ Main Program ------
int main() {
}


/*

CON

#define   VERSION                   2             //Release Version Number
#define   SUBVERSION                2579          //Internal Version Number    
           
#define   LINE_TRIP                 40            //The maximum line sensor reading
                                                  //for a black line.
#define   LINE_TRIP_ALT             30            //The alternative maximum line sensor black line.
                                      
#define   LINE_LIFT                 7             //The maximum line sensor reading for
                                                  //detecting a lifted robot.

#define   LIGHT_TRIP_INC            10            //The minimum delta value change in the light sensor
                                                  //output over the running average for a finger
                                                  //detection.  

#define   OBS_THLD                  20            //The obstacle sensor sensitivity setting. (1 to 100)
#define   OBS_MAX_SAMPLE_RATE       8             //The obstacle sensor maximum sample rate in Hz. 
#define   PERIODIC_FREQ             8             //The frequency of the periodic function called by a repeat loop in Hz.  
  
#define   MOTOR_OC_TRIP             210           //The minimum motor driver over current detect level

                                                  //S2 battery voltage trip levels. (NiMH / Alkaline)
#define   S2_BATTERY_LOW_TRIP       (700*2550)/(400*33)       //7.0V
#define   S2_BATTERY_DEAD_TRIP      (600*2550)/(400*33)       //6.0V
   
                                                  //S3 battery voltage trip levels. (LiPo)
#define   S3_BATTERY_LOW_TRIP       (350*2550)/(200*33)       //3.5V
#define   S3_BATTERY_DEAD_TRIP      (320*2550)/(200*33)       //3.2V
#define   S3_BATTERY_OFF_TRIP       (300*2550)/(200*33)       //3.0V 
   
                                                   //Global feature enable / disable options.
#define   STALL_CHECK               1              //Enable stall detection?
#define   OBSTACLE_CHECK            1              //Enable obstacle detection? 
#define   SONG_ENABLE               1              //Enable song playing at the start of programs? 
                                                   //(does not fully disable the speaker)


//Scaling constants for finger off sample.  Sets the min trip level for finger_on.
//Finger Off Trip = Finger On Boot * (LGT_OFF_MULT / LGT_OFF_DIV)
   
#define  LGT_ON_MULT                4
#define  LGT_ON_DIV                 3 

#include  "scribbler.h"
//  scribbler_test       : "scribbler_test"
//  music                : "scribbler_music"
     

unsigned char state_current,state_previous,state_changed,battery_min,light_last,light_last_detect,light_running_avg;
int periodic_next_cnt;

unsigned char obs_sample_right, obs_sample_left;   //The sampled obstacle sensor readings.
unsigned char obs_sample_side;                     //The current obstacle sensor side being sampled..
  
int start(demo_select) {
  //Scribbler Demo Start-up & Program Selection
  
  DIRA BUTTON~       //Check if the button was held at power on                     
  ifnot INA BUTTON   //Start the factory test program
    scribbler_test_start(VERSION,SUBVERSION,LINE_TRIP_ALT,OBS_THLD);

  //Start hardware driver cogs and low level routines
  scribbler_start();
  scribbler_start_motors();
  scribbler_start_tones();
  scribbler_button_mode(1, 1);

  //Initialize variables
  battery_min = 0xFF;
  state_current = 0;
  state_previous = 0;
  state_changed = 0;

  //Branch to a demo program based on either the number of button presses
  //or the user selected finger code following 1 button press.
  if (scribbler_reset_button_count() <= 1) {
    demo_select = finger_select;
  } else {
    demo_select = scribbler_reset_button_count - 1;
  }
        
  if(demo_select == 0)      light_sensor();
  else if(demo_select == 1) light_follow();
  else if(demo_select == 2) obs_sensor();
  else if(demo_select == 3) obs_avoid(0);
  else if(demo_select == 4) line_sensor();
  else if(demo_select == 5) line_follow();
  else if(demo_select == 6) scribble();
  else                      obs_avoid(1);
    
}    


finger_select(int code,int light_trip_left,int light_trip_center,int light_trip_right)
{
  //Capture the finger selected code
  //
  //Returns a 3 bit binary code corresponding to the finger selection
  //The user must hold their fingers over the light sensors holes prior to
  //calling the function.   The fingers should be removed following the
  //the musical note.

  scribbler_delay_tenths(4);

  //Sample and scale light sensor levels at boot (fingers on)
  light_trip_left = (scribbler_light_sensor(LEFT) * LGT_ON_MULT) / LGT_ON_DIV;                  
  light_trip_center = (scribbler_light_sensor(CENTER) * LGT_ON_MULT) / LGT_ON_DIV;   
  light_trip_right = (scribbler_light_sensor(RIGHT) * LGT_ON_MULT) / LGT_ON_DIV;
  
  music_play_note(music#HALF,music#G3,0)                                        //Beep for the user to take fingers off

  for(k = 0; k < 20; k++) {                                                                     //Check for finger removal
    scribbler_delay_tenths(1);                                                   //Time out if not detected
    if ((light_trip_left < scribbler_light_sensor(LEFT)) || (light_trip_center < scribbler_light_sensor(CENTER)) || (light_trip_right < scribbler_light_sensor(RIGHT))) {
      break;
    }   
  }   

  scribbler_delay_tenths(10);                                                    //Pause while fingers are removed
  
  if (light_trip_right < scribbler_light_sensor(RIGHT))    code =  0b001;              //Decode the finger bits
  else                                                     code =  0b000;
  if (light_trip_center < scribbler_light_sensor(CENTER))  code |= 0b010;
  if (light_trip_left < scribbler_light_sensor(LEFT))      code |= 0b100;

  return code;
}  

PUB light_sensor | light_init,side
  //Light Sensor Test Program
  //Finger Code 000 / 0 Button Presses
  //
  //Display light sensor levels on the corresponding left, center and right LED//s
  //If a light sensors hole is covered set the LED to off.
  //If the hole is uncovered, the LED will be green or yellow.
  //Trip points are calculated based on the start-up light level - assumes fingers are off
  
  light_init = (scribbler_light_sensor(LEFT) + scribbler_light_sensor(CENTER) + scribbler_light_sensor(RIGHT))/3 #> 40; 
   
  scribbler_delay_tenths(30)                                                    //Pause for 3 seconds before
  if SONG_ENABLE                                                                //starting the light program
    music.play_song(music#LIGHT,2000)

  periodic_init
  repeat
    repeat side from scribbler#LEFT to scribbler#CENTER
      if scribbler_light_sensor(side) => (light_init * 90) / 100                //Trip at 90% of start-up level
        scribbler_set_led(side,scribbler#GREEN)
      elseif scribbler_light_sensor(side) => (light_init * 80) / 100            //Trip at 80% of start-up level
        scribbler_set_led(side,scribbler#YELLOW)
      else
        scribbler_set_led(side,scribbler#OFF)        
    periodic

CON //Light Follow Constants

  LGT_FOR_VEL               = 220     //Forward speed
  LGT_FOR_TIME              = 4000    //Forward move time out
  
  LGT_ARC_FAST_VEL          = 255     //Arc Speed
  LGT_ARC_SLOW_VEL          = 127     
  LGT_ARC_TIME              = 2000    //Arc move time out 

  LGT_LOST_TIME             = 20      //How frequently to play lost tune (Secs) 

  //Light Follow States
  #0,LGT_CLEAR,LGT_STALL,LGT_STALL_RECOVER,LGT_LOST,LGT_OBS_RIGHT,LGT_OBS_LEFT,LGT_OBS_RECOVER,{
  }LGT_OBS_OVERIDE_LEFT,LGT_OBS_OVERIDE_RIGHT    

PUB light_follow | lost_cnt
  //Light Follow Behavior
  //Finger Code 00X / 2 Button Presses
  //
  //The Light Follow program attempts to follow a hand-held flashlight.
  //When the user shines the flashlight on the front of the scribbler, it will
  //turn and move towards the users.   The scribbler also attempts to avoid
  //any obstacles detected with the IR sensors & respond to stalls                                                              
  //
  //LED Codes:
  //
  //Single Green - Light Currently Detected (Left, Center or Right Side)
  //Single Yellow - Light Recently Detected (Left, Center or Right Side) 
  //All Off - No Recent Light Detects
  //Single Left Red or Right Red - Obstacle Detected 
  //Single Center Red - Stall Detect

  lost_cnt :=  constant(-60 * PERIODIC_FREQ)                                    //Initially disable lost detection
  if SONG_ENABLE
    music.play_song(music#REVEILLE,1000) 
  set_state (LGT_CLEAR)
  set_state (LGT_CLEAR)
  periodic_init
  repeat
    CASE state_current
      LGT_CLEAR:                                                                //Check Obstacle & Stall Detectors
        if scribbler_stalled AND STALL_CHECK
          set_state(LGT_STALL)
        elseif obs_sampled(scribbler#LEFT)AND OBSTACLE_CHECK
          if (light_last_detect == scribbler#LEFT)                              //Ignore the obstacle and rotate  
            set_state(LGT_OBS_OVERIDE_LEFT)                                     //towards a light if detected on
          else                                                                  //the obstacle side.
            set_state(LGT_OBS_LEFT)
        elseif obs_sampled(scribbler#RIGHT) AND OBSTACLE_CHECK
          if (light_last_detect == scribbler#RIGHT)
            set_state(LGT_OBS_OVERIDE_RIGHT) 
          else
            set_state(LGT_OBS_RIGHT)
        else                                                                     //No stall & no obstacle detected                                                                           
          case (light_max_check)
            scribbler#LEFT:
              scribbler_set_leds(scribbler#GREEN,scribbler#OFF,scribbler#OFF,scribbler#NO_CHANGE) 
              scribbler_wheels_now(LGT_ARC_SLOW_VEL,LGT_ARC_FAST_VEL,LGT_ARC_TIME)
              lost_cnt := 0
            scribbler#CENTER:
              scribbler_set_leds(scribbler#OFF,scribbler#GREEN,scribbler#OFF,scribbler#NO_CHANGE)
              scribbler_wheels_now(LGT_FOR_VEL,LGT_FOR_VEL,LGT_FOR_TIME)
              lost_cnt := 0
            scribbler#RIGHT: 
              scribbler_set_leds(scribbler#OFF,scribbler#OFF,scribbler#GREEN,scribbler#NO_CHANGE)  
              scribbler_wheels_now(LGT_ARC_FAST_VEL,LGT_ARC_SLOW_VEL,LGT_ARC_TIME)
              lost_cnt := 0
            scribbler#NONE:
              lost_cnt += 1
              if scribbler_moving                                                //Set LED on last detected side
                if lost_cnt == constant(PERIODIC_FREQ / 2)
                  scribbler_set_led(light_last_detect,scribbler#YELLOW)
              else
                scribbler_set_leds(scribbler#OFF,scribbler#OFF,scribbler#OFF,scribbler#NO_CHANGE)
                if lost_cnt == constant(PERIODIC_FREQ * LGT_LOST_TIME) 
                  music.play_song(music#LOST,1000) 
                  lost_cnt := 0
          
      LGT_STALL:                                    
        music.play_note(music#QURT,music#A5,0)                                  //Stall detected
        scribbler_move_now(-160,-160,2000,12,0)                                 //Reverse for half the scribbler//s length
        if (light_last_detect == scribbler#LEFT)                                //Rotate in last detected
          scribbler_turn_deg(90)                                                //light direction.
        else
          scribbler_turn_deg(-90)
        scribbler_set_leds(scribbler#OFF,scribbler#RED,scribbler#OFF,scribbler#NO_CHANGE)
        set_state(LGT_STALL_RECOVER)

      LGT_STALL_RECOVER:
        if NOT scribbler_moving and NOT scribbler_stalled  
          scribbler_set_leds(scribbler#OFF,scribbler#OFF,scribbler#OFF,scribbler#NO_CHANGE) 
          set_state(LGT_CLEAR)

      LGT_OBS_LEFT:                                                             //Obstacle Detected                   
        scribbler_set_speed (13)
        scribbler_turn_deg_now(-15)                                             //Turn to Avoid  
        scribbler_set_leds(scribbler#RED,scribbler#OFF,scribbler#OFF,scribbler#NO_CHANGE) 
        set_state(LGT_OBS_RECOVER)

      LGT_OBS_OVERIDE_LEFT:
        scribbler_set_speed (13)         
        scribbler_turn_deg_now(30)
        scribbler_set_leds(scribbler#ALT_RED_GREEN,scribbler#OFF,scribbler#OFF,scribbler#NO_CHANGE)          
        set_state(LGT_OBS_RECOVER) 
        
      LGT_OBS_RIGHT:                         
        scribbler_set_speed (13)         
        scribbler_turn_deg_now(15)
        scribbler_set_leds(scribbler#OFF,scribbler#OFF,scribbler#RED,scribbler#NO_CHANGE)          
        set_state(LGT_OBS_RECOVER)  

      LGT_OBS_OVERIDE_RIGHT:                               
        scribbler_set_speed (13)                                 
        scribbler_turn_deg_now(-30)                             
        scribbler_set_leds(scribbler#OFF,scribbler#OFF,scribbler#ALT_RED_GREEN,scribbler#NO_CHANGE)          
        set_state(LGT_OBS_RECOVER)
      
      LGT_OBS_RECOVER:
        if scribbler_stalled
          set_state(LGT_STALL)
        elseif obs_sampled(scribbler#LEFT) OR obs_sampled(scribbler#RIGHT)
          set_state(state_previous)                                             //Obstacle still detected -                                     
        elseifnot scribbler_moving                                             //rotate further   
          scribbler_set_leds(scribbler#OFF,scribbler#NO_CHANGE,scribbler#OFF,scribbler#NO_CHANGE) 
          set_state(LGT_CLEAR)

    periodic

PUB light_max_check | sample_left,sample_center,sample_right
  //Check the three light sensors
  //
  //Return an index to the highest level sensor if the sensor//s
  //level is greater than the running average plus a minimum detection level.

  sample_left := scribbler_light_sensor(scribbler#LEFT)
  sample_center := scribbler_light_sensor(scribbler#CENTER) 
  sample_right := scribbler_light_sensor(scribbler#RIGHT)

  case (light_last)
    scribbler#LEFT:
      light_running_avg := ((sample_center + sample_right)/2 +  light_running_avg) / 2 
    scribbler#CENTER:
      light_running_avg := ((sample_left + sample_right)/2 +  light_running_avg) / 2
    scribbler#RIGHT:
      light_running_avg := ((sample_left + sample_center)/2 +  light_running_avg) / 2          
    scribbler#NONE:
      light_running_avg := (((sample_left + sample_center + sample_right) / 3) +  light_running_avg) / 2 
 
  if (sample_left > light_running_avg + LIGHT_TRIP_INC) AND (sample_left > sample_center) AND (sample_left > sample_right)
    return light_last:= light_last_detect := scribbler#LEFT   
  elseif (sample_center > light_running_avg + LIGHT_TRIP_INC) AND (sample_center > sample_right)
    return light_last:= light_last_detect := scribbler#CENTER
  elseif (sample_right > light_running_avg + LIGHT_TRIP_INC)
    return light_last:= light_last_detect := scribbler#RIGHT
  else
    return light_last:= scribbler#NONE  

CON //Obstalce Sensor Debug Constants

  OBS_DEBUG_NOTE_LENGTH           = 80              // Length of the Note (mS)
    
PUB obs_sensor             
  //Obstacle Sensor Test Program
  //Finger Code 0X0 / 3 Button Presses  
  //
  //Display the obstacle sensor state on the left and right LED//s.
  //Play a note a note on detection.

  scribbler_set_voices(scribbler#SIN,scribbler#SIN)
  scribbler_set_volume(90)
  periodic_init
  
  repeat
    if obs_sample_right AND obs_sample_left
      scribbler_play_tone(OBS_DEBUG_NOTE_LENGTH,music.freq(music#E4),0)
      scribbler_command_tone(scribbler#PLAY)
      scribbler_set_led(scribbler#RIGHT,scribbler#GREEN)
      scribbler_set_led(scribbler#LEFT,scribbler#GREEN)
    elseif obs_sample_right
      scribbler_play_tone(OBS_DEBUG_NOTE_LENGTH,music.freq(music#B4),0)
      scribbler_command_tone(scribbler#PLAY)    
      scribbler_set_led(scribbler#RIGHT,scribbler#GREEN)
      scribbler_set_led(scribbler#LEFT,scribbler#RED)
    elseif obs_sample_left
      scribbler_play_tone(OBS_DEBUG_NOTE_LENGTH,music.freq(music#C4),0)
      scribbler_command_tone(scribbler#PLAY)    
      scribbler_set_led(scribbler#RIGHT,scribbler#RED)
      scribbler_set_led(scribbler#LEFT,scribbler#GREEN)
    else
      scribbler_set_led(scribbler#RIGHT,scribbler#RED)
      scribbler_set_led(scribbler#LEFT,scribbler#RED)
      scribbler_command_tone(scribbler#STOP)
    periodic

CON
  //Obstacle Avoid Constants
  OBS_FOR_VEL               = 15          //Forward speed
  OBS_ROT_VEL               = 12          //Rotate in place speed
  
  //Obstacle Avoid States
  #0,OBS_STALL,OBS_STALL_RECOVER,OBS_DETECT_LEFT,OBS_DETECT_RIGHT,OBS_DETECT_RECOVER,OBS_STRAIGHT,OBS_ARC_LEFT,OBS_ARC_RIGHT,OBS_ROT_RANDOM

PUB obs_avoid (ambulance) | obs_last,random,sample,sample_last,counter
  //Obstacle Avoid & Ambulance Behavior
  //Finger Code 0XX / 4 Button Presses - Obstacle Avoid 
  //Finger Code XXX / 8 Button Presses - Ambulance
  //  
  //The scribbler drives randomly while executing the obstacle avoid behaviour.
  //If it senses an obstacle with its IR sensors, it turns in place until
  //the obstacle is no longer in its path.  The scribbler also responds to stall
  //detects by backing up and rotating away from the stall.                                                              
  //
  //Obstacle Avoid LED Codes:
  //
  //Left Red or Right Red - Obstacle Detect 
  //Center Red - Stall Detect
  //Center Green  - Drive Straight Forward
  //Left or Right Yellow - Arc Forward
  //
  //Ambulance Mode:
  //
  //If ambulance is set TRUE, the LED//s squence in the pattern simliar
  //to an ambulance light bar and an ambulance siren is played.   
 
  counter := 0
  if SONG_ENABLE
    if (ambulance)
      music.play_song(music#AMBULANCE,2000)
    else
      music.play_song(music#OBSTACLE,2000)
     
  set_state (OBS_STRAIGHT)
  set_state (OBS_STRAIGHT)
  periodic_init
  repeat
    CASE state_current                                            
      OBS_STRAIGHT:
        if obs_sensor_clear
          if state_new
            scribbler_set_speed(OBS_FOR_VEL)
            scribbler_go_forward(8000)                                           //Drive straight for a while
          elseif scribbler_move_ready 
            ifnot (ambulance)
              scribbler_set_leds(scribbler#OFF,scribbler#GREEN,scribbler#OFF,scribbler#NO_CHANGE)
            set_state(OBS_ROT_RANDOM)   

      OBS_ROT_RANDOM:
        if obs_sensor_clear
          if state_new
            scribbler_set_speed(OBS_ROT_VEL) 
            if (scribbler_light_sensor(scribbler#CENTER) & 1)                   //Choose a random rotate          
              scribbler_turn_deg(45)                                            //direction at the end of
            else                                                                //a straight move.
              scribbler_turn_deg(-45)           
          elseif scribbler_move_ready                                      
            ifnot (ambulance) 
              scribbler_set_leds(scribbler#OFF,scribbler#YELLOW,scribbler#OFF,scribbler#NO_CHANGE)       
            set_state(OBS_STRAIGHT)
           
      OBS_ARC_LEFT:
        if obs_sensor_clear                                          
          if state_new                                                          //Arc to the left
            scribbler_set_speed(OBS_FOR_VEL)
            scribbler_arc_deg_now(20,400)          
          elseif scribbler_move_ready                                      
            ifnot (ambulance)
              scribbler_set_leds(scribbler#YELLOW,scribbler#OFF,scribbler#OFF,scribbler#NO_CHANGE)       
            set_state(OBS_STRAIGHT)                                 
                                                            
      OBS_ARC_RIGHT:                                                            //Arc to the right
        if obs_sensor_clear 
          if state_new
           scribbler_set_speed(OBS_FOR_VEL)
           scribbler_arc_deg_now(-20,-400) 
          elseif scribbler_move_ready
            ifnot (ambulance)
              scribbler_set_leds(scribbler#OFF,scribbler#OFF,scribbler#YELLOW,scribbler#NO_CHANGE)        
            set_state(OBS_STRAIGHT)

      OBS_STALL:                                    
        ifnot (ambulance)
          music.play_note(music#QURT,music#A5,0)                                //Stall detected
        scribbler_move_now(-160,-160,2000,OBS_ROT_VEL,0)                        //Reverse for half the scribbler//s length
        if (obs_last == scribbler#LEFT)                                         //Rotate away from last detected
          scribbler_turn_deg(-120)                                              //obstacle.
        else
          scribbler_turn_deg(120)
        ifnot (ambulance)
          scribbler_set_leds(scribbler#OFF,scribbler#RED,scribbler#OFF,scribbler#NO_CHANGE)
        set_state(OBS_STALL_RECOVER)

      OBS_STALL_RECOVER:
        if NOT scribbler_moving and NOT scribbler_stalled  
          ifnot (ambulance)
            scribbler_set_leds(scribbler#OFF,scribbler#OFF,scribbler#OFF,scribbler#NO_CHANGE) 
          set_state(OBS_STRAIGHT)

      OBS_DETECT_LEFT:                                                          //Obstacle detected                   
        scribbler_set_speed(OBS_ROT_VEL)
        scribbler_turn_deg_now(-10)                                             //Turn to avoid  
        ifnot (ambulance)
          scribbler_set_leds(scribbler#RED,scribbler#OFF,scribbler#OFF,scribbler#NO_CHANGE)
        set_state(OBS_DETECT_RECOVER)
        obs_last :=  scribbler#LEFT

      OBS_DETECT_RIGHT:                         
        scribbler_set_speed(OBS_ROT_VEL)
        scribbler_turn_deg_now(10)
        ifnot (ambulance)
          scribbler_set_leds(scribbler#OFF,scribbler#OFF,scribbler#RED,scribbler#NO_CHANGE)
        set_state(OBS_DETECT_RECOVER)  
        obs_last :=  scribbler#RIGHT
        
      OBS_DETECT_RECOVER:
        if scribbler_stalled
          set_state(OBS_STALL)
        elseif obs_sampled(scribbler#LEFT) OR obs_sampled(scribbler#RIGHT)
          set_state(state_previous)                                             //Obstacle still detected -                                     
        else                                                                    //rotate further
          if (state_previous == OBS_DETECT_RIGHT)
            set_state(OBS_ARC_LEFT)                                             //Arc away from last obstacle
          else                                                    
            set_state(OBS_ARC_RIGHT)  

    if (ambulance)
      if (SONG_ENABLE AND (scribbler_get_sync == 128))
        music.play_song(music#AMBULANCE,2000)
      scribbler_set_led(scribbler#LEFT,lookupz(((counter >> 1) & %11) :scribbler#OFF,scribbler#RED,scribbler#OFF,scribbler#GREEN))
      scribbler_set_led(scribbler#RIGHT,lookupz(((counter >> 1) & %11) :scribbler#OFF,scribbler#RED,scribbler#OFF,scribbler#GREEN))
      scribbler_set_led(scribbler#CENTER,lookupz(counter & %111:scribbler#OFF,scribbler#OFF,scribbler#GREEN,scribbler#GREEN,scribbler#OFF,{
        }scribbler#OFF,scribbler#RED,scribbler#RED,scribbler#OFF,scribbler#OFF,scribbler#GREEN,scribbler#RED,scribbler#OFF,scribbler#OFF,scribbler#RED,scribbler#GREEN))
  
    counter += 1 
    periodic

PUB obs_sensor_clear
  //Check the obstacle & stall sensors
  //
  //Return TRUE if no obstacles or stalls
  //Return FALSE and change obstacle avoid state otherwise.
  
  if scribbler_stalled and STALL_CHECK         
    set_state(OBS_STALL)
    return FALSE
  elseif obs_sampled(scribbler#LEFT)and OBSTACLE_CHECK
    set_state(OBS_DETECT_LEFT)
    return FALSE  
  elseif obs_sampled(scribbler#RIGHT) and OBSTACLE_CHECK
    set_state(OBS_DETECT_RIGHT)
    return FALSE   
  else
    return TRUE      
 
CON
  LIFT_SPIN_CNT                    = 8                              //Number of idler wheel holes detects
  LIFT_TIME_MIN                    = PERIODIC_FREQ * 3        //Min time to wait before returning
  LIFT_TIME_MAX                    = PERIODIC_FREQ * 15       //Max time to wait before returning    
  
PUB lift_wait | idler_trip,loop_cnt
  //Wait until the scribbler is placed on the floor or line following track.
  //Set the middle LED blinking green and return TRUE if the user spins
  //the Idler Wheel.  Times out after if floor isn//t detected and returns
  
  scribbler_set_led(scribbler#CENTER,scribbler#OFF) 
  idler_trip := scribbler_get_results(scribbler#CNT_IDLER) + LIFT_SPIN_CNT      //Set the idler counter trip point
  loop_cnt := 0
  periodic_init
  repeat
    //Check if idler wheel has been rotated and set the center LED.
    if result := (scribbler_get_results(scribbler#CNT_IDLER) => idler_trip)    
      scribbler_set_led(scribbler#CENTER,scribbler#BLINK_GREEN)                       
    //Check if the scribbler is on the floor 
    if (scribbler_line_sensor(scribbler#LEFT,-1) > LINE_LIFT and scribbler_line_sensor(scribbler#RIGHT,-1) > LINE_LIFT and (loop_cnt > LIFT_TIME_MIN or result)){
       }or loop_cnt => LIFT_TIME_MAX                               
      return
    loop_cnt += 1  
    periodic
    
PUB line_sensor | sample_right, sample_left, black_trip
  //Finger Code X00 / 5 Button Presses  
  // 
  //Display the line sensor//s state. The right and left LED//s will light
  //green if a line is detected and red if no line is detected.
  //
  //The sensitivity of the line sensors can be modfied if the scribbler has trouble
  //detecing a particular line.  To reduce the sensitivity, hold the scribbler in
  //air while starting the demo with the finger selection method or by
  //pressing the blue switch 5 times. Spin the small rear idler wheel 
  //until the center LED blinks green. Next place the scribbler on the track.
  //Once the track is detected, the scribbler will display the line sensor
  //state as described above.  It is only necessary to to spin the idler
  //wheel if the scribbler has trouble detecting a particular line.  The default
  //setting should work in most cases. 
  
  if SONG_ENABLE 
    music.play_song(music#LINESENS,2000)  

  scribbler_set_leds(scribbler#RED,scribbler#OFF,scribbler#RED,scribbler#NO_CHANGE) 
  //Wait for the user to put the scribbler on the track before starting
  if lift_wait
    black_trip := LINE_TRIP_ALT
  else
    black_trip := LINE_TRIP
  
  scribbler_set_led(scribbler#CENTER,scribbler#OFF)
  periodic_init
   
  repeat
    sample_left := scribbler_line_sensor(scribbler#LEFT,-1)                     //Sample the line sensors
    sample_right := scribbler_line_sensor(scribbler#RIGHT,-1) 
    
    if sample_left > LINE_LIFT and sample_left =< black_trip
      scribbler_set_led(scribbler#LEFT,scribbler#GREEN)
    else
      scribbler_set_led(scribbler#LEFT,scribbler#RED)

    if sample_right > LINE_LIFT and sample_right =< black_trip
      scribbler_set_led(scribbler#RIGHT,scribbler#GREEN)
    else
      scribbler_set_led(scribbler#RIGHT,scribbler#RED)

    periodic

CON
  //Line Follow Constants & Behavior Description:
  //
  //The line following state machine loop frequency.
  
  LINE_LOOP_FREQ            = 100                                                //Hz   
    
  //If both the right and left sensors detect the line, the scribbler drives
  //straight forward and both the right and left LED//s will be lit green.

  LINE_FOR_VEL              = 240                                               //Forward speed
  //
  //If the scribbler only senses one line, it attempts to to drive parallel with
  //the line by arcing slightly in the appropriate direction.  Either the right
  //or left LED will be lit green corresponding to the side of line detection.
  
  LINE_MILD_ARC_FAST        = 255                                               //One Sensors Lost - Mild Arc
  LINE_MILD_ARC_SLOW        = 120                           
  //
  //If the scribbler doesn//t detect a line on either side for 2 loop cycles, it
  //attempts to recover by arcing hard in the direction of the last
  //detected line.  Either the right or the left LED will be lit yellow
  //corresponding to the side of the last detected line. 
  
  LINE_HARD_ARC_FAST        = 255                                               //Both Sensors Lost - Hard Arc
  LINE_HARD_ARC_SLOW        = -100          
  //
  //The scribbler only searches for the line by hard arcing for a short period.
  
  LINE_SEARCH_MAX           =  5*LINE_LOOP_FREQ/2                               //Number of loop periods to search
                                                                                //by hard arcing before rotating in place.
  //
  //If the scribbler fails to find the line by hard arcing, it next attempts
  //to recover the line by rotating clockwise and counter clockwise in place.
  //If it fails to find the line bu rotating in place, it backs up slightly
  //and then repeats the rotate in place search.  The left or right LED will
  //be lit red indicating the current rotate in place direction or the center
  //LED will be lit red if backing up.
  
  LINE_ROT_DEG              = 30                                                //Amount to incremnt rotate in place search (deg)
  LINE_ROT_MAX              = 60                                                //Max rotate in place angle +/- deg
  LINE_ROT_SPD              = 13                                                //Rotate in place and reverse speed
 
  LINE_RAMP_STEP            = 10                                                 //How big a step to ramp motor speed changes by

  
  //Line Follow States
  #0,LINE_STATE_INIT,LINE_STATE_MISS,LINE_STATE_SEARCH_RIGHT,LINE_STATE_SEARCH_LEFT,{
  }LINE_STATE_LOST_CW,LINE_STATE_LOST_CCW,LINE_STATE_LOST_CENTER,LINE_STATE_LOST_REV,{
  }LINE_STATE_LEFT,LINE_STATE_RIGHT,LINE_STATE_BOTH

  //Line Sensor State Index
  #0,LINE_SENSOR_NONE,LINE_SENSOR_LEFT,LINE_SENSOR_RIGHT,LINE_SENSOR_BOTH
    
PUB line_follow | search_cnt,rotate_deg,line_now,line_last,line_last_detect,mot_right_now,{
    }mot_right_target,mot_left_now,mot_left_target,ramp,black_trip,next_cnt
    
  //Line Follow Behavior
  //Finger Code X0X / 6 Button Presses
  //
  //The line follow programs attempts to follow a black line on a white
  //background. For best performance, a line width of a 5/8 - 3/4"
  //(15 to 20mm) is recommended.  The line can be drawn with a black marker
  //on white paper or sample printed lines are available for download from
  //Parallax//s website.  Use the Line Sensor Test Program (5 button presses)
  //to check surface compatibility.
  //
  //The sensitivity of the line sensors can be modfied if the scribbler has trouble
  //following a particular line.  To reduce the sensitivity, hold the scribbler in
  //air while starting the demo with the finger selection method or by
  //pressing the blue switch 6 times. Spin the small rear idler wheel 
  //until the center LED blinks green and then place the scribbler on the track.
  //Once the track is detect, the scribbler will start line following.  It is only
  //necessary to spin the idler wheel if your scribbler has trouble following a
  //particular line.  The default setting should work in most cases. 

  if SONG_ENABLE 
    music.play_song(music#EXCLAIM,1500)
 
  scribbler_set_leds(scribbler#RED,scribbler#OFF,scribbler#RED,scribbler#NO_CHANGE) 
  //Wait for the user to put the scribbler on the track before starting
  if lift_wait
    black_trip := LINE_TRIP_ALT
  else
    black_trip := LINE_TRIP
  scribbler_set_led(scribbler#CENTER,scribbler#OFF)
  
  //Initialize variables & state machine
  line_last := line_now := line_last_detect := LINE_SENSOR_NONE
  mot_right_now := mot_right_target := 0
  mot_left_now := mot_left_target := 0 
  search_cnt := 0          
  set_state(LINE_STATE_INIT)

  if SONG_ENABLE 
    music.play_song(music#ENTERTAINER,3000)

  next_cnt := cnt                                                               //Next counter value to wait for                        
  
  repeat
    waitcnt(next_cnt += clkfreq / LINE_LOOP_FREQ )                              //Create a periodic loop
    
     //Sample the line sensors  
    ifnot scribbler_line_sensor(scribbler#LEFT,black_trip)                            
      ifnot scribbler_line_sensor(scribbler#RIGHT,black_trip)                             
        line_last_detect := line_now := LINE_SENSOR_BOTH                        //Both lines detected
      else
        line_last_detect := line_now := LINE_SENSOR_LEFT                        //Left line detected
    elseifnot scribbler_line_sensor(scribbler#RIGHT,black_trip)                 //Right line detected
      line_last_detect := line_now := LINE_SENSOR_RIGHT
    else 
      line_now := LINE_SENSOR_NONE                                              //No lines detected
    
    //Preempt normal state flow if a line is detected
    case line_now                                                     
      LINE_SENSOR_BOTH:                                               
        set_state(LINE_STATE_BOTH)
      LINE_SENSOR_LEFT:
        set_state(LINE_STATE_LEFT) 
      LINE_SENSOR_RIGHT:
        set_state(LINE_STATE_RIGHT) 
     
    case state_current                                                          //Line following state machine
      LINE_STATE_INIT:                                                          //Initial start up state
        set_state(LINE_STATE_LOST_CCW)         
 
      LINE_STATE_LEFT:                                                          //Left Detect - Arc Left
        search_cnt := 0 
        ramp := TRUE
        scribbler_set_leds(scribbler#GREEN,scribbler#OFF,scribbler#OFF,scribbler#NO_CHANGE) 
        mot_left_target := LINE_MILD_ARC_SLOW
        mot_right_target := LINE_MILD_ARC_FAST 
        if line_now == LINE_SENSOR_NONE
          set_state(LINE_STATE_MISS)
                    
      LINE_STATE_RIGHT:                                                         //Right Detect - Arc Right
        search_cnt := 0 
        ramp := TRUE  
        scribbler_set_leds(scribbler#OFF,scribbler#OFF,scribbler#GREEN,scribbler#NO_CHANGE) 
        mot_left_target := LINE_MILD_ARC_FAST
        mot_right_target := LINE_MILD_ARC_SLOW 
        if line_now == LINE_SENSOR_NONE
          set_state(LINE_STATE_MISS)
                  
      LINE_STATE_BOTH:                                                          //Both Detect - Drive Straight
        search_cnt := 0 
        ramp := TRUE  
        scribbler_set_leds(scribbler#GREEN,scribbler#OFF,scribbler#GREEN,scribbler#NO_CHANGE)   
        mot_left_target := mot_right_target := LINE_FOR_VEL 
        if line_now == LINE_SENSOR_NONE
          set_state(LINE_STATE_MISS)
                                                                                                                                                    
      LINE_STATE_MISS:
        case line_last_detect                                                   //Select a search method based
          LINE_SENSOR_NONE:                                                     //on last detected line side.
            set_state(LINE_STATE_LOST_CCW)
          LINE_SENSOR_LEFT:
            set_state(LINE_STATE_SEARCH_LEFT) 
          LINE_SENSOR_RIGHT:
            set_state(LINE_STATE_SEARCH_RIGHT) 
          LINE_SENSOR_BOTH:                                               
            set_state(LINE_STATE_LOST_CW)
         
      LINE_STATE_SEARCH_LEFT:                                                   //Search for line by arcing                   
        ramp := TRUE                                                            //to the left.
        if state_new                                                       
          mot_left_target := LINE_HARD_ARC_SLOW
          mot_right_target := LINE_HARD_ARC_FAST 
          scribbler_set_leds(scribbler#YELLOW,scribbler#OFF,scribbler#OFF,scribbler#NO_CHANGE)
        elseif search_cnt > LINE_SEARCH_MAX                                     //Arcing didn//t work
          set_state(LINE_STATE_LOST_CCW)                                        //try rotating in place.

      LINE_STATE_SEARCH_RIGHT:    
        ramp := TRUE 
        if state_new
          scribbler_set_leds(scribbler#OFF,scribbler#OFF,scribbler#YELLOW,scribbler#NO_CHANGE)
          mot_left_target := LINE_HARD_ARC_FAST
          mot_right_target := LINE_HARD_ARC_SLOW          
        elseif search_cnt > LINE_SEARCH_MAX
          set_state(LINE_STATE_LOST_CW)

      LINE_STATE_LOST_CW:                                                       //Search by rotating
        mot_left_now := mot_right_now := 0
        ramp := FALSE
        if state_new                                                            //in place clockwise.
          scribbler_set_leds(scribbler#OFF,scribbler#OFF,scribbler#RED,scribbler#NO_CHANGE)
          scribbler_set_speed (LINE_ROT_SPD)
          if state_previous <> LINE_STATE_LOST_CCW
            rotate_deg := LINE_ROT_DEG                                          //First rotate in place attempt
            scribbler_turn_deg_now(-rotate_deg)
          elseif rotate_deg < constant(LINE_ROT_MAX * 2)  
            rotate_deg += LINE_ROT_DEG                                          //Increase rotation angle
            scribbler_turn_deg_now(-rotate_deg)
          else                                                                  //Rotate failed, try backing up
            set_state(LINE_STATE_LOST_CENTER)                                   //a short distance.
        elseifnot scribbler_moving                      
           set_state(LINE_STATE_LOST_CCW)                                       //Change rotation direction
      
      LINE_STATE_LOST_CCW:                                                      //Search for by rotating
        mot_left_now := mot_right_now := 0                                      //in place counterclockwise
        ramp := FALSE
        if state_new                                                            
          scribbler_set_leds(scribbler#RED,scribbler#OFF,scribbler#OFF,scribbler#NO_CHANGE)
          scribbler_set_speed (LINE_ROT_SPD)
          if state_previous <> LINE_STATE_LOST_CW
            rotate_deg := LINE_ROT_DEG           
            scribbler_turn_deg_now(rotate_deg)
          elseif rotate_deg < constant(LINE_ROT_MAX * 2) 
            rotate_deg += LINE_ROT_DEG
            scribbler_turn_deg_now(rotate_deg)
          else
            set_state(LINE_STATE_LOST_CENTER)              
        elseifnot scribbler_moving
          set_state(LINE_STATE_LOST_CW)

      LINE_STATE_LOST_CENTER:                                                   //Rotate to the center position
        ramp := FALSE                                                           //and then back up.
        if state_new                                                            
          scribbler_set_leds(scribbler#OFF,scribbler#RED,scribbler#OFF,scribbler#NO_CHANGE)
          rotate_deg := rotate_deg / 2
          if state_previous == LINE_STATE_LOST_CCW
            scribbler_turn_deg_now(rotate_deg)
          else
            scribbler_turn_deg_now(-rotate_deg)                     
        elseifnot scribbler_moving
          set_state(LINE_STATE_LOST_REV)          
      
      LINE_STATE_LOST_REV:                                                      //Back up straight and then restart
        ramp := FALSE 
        if state_new                                                            //rotate in place search.
          scribbler_set_leds(scribbler#OFF,scribbler#RED,scribbler#OFF,scribbler#NO_CHANGE)                 
          scribbler_move_now(-160,-160,1500,12,0)                    
        elseifnot scribbler_moving                                             //Start rotate in place search again
          set_state(LINE_STATE_LOST_CW)                                         //once move is complete.
    
    if ramp == TRUE                                                             //Ramp motors speeds
      if mot_left_now > mot_left_target
        mot_left_now := (mot_left_now - LINE_RAMP_STEP) #> mot_left_target   
      else
        mot_left_now := (mot_left_now + LINE_RAMP_STEP) <# mot_left_target
      if mot_right_now > mot_right_target
        mot_right_now := (mot_right_now - LINE_RAMP_STEP) #> mot_right_target   
      else
        mot_right_now := (mot_right_now + LINE_RAMP_STEP) <# mot_right_target         
      scribbler_wheels_now(mot_left_now,mot_right_now,0)
      if mot_right_now == mot_right_target AND mot_left_now == mot_left_target  // motor ramp complete
        ramp := FALSE
 
    line_last := line_now                                                       //Save the previous line sample
    search_cnt += 1                                                             //Increment the search counter

    
  
CON
  //Scribble drawing constants
  //Modify values to change drawing size
  
  SCRIB_SQR_LEN             = 100           //Square side length (1/2 mm//s)
  SCRIB_EIGHT_RAD           = 50            //Figure Eight loop radius (1/2 mm//s)
  
PUB scribble
  //Finger Code XX0 / 7 Button Presses
  //Draw a Figure Eight and a Square Shape using the marker port.

  if SONG_ENABLE 
    music.play_song(music#EXCLAIM,1500)  
  
  scribbler_set_speed(5)
  scribbler_here_is(0,0)
  scribbler_heading_is_deg(0)
  
  scribbler_begin_path                                                           //Draw a figure 8
  scribbler_arc_by(SCRIB_EIGHT_RAD,-SCRIB_EIGHT_RAD,SCRIB_EIGHT_RAD)             //Top loop of 8
  scribbler_arc_by(SCRIB_EIGHT_RAD,SCRIB_EIGHT_RAD,SCRIB_EIGHT_RAD) 
  scribbler_arc_by(-SCRIB_EIGHT_RAD,SCRIB_EIGHT_RAD,SCRIB_EIGHT_RAD)
  scribbler_arc_by(-SCRIB_EIGHT_RAD,-SCRIB_EIGHT_RAD,SCRIB_EIGHT_RAD) 
  scribbler_arc_by(-SCRIB_EIGHT_RAD,-SCRIB_EIGHT_RAD,-SCRIB_EIGHT_RAD)           //Bottom loop of 8
  scribbler_arc_by(-SCRIB_EIGHT_RAD,SCRIB_EIGHT_RAD,-SCRIB_EIGHT_RAD) 
  scribbler_arc_by(SCRIB_EIGHT_RAD,SCRIB_EIGHT_RAD,-SCRIB_EIGHT_RAD)
  scribbler_arc_by(SCRIB_EIGHT_RAD,-SCRIB_EIGHT_RAD,-SCRIB_EIGHT_RAD)
  scribbler_end_path

  scribbler_wait_stop
  music.play_note(music#QURT,music#G3,0)                         
  scribbler_delay_tenths(60)                                                     //Pause between drawings

  scribbler_here_is(0,0)
  scribbler_heading_is_deg(0)    
  scribbler_begin_path                                                           //Draw a square
  scribbler_go_forward(SCRIB_SQR_LEN)
  repeat 3
    scribbler_go_right(SCRIB_SQR_LEN)
  scribbler_end_path

  scribbler_wait_stop
  music.play_song(music#LAC,1500) 

  periodic_init
  repeat
    periodic


PRI set_state(state_set)
  //Set a new state & store the previous state 

  if state_current <>  state_set                                        //Set the state changed flag
    state_changed := TRUE
  state_previous := state_current                                       //Store the previous state
  state_current := state_set


PRI state_new
  //Check if the state has been changed.
  //Cleared when called 
  return state_changed~
 
PRI periodic_init
  //Initializes the periodic timer & return after sampling the obstacle sensors

  obs_sample_right := scribbler_obstacle(scribbler#right,OBS_THLD)   //Sample the right obstalce sensor now
  periodic_next_cnt :=  (clkfreq / PERIODIC_FREQ) + CNT
  obs_sample_side := scribbler#left
  periodic                                                           // Pause, sample the left and then return                                   

  
PRI periodic
  //Pause for a fixed duration since the last called.
  //Use to create a repeating function at the max obstacle sensor sample rate
  //Samples the IR receivers, checks the battery voltage and for motor overcurrents if there is time available.

  if obs_sample_side == scribbler#right                               // alternate sampling the right and left IR sensors                                
    obs_sample_right := scribbler_obstacle(scribbler#right,OBS_THLD)
    obs_sample_side := scribbler#left
  else
    obs_sample_left := scribbler_obstacle(scribbler#left,OBS_THLD)
    obs_sample_side := scribbler#right   
                                                        
  if (periodic_next_cnt - clkfreq / 100) > CNT          //Check the battery voltage & motor driver OC state
    battery_check                                       //if there//s time.
    oc_check                                                            

  if periodic_next_cnt > CNT                            //Check if the counter has already passed the target                                         
    waitcnt(periodic_next_cnt)

  periodic_next_cnt :=  (clkfreq / PERIODIC_FREQ) + CNT            //Calculate the next counter value  

PUB obs_sampled(side)
  //Returns the sampled obstacle sensor reading for a given side.
  //The sensor is sampled with periodic.

  if side == scribbler#right
    result :=  obs_sample_right
  else
    result :=  obs_sample_left
  

PUB oc_check
  //Check for a hardware motor driver over current condition
  //An OC condition is indicated by blinking Red LED//s
  //and the speaker beeping every 10 seconds.
  
  if scribbler_get_adc_results(scribbler#ADC_IMOT) > MOTOR_OC_TRIP
    scribbler_start 
    scribbler_start_tones
    scribbler_set_leds(scribbler#BLINK_RED,scribbler#BLINK_RED,scribbler#BLINK_RED,scribbler#OFF)
    repeat
      scribbler_beep
      scribbler_delay_tenths(100) 

PUB battery_check : sample
  //Set the power LED corresponding to the battery voltage level

  sample := scribbler_get_adc_results(scribbler#ADC_VBAT)
  if sample < battery_min                                                       //Save the lowest battery
    battery_min := sample                                                       //voltage detected

  if scribbler_get_model_s2                                                     
    if battery_min > S2_BATTERY_LOW_TRIP                                        //Originial S2 Hardware
      scribbler_set_led(scribbler#POWER,scribbler#BLUE)
    elseif battery_min > S2_BATTERY_DEAD_TRIP
      scribbler_set_led(scribbler#POWER,scribbler#DIM_BLUE)
    else
      scribbler_set_led(scribbler#POWER,scribbler#BLINK_BLUE)
  else                                                                           //S3 Hardware
    if scribbler_get_usb_powered or battery_min > S3_BATTERY_LOW_TRIP
      scribbler_set_led(scribbler#POWER,scribbler#BLUE)
    elseif battery_min > S3_BATTERY_DEAD_TRIP
      scribbler_set_led(scribbler#POWER,scribbler#DIM_BLUE)
    elseif battery_min > S3_BATTERY_OFF_TRIP
      scribbler_set_led(scribbler#POWER,scribbler#BLINK_BLUE)
    else                                                                        // Play Taps and then shut off
      scribbler_stop_now
      music.play_song(music#TAPS,1000)
      scribbler_set_leds(scribbler#DIM_GREEN,scribbler#DIM_GREEN,scribbler#DIM_GREEN,scribbler#BLUE)
      scribbler_wait_sync(1)
      scribbler_set_leds(scribbler#OFF,scribbler#DIM_GREEN,scribbler#DIM_GREEN,scribbler#BLUE)
      scribbler_wait_sync(2)
      scribbler_set_leds(scribbler#OFF,scribbler#OFF,scribbler#DIM_GREEN,scribbler#BLUE)
      scribbler_wait_sync(3)
      scribbler_set_leds(scribbler#OFF,scribbler#OFF,scribbler#OFF,scribbler#DIM_BLUE)
      scribbler_wait_sync(4)
      scribbler_set_leds(scribbler#OFF,scribbler#OFF,scribbler#OFF,scribbler#OFF)
      scribbler_set_power_off 


           
      
/*
┌──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                                   TERMS OF USE: MIT License                                                  │                                                            
├──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┤
│Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation    │ 
│files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy,    │
│modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software│
│is furnished to do so, subject to the following conditions:                                                                   │
│                                                                                                                              │
│The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.│
│                                                                                                                              │
│THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE          │
│WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR         │
│COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE,   │
│ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.                         │
└──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┘
*/




