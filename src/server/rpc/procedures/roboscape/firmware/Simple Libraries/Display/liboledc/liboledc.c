/*
 * @file oledc_.c
 *
 * @author Matthew Matz
 *
 * @version 0.9
 *
 * @copyright Copyright (C) Parallax, Inc. 2016.  See end of file for
 * terms of use (MIT License).
 *
 * @brief 0.96-inch RGB OLED driver source, see oledc_.h for documentation.
 *
 * @detail Please submit bug reports, suggestions, and improvements to
 * this code to editor@parallax.com.
 */



#include "oledc.h"
#include "simpletools.h"

//#define TEST_IT_ALL

i2c *eeBus;                                // I2C bus ID


int main()
{

#ifdef TEST_IT_ALL
 
  //set up the Color OLED screen
  oledc_init(7, 8, 9, 10, 11, 2); // pins: CS, D/C, DIN, CLK, RES   rotation: 0 (pins upward)
  
            
  for(int r = 0; r < 4; r++)
  {
    for(int o=0; o<oledc_getWidth(); o+=10) oledc_drawFastVLine(o, 0, oledc_getHeight(), DARKGRAY);
    for(int o=0; o<oledc_getHeight(); o+=20) oledc_drawFastHLine(0, o, oledc_getWidth(), DARKGRAY);
  
    oledc_setTextSize(2);
    oledc_setTextFont(r);
    oledc_setCursor(0,0,0);
    
    oledc_drawNumber(28, DEC);
    oledc_drawText(" | ");
    oledc_drawNumber(-28, DEC);
    oledc_drawText("\n");
    oledc_drawNumber(-28, HEX);
    oledc_drawText(" | ");
    oledc_drawNumber(28, BIN);
    pause(2000);
    oledc_clear(0,0,oledc_getWidth(),oledc_getHeight());      
    oledc_drawNumber(28, OCT);
    oledc_drawText(" | ");
    oledc_drawNumber(-36.93715, 2);
    pause(2000);
    oledc_clear(0,0,oledc_getWidth(),oledc_getHeight());      
    for(int xy = 'A'; xy < 'D'; xy++) 
    {
      oledc_write(xy);
      if(xy%20 == 12)
      {
        pause(1000);              
        oledc_clear(0,0,oledc_getWidth(),oledc_getHeight());      
      }      
    }    
    pause(2000);
    oledc_clear(0,0,oledc_getWidth(),oledc_getHeight());      
  }  
  
  
  
  for(int r = 0; r < 4; r++)
  {
    oledc_setRotation(r); 
    
    for(int o=0; o<oledc_getWidth(); o+=10) oledc_drawFastVLine(o, 0, oledc_getHeight(), DARKGRAY);
    for(int o=0; o<oledc_getHeight(); o+=20) oledc_drawFastHLine(0, o, oledc_getWidth(), DARKGRAY);
    pause(100);
    
    for(int df = -20; df < 120; df += 10) oledc_drawLine(df, 40, 40, 120 - df, oledc_color565(rand() & 255, rand() & 255, rand() & 255));
    pause(1000);
            
    oledc_clear(0,0,oledc_getWidth(),oledc_getHeight());
  }    

  sd_mount(22, 23, 24, 25);
  char ab[] = {"ab.bmp"};
  
  for(int r = 0; r < 4; r++)
  {
    oledc_setRotation(r); 
    
    for(int o=0; o<oledc_getWidth(); o+=10) oledc_drawFastVLine(o, 0, oledc_getHeight(), DARKGRAY);
    for(int o=0; o<oledc_getHeight(); o+=20) oledc_drawFastHLine(0, o, oledc_getWidth(), DARKGRAY);
    pause(100);
    
    oledc_bitmap(ab, -10, -10);
    //while(1);
    
    pause(1000);
            
    oledc_clear(0,0,oledc_getWidth(),oledc_getHeight());
  }    


  ///////////////////////////// oledc_drawPixel and set_Rotation Test ////////////////////////////////////////////////////

  for(int r = 0; r < 4; r++)
  {
    oledc_setRotation(r); 
    
    for(int o=0; o<oledc_getWidth(); o+=10) oledc_drawFastVLine(o, 0, oledc_getHeight(), DARKGRAY);
    for(int o=0; o<oledc_getHeight(); o+=20) oledc_drawFastHLine(0, o, oledc_getWidth(), DARKGRAY);
    //pause(100);
    
    
    
    oledc_drawPixel(1, 1, WHITE);
    pause(50);
    oledc_drawPixel(20,20, WHITE);
    pause(50);
    oledc_drawPixel(30, 10, WHITE);
    pause(50);
    oledc_drawPixel(45, 50, RED);
    oledc_drawPixel(10, 45, RED);
    oledc_drawPixel(45, 45, BLUE);
    oledc_drawPixel(35, 45, BLUE);
    
    pause(500);
    
    oledc_clear(0,0,oledc_getWidth(),oledc_getHeight());
  }    

  ///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////


  ///////////////////////////// oledc_drawLine and set_Rotation Test ////////////////////////////////////////////////////

  for(int r = 0; r < 4; r++)
  {
    oledc_setRotation(r); 
    
    for(int o=0; o<oledc_getWidth(); o+=10) oledc_drawFastVLine(o, 0, oledc_getHeight(), DARKGRAY);
    for(int o=0; o<oledc_getHeight(); o+=20) oledc_drawFastHLine(0, o, oledc_getWidth(), DARKGRAY);
    pause(100);
    
    oledc_drawLine(1, 1, 20,20, WHITE);
    pause(50);
    oledc_drawLine(20, 20, 30, 10, WHITE);
    pause(50);
    oledc_drawLine(30, 10, 45, 80, RED);
    oledc_drawLine(45, 80, 125, 30, RED);
    oledc_drawLine(125, 30, 45, -5, BLUE);
    oledc_drawLine(45, -5, -10, 20, BLUE);
    pause(500);
    
    oledc_clear(0,0,oledc_getWidth(),oledc_getHeight());
  }    

  ///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

  ///////////////////////////// oledc_drawCircle Test ///////////////////////////////////////////////////////////////////////////

  for(int r = 0; r < 4; r++)
  {
    oledc_setRotation(r); 
    
    for(int o=0; o<oledc_getWidth(); o+=10) oledc_drawFastVLine(o, 0, oledc_getHeight(), DARKGRAY);
    for(int o=0; o<oledc_getHeight(); o+=20) oledc_drawFastHLine(0, o, oledc_getWidth(), DARKGRAY);
    pause(100);
    
    oledc_drawCircle(10, 10, 5, WHITE);pause(5);
    oledc_drawCircle(15, 20, 10, RED);pause(5);
    oledc_drawCircle(20, 30, 15, YELLOW);pause(5);
    oledc_drawCircle(25, 40, 20, GREEN);pause(5);
    oledc_drawCircle(30, 50, 25, BLUE);pause(5);
    pause(200);
    
    oledc_clear(0,0,oledc_getWidth(),oledc_getHeight());
  }    

  ///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

  ///////////////////////////// oledc_fillCircle Test ///////////////////////////////////////////////////////////////////////////

  for(int r = 0; r < 4; r++)
  {
    oledc_setRotation(r); 
    
    for(int o=0; o<oledc_getWidth(); o+=10) oledc_drawFastVLine(o, 0, oledc_getHeight(), DARKGRAY);
    for(int o=0; o<oledc_getHeight(); o+=20) oledc_drawFastHLine(0, o, oledc_getWidth(), DARKGRAY);
    pause(100);
    
    oledc_fillCircle(10, 10, 5, WHITE); pause(5);
    oledc_fillCircle(15, 20, 10, RED);pause(5);
    oledc_fillCircle(20, 30, 15, YELLOW);pause(5);
    oledc_fillCircle(25, 40, 20, GREEN);pause(5);
    oledc_fillCircle(30, 50, 25, BLUE);pause(5);
    pause(200);
    
    oledc_clear(0,0,oledc_getWidth(),oledc_getHeight());
  }    

  ///////////////////////////// oledc_fillRect Test ///////////////////////////////////////////////////////////////////////////

  for(int r = 0; r < 4; r++)
  {
    oledc_setRotation(r); 
    
    for(int o=0; o<oledc_getWidth(); o+=10) oledc_drawFastVLine(o, 0, oledc_getHeight(), DARKGRAY);
    for(int o=0; o<oledc_getHeight(); o+=20) oledc_drawFastHLine(0, o, oledc_getWidth(), DARKGRAY);
    pause(100);
    
    oledc_fillRect(10, 10, 5, 5, WHITE);
    oledc_fillRect(15, 20, 10, 10, RED);
    oledc_fillRect(20, 30, 15, 20, YELLOW);
    oledc_fillRect(25, 40, 20, 30, GREEN);
    oledc_fillRect(30, 50, 25, 40, BLUE);
    pause(200);
    
    oledc_clear(0,0,oledc_getWidth(),oledc_getHeight());
  }


  for(int r = 0; r < 4; r++)
  {
    oledc_setRotation(r); 
    
    for(int o=0; o<oledc_getWidth(); o+=10) oledc_drawFastVLine(o, 0, oledc_getHeight(), DARKGRAY);
    for(int o=0; o<oledc_getHeight(); o+=20) oledc_drawFastHLine(0, o, oledc_getWidth(), DARKGRAY);
    pause(100);
    
    oledc_fillRoundRect(10, 10, 5, 5, 5, WHITE);
    pause(5);
    oledc_fillRoundRect(15, 20, 10, 10, 5, RED);
    pause(5);
    oledc_fillRoundRect(20, 30, 15, 20, 5, YELLOW);
    pause(5);
    oledc_fillRoundRect(25, 40, 20, 30, 5, GREEN);
    pause(5);
    oledc_fillRoundRect(30, 50, 25, 40, 5, BLUE);
    pause(2000);
    
    if(r != 3) oledc_clear(0,0,oledc_getWidth(),oledc_getHeight());
  }
  
  oledc_sleep();
  pause(1000);
  oledc_wake();
  pause(1000);
  oledc_sleep();
  pause(1000);
  oledc_wake();
  pause(1000);
  oledc_sleep();
  
  //////////////////////////////// font test //////////////////////////////////////////////////////////////////////////

   
  
  ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

#endif // TEST_IT_ALL

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
