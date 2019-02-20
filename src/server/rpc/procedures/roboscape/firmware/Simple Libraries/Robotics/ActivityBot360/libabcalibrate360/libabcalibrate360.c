//#include "simpletools.h"
#include "abcalibrate360.h"   
//#include "abdrive360.h" 

int main()
{
  high(26);
  high(27);
  cal_activityBot();
  low(26);
  low(27);

  //ee_putStr("ActivityBot", 12, _AB360_EE_Start_);
  //ee_putStr("AB360 -11  ", 12, _AB360_EE_Start_);
  
  //cal_displayResults();

  //cal_displayData();

  //cal_servoPins(12, 13);
  //cal_encoderPins(14, 15);
  //cal_clear();
  
  //drive_goto(128, 128);
  
}


/*
  5x new batteries = 7.8 V
  ------------------------------
  Feedback pin settings not found.  Defaults of 
  P14 (left) and P15 (right) will be used. 
  Left Servo, Counterclockwise
  
  m = 176
  b = 106
  
  Left Servo, Clockwise
  m = 169
  b = 233
  
  Right Servo, Counterclockwise
  m = 167
  b = 240
  
  Right Servo, Clockwise
  m = 176
  b = 100


  5 x dead AA =   5.25 V
  ===================================
  Left Servo, Counterclockwise
  m = 345
  b = 200
  
  Left Servo, Clockwise
  m = 335
  b = 326
  
  Right Servo, Counterclockwise
  m = 342
  b = 340
  
  Right Servo, Clockwise
  m = 367
  b = 193
  

  5 x new AA = 5 V Jumper
  ===================================
  Left Servo, Counterclockwise
  m = 259
  b = 180
  
  Left Servo, Clockwise
  m = 241
  b = 300
  
  Right Servo, Counterclockwise
  m = 238
  b = 313
  
  Right Servo, Clockwise
  m = 255
  b = 160
*/  



/*
  5x new batteries = 7.65 V
  ------------------------------
  Left Servo, Counterclockwise
  m = 168
  b = 246
  
  Left Servo, Clockwise
  m = 183
  b = 93
  
  Right Servo, Counterclockwise
  m = 175
  b = 226
  
  Right Servo, Clockwise
  m = 183
  b = 113  


  5 x new AA = 5 V Jumper
  ===================================
  Left Servo, Counterclockwise
  m = 242
  b = 306
  
  Left Servo, Clockwise
  m = 258
  b = 180
  
  Right Servo, Counterclockwise
  m = 257
  b = 246
  
  Right Servo, Clockwise
  m = 265
  b = 180

*/  


// IR + Ping Bot

/*
  5x new batteries = 7.65 V
  ------------------------------
  Left Servo, Counterclockwise
  m = 155
  b = 186
  
  Left Servo, Clockwise
  m = 174
  b = 20
  
  Right Servo, Counterclockwise
  m = 166
  b = 173
  
  Right Servo, Clockwise
  m = 161
  b = 246



  5 x new AA = 5 V Jumper
  ===================================
  Left Servo, Counterclockwise
  m = 267
  b = 53
  
  Left Servo, Clockwise
  m = 243
  b = 260
  
  Right Servo, Counterclockwise
  m = 275
  b = 86
  
  Right Servo, Clockwise
  m = 241
  b = 313
*/  




// Ping bot

/*
  5x new batteries = 7.65 V
  ------------------------------
  Left Servo, Counterclockwise
  m = 173
  b = 260
  
  Left Servo, Clockwise
  m = 193
  b = 106
  
  Right Servo, Counterclockwise
  m = 178
  b = 260
  
  Right Servo, Clockwise
  m = 191
  b = 113



  5 x new AA = 5 V Jumper
  ===================================
  Left Servo, Counterclockwise
  m = 242
  b = 260
  
  Left Servo, Clockwise
  m = 258
  b = 146
  
  Right Servo, Counterclockwise
  m = 240
  b = 313
  
  Right Servo, Clockwise
  m = 262
  b = 173
*/  




// Tilt bot

/*
  5x new batteries = 7.2 V
  ------------------------------
  Left Servo, Counterclockwise
  m = 191
  b = 220
  
  Left Servo, Clockwise
  m = 185
  b = 260
  
  Right Servo, Counterclockwise
  m = 179
  b = 193
  
  Right Servo, Clockwise
  m = 168
  b = 266



  5 x new AA = 5 V Jumper
  ===================================
  Left Servo, Counterclockwise
  m = 255
  b = 246
  
  Left Servo, Clockwise
  m = 245
  b = 313
  
  Right Servo, Counterclockwise
  m = 240
  b = 233
  
  Right Servo, Clockwise
  m = 228
  b = 333
*/  




// Juke bot

/*
  5x new batteries = 7.6 V
  ------------------------------
  Left Servo, Counterclockwise
  m = 174
  b = 233
  
  Left Servo, Clockwise
  m = 171
  b = 220
  
  Right Servo, Counterclockwise
  m = 176
  b = 220
  
  Right Servo, Clockwise
  m = 173
  b = 240



  5x Tired Alkaline = 6.9 V
  ------------------------------
  Left Servo, Counterclockwise
  m = 189
  b = 246
  
  Left Servo, Clockwise
  m = 186
  b = 266
  
  Right Servo, Counterclockwise
  m = 194
  b = 266
  
  Right Servo, Clockwise
  m = 196
  b = 246



  5 x new AA = 5 V Jumper
  ===================================
  Left Servo, Counterclockwise
  m = 241
  b = 293
  
  Left Servo, Clockwise
  m = 246
  b = 266
  
  Right Servo, Counterclockwise
  m = 256
  b = 273
  
  Right Servo, Clockwise
  m = 251
  b = 300


*/  




