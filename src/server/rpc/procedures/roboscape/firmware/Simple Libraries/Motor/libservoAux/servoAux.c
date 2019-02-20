/*
 * @file servoAux.c
 *
 * @author Andy Lindsay
 *
 * @version 0.90
 *
 * @copyright Copyright (C) Parallax, Inc. 2012.  See end of file for
 * terms of use (MIT License).
 *
 * @brief Manages control of up to 14 servos using another CMM/LMM cog.
 *
 * Please submit bug reports, suggestions, and improvements to         
 * this code to editor@parallax.com.
 */


#include "simpletools.h"
#include "servoAux.h"


static void pulse_outCtrAux(int pin, int time);      // Forward declaration
static int servoAux_start(void);
static void servoAux(void *par); 


static volatile unsigned int servoAuxCog = 0;        // Cog initialized to zero
static volatile unsigned int lockID;                 // Lock ID 
static unsigned int stack[44 + 24];                   // Stack

static volatile int p[14] = {-1, -1, -1, -1,         // I/O pins
                     -1, -1, -1, -1, -1, -1, 
                     -1, -1, -1, -1};
static volatile int t[14] = {-1, -1, -1, -1,         // Current iteration pulse widths
                     -1, -1, -1, -1, -1, -1, 
                     -1, -1, -1, -1};
static volatile int tp[14] = {-1, -1, -1, -1,        // Previous iteration pulse widths
                      -1, -1, -1, -1, -1, -1, 
                      -1, -1, -1, -1};
static volatile int r[14] = {2000, 2000, 2000, 2000, // Step sizes initialized to 2000
                     2000, 2000, 2000, 2000, 2000, 
                     2000, 2000, 2000, 2000, 2000};


int servoAux_angle(int pin, int degreeTenths)        // Set continuous rotation speed
{
  return servoAux_set(pin, degreeTenths + 500);      // Add center pulse width to speed
}

int servoAux_speed(int pin, int speed)               // Set continuous rotation speed
{
  return servoAux_set(pin, speed + 1500);            // Add center pulse width to speed
}

int servoAux_set(int pin, int time)           // Set pulse width to servo on pin 
{
  if(servoAuxCog == 0)                               // If cog not started
  {
    int result = servoAux_start();                   // Start the cog
    if(result == 0) return -1;                       // No cogs open
    if(result == -1) return -2;                      // No locks open
  }
  int s = sizeof(p)/sizeof(int);                     // Array size to s
  int i;                                             // Index variable
  while(lockset(lockID));                            // Set the lock
  for(i = 0; i < s; i++)                             // Check if existing servo
  {
    if(p[i] == pin)                                  // Yes?
    {
      t[i] = time;                                   // Set pulse duration
      lockclr(lockID);                               // Clear lock
      return 1;                                      // Return success 
    }
  }
  for(i= 0; i < s; i++)                              // Look for empty slot
  {
    if(p[i]==-1)                                     // Found one?
    {
      break;                                         // Exit for loop, keep index
    }
  }
  if(i < s)                                          // Found empty slot?
  {
    p[i] = pin;                                      // Set up pin and pulse durations
    t[i] = time;
    tp[i] = time;
    lockclr(lockID);                                 // Clear the lock 
    return pin;                                      // Return success 
  }
  else                                               // servo not found, no empty slots?
  {
    lockclr(lockID);                                 // Clear lock
    return -3;                                       // Return, no pins
  }
}


int servoAux_setRamp(int pin, int stepSize)          // Set ramp step for a servo
{
  int s = sizeof(p)/sizeof(int);                     // Get array size
  int i;                                             // Local index variable
  while(lockset(lockID));                            // Set lock
  for(i = 0; i < s; i++)                             // Find index for servo pin
  {
    if(p[i] == pin)                                  // Found pin in array?
    {
      r[i] = stepSize;                               // Set ramp step
      lockclr(lockID);                               // Clear lock
      return pin;                                    // Return success
    }
  }
  lockclr(lockID);                                   // Clear lock
  return -4;                                         // Return -1, pin not found
}


int servoAux_get(int pin)                            // Get servo position
{
  int s = sizeof(p)/sizeof(int);                     // Get size of servo arrays
  int i;                                             // Declare local index
  for(i = 0; i < s; i++)                             // Look for matching pin in array
  {
    if(p[i] == pin)                                  // Found matching pin?
    {
      return tp[i];                                  // Return associated pulse time
    }
  }
  return -4;                                         // No pin match?  Return -4
}


static void servoAux(void *par)                             // servo process in other cog
{
  int dtpw = (CLKFREQ/1000000)*2500;
  int pw = CNT;

  int dtTw = (CLKFREQ/1000000)*20000;
  int Tw = pw;
  Tw += dtTw;

  int s = sizeof(p)/sizeof(int);                     // Get size of servo array
  int i;                                             // Local index variable
  //mark();                                            // Mark the current time
  while(1)                                           // servo control loop
  {
    while(lockset(lockID));                          // Set the lock 
    for(i = 0; i < s; i++)                           // Go through all possible servos
    {
      if(t[i] == 0)                                  // Detach servo? 
      {
        input(p[i]);                                 // Set I/O pin to input
        p[i] = -1;                                   // Remove from list
        t[i] = -1;
        tp[i] = -1;
        r[i] = 2000;
      }
      if(p[i] != -1)                                 // If servo entry in pin array
      {
        int tPulse =  t[i];                          // Copy requested position to var
        int diff = tPulse - tp[i];                   // Check size of change
        int d = abs(diff);                           // Take absolute value
        if(r[i] < d)                                 // If change larger than ramp step
        {
          int step = r[i];                           // Copy step entry to variable
          if(diff < 0)                               // If negative
          {
            step = -step;                            // Make step negative
          }
          tPulse = tp[i] + step;                     // Increment pulse by step 
        }
        pulse_outCtrAux(p[i], tPulse);               // Send pulse to servo
        tp[i] = tPulse;                              // Remember pulse for next time
      }
      if(i%2)
      {
         while((CNT - pw) <= dtpw);                  // Wait for servo pulse window to close
         pw += dtpw;
      }
    }
    lockclr(lockID);                                 // Clear the lock
    while((CNT - pw) <= dtpw);                       // Wait for 20 ms since first pulse
    pw += dtpw;
  }
}


void servoAux_stop(void)                             // Stop servo process, free a cog
{
  if(servoAuxCog)                                    // If the cog is running
  {
    cogstop(servoAuxCog-1);                          // Stop it
    servoAuxCog = 0;                                 // Remember that it's stopped
    lockclr(lockID);
    lockret(lockID);                                 // Return the lock
  }
}

/*
 * @brief Starts the servo process and takes over a cog.
 *
 * @details You do not need to call this function from your code because
 * the servoAux_set function calls it if it detects that the servo cog has not
 * been started.
 *
 * @returns 1..8 if successful.  0 if no available cogs, -1 if no available
 * locks.
 */
static int servoAux_start(void)                      // Take cog & start servo process
{
  lockID = locknew();                                // Check out a lock
  if(lockID == -1) return -1;                        // Return -1 if no locks
  else lockclr(lockID);
  servoAux_stop();                                   // Stop in case cog is running
  servoAuxCog = cogstart(servoAux, NULL, stack,      // Launch servo into new cog
             sizeof(stack)) + 1;
  return servoAuxCog;
}


static int ta = 0, tb = 0, dta = 0, dtb = 0;

static void pulse_outCtrAux(int pin, int time)              
{
  /*
  if(st_iodt == 0)
  {
    set_io_dt(CLKFREQ/1000000);
    set_io_timeout(CLKFREQ/4);
  }
  */
  signed long phsVal = -time * st_iodt;
  int ctr = 0;
  int frq = 1;
  int phs = 0;
  int state = get_output(pin);
  if(state == 1)
  {
    phsVal = -phsVal;
    phs = -1;
    frq = -1;
  }
  if(ta == 0 || (dta && (CNT - ta > dta)))
  {
    PHSA = phs;
    FRQA = frq;
    CTRA = pin;
    CTRA += (4 << 26);
    low(pin);
    PHSA = phsVal;
    dta = abs(phsVal);
    ta = CNT;
  }
  else if(tb == 0 || (dtb && (CNT - tb > dtb)))
  {
    PHSB = phs;
    FRQB = frq;
    CTRB = pin;
    CTRB += (4 << 26);
    low(pin);
    PHSB = phsVal;
    dtb = abs(phsVal);
    tb = CNT;
  }
}


/**
 * TERMS OF USE: MIT License
 *
 * Permission is hereby granted, free of charge, to any person obtaining a
 * copy of this software and associated documentation files (the "Software"),
 * to deal in the Software without restriction, including without limitation
 * the rights to use, copy, modify, merge, publish, distribute, sublicense,
 * and/or sell copies of the Software, and to permit persons to whom the
 * Software is furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL
 * THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
 * FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER
 * DEALINGS IN THE SOFTWARE.
 */
