/*
  libbadgewxtools.c
  Test harness for the badgealpha library
*/

#include "simpletools.h"
#include "badgewxtools.h"
#include "ws2812.h"

#define LED_COUNT 4

ws2812 *ws2812b;
unsigned int RGBleds[LED_COUNT];  
int x, y, z;

int main(void)
{
  badge_setup();
  ws2812b = ws2812b_open();
  ws2812_set(ws2812b, RGB_PIN, RGBleds, LED_COUNT);
  pause(1000);
  
  print("LED light control\n\n");
  oledprint("  LEDs  ");
  pause(500);

  for (int zz = 0; zz < 3; zz++) {
    for (int z = 0; z < 15; z++) {
      led_pwm_set(0, z);
      led_pwm_set(1, 15-z);
      pause(50);
    }
    for (int z = 0; z < 15; z++) {
      led_pwm_set(1, z);
      led_pwm_set(0, 15-z);
      pause(50);
    }
  }  
  
  led_pwm_set(0, 0);
  led_pwm_set(1, 0);


  print("RGB light control\n\n");
  cursor(2, 1);
  oledprint("RGBs");                        //// change to screen
  
  for (int i = 0; i < 4; i++) {
    RGBleds[i] = 0x330000;
  }
  ws2812_set(ws2812b, RGB_PIN, RGBleds, LED_COUNT);

  pause(500);
  for (int i = 0; i < 4; i++) {
    RGBleds[i] = 0x003300;
  }
  ws2812_set(ws2812b, RGB_PIN, RGBleds, LED_COUNT);
  

  pause(500);
  for (int i = 0; i < 4; i++) {
    RGBleds[i] = 0x000033;
  }
  ws2812_set(ws2812b, RGB_PIN, RGBleds, LED_COUNT);

  pause(500);
  for (int i = 0; i < 4; i++) {
    RGBleds[i] = 0x000000;
  }
  ws2812_set(ws2812b, RGB_PIN, RGBleds, LED_COUNT);


  // Touch pad monitoring
  print("Press B to exit.\n\n");
  clear();
  oledprint("INPUTS");
  pause(500);
  text_size(SMALL);                     //// try size
  cursor(0, 4);
  oledprint("INPUT: B<v><v>A");
  cursor(0, 5);
  oledprint("STATE:");
  cursor(0, 7);
  oledprint("EXIT: Press B");
  int states;
  while(1)
  {
    states = buttons();                //// ? implicitly input ?
    cursor(7, 5);
    oledprint("%08b", states);
    if(states == 0b10000000) break;
  } 
  text_size(LARGE);
  cursor(0, 0);    
  oledprint("INPUTS Done!   ");     
  pause(800);


  // Accelerometer
  print("Tilt with accelerometer\n\n");
  
  clear();
  oledprint("TiltTest");
  text_size(SMALL);
  cursor(0, 7);
  oledprint("Exit: Press B");

  while(button(7) == 0)
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
