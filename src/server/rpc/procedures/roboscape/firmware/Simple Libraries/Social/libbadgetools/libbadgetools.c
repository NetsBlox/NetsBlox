/*
  libbadgealpha.c
  Test harness for the badgealpha library
*/

#include "simpletools.h"
#include "badgetools.h"

int x, y, z;

int main(void)
{
  print("LED light control\n\n");
  oledprint("  LEDs  ");
  pause(500);
  
  led(0, ON);
  pause(200);
  led(0, OFF);
  pause(200);
  led(5, ON);
  pause(200);
  led(5, OFF);
  
  pause(500);
  
  for(int n = 0; n < 6; n++)
  {
    led(n, ON);
    pause(200);
  }
  
  for(int n = 5; n >= 0; n--)
  {
    led(n, OFF);
    pause(200);
  }
  
  for(int n = 0; n < 6; n++)
  {
    leds(0b101010);                //// Should just be LEDs
    pause(200);
    leds(0b010101);
    pause(200);
  }
  
  leds(0b111111);
  pause(500);

  // rgb light control
  // OFF (0), BLUE (1), GREEN (2), CYAN (3),
  // RED (4), MAGENTA (5), YELLOW (6), WHITE (7)

  print("RGB light control\n\n");
  cursor(2, 1);
  oledprint("RGBs");                        //// change to screen

  rgb(L, YELLOW);
  rgb(R, BLUE);
  pause(400);
  rgb(L, RED);
  rgb(R, WHITE);
  pause(400);
  rgb(L, WHITE);
  rgb(R, GREEN);
  pause(400);
  
  for(int n = OFF; n < WHITE*2; n++)
  {
    rgbs(n, 8-n);               // change to rgbs (if led_set -> leds)
    pause(150);
  }      
  
  rgbs(OFF, OFF);
  leds(0b000000);

  pause(500);


  // Touch pad monitoring
  print("Blue lights indicate touch pads.\n");
  print("Press OSH to exit.\n\n");
  clear();
  oledprint("TOUCHPAD");
  pause(500);
  text_size(SMALL);                     //// try size
  cursor(0, 4);
  oledprint("PAD:   6543210");
  cursor(0, 5);
  oledprint("STATE:");
  cursor(0, 7);
  oledprint("EXIT: Press OSH");
  int states;
  while(1)
  {
    states = buttons();                //// ? implicitly input ?
    leds(states);
    cursor(7, 5);
    oledprint("%07b", states);
    if(states == 0b1000000) break;
  } 
  text_size(LARGE);
  cursor(0, 0);    
  oledprint("PADS    Done!   ");     
  pause(800);
  leds(0b000000);


  // Accelerometer
  print("Tilt with accelerometer\n\n");
  
  clear();
  oledprint("TiltTest");
  text_size(SMALL);
  cursor(0, 7);
  oledprint("Exit: Press OSH");

  while(button(6) == 0)
  {
    print("%c", HOME);
    accels(&x, &y, &z);    
    cursor(5, 4);
    oledprint("x = %3d " , x);
    cursor(5, 5);
    oledprint("y = %3d ", y);
    cursor(5, 6);
    oledprint("z = %3d ", z);
    pause(100);
  }
  
  int x = accel(AX);                     ////
  int y, z;                              ////
  accels(&x, &y, &z);                    ////
  

  // Display
  print("Display\n\n");
  clear();
  cursor(0,0);
  text_size(LARGE);
  oledprint("DISPLAY");
  text_size(SMALL);
  pause(1500);
  clear();
  
  for(int i = 0; i < 8; i++)
  {
    cursor(i, i);
    oledprint("0123456789ABCDEF");
    pause(1000);
  }    
    
  clear();
  for(x = 0; x < 128; x++)
  {
    y = 64 - (x * x / 32);
    point( x, y, 1);
    point(128-x, y, 1);
    pause(20);
  }
  
  text_size(LARGE);
  cursor(2, 1);
  oledprint("Bye!");
}


/*
  TERMS OF USE: MIT License
 
  Permission is hereby granted, free of charge, to any person obtaining a
  copy of this software and associated documentation files (the "Software"),
   to deal in the Software without restriction, including without limitation
  the rights to use, copy, modify, merge, publish, distribute, sublicense,
  and/or sell copies of the Software, and to permit persons to whom the
  Software is furnished to do so, subject to the following conditions:
 
  The above copyright notice and this permission notice shall be included in
  all copies or substantial portions of the Software.
 
  THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
  IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
  FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL
  THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
  LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
  FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER
  DEALINGS IN THE SOFTWARE.
*/

