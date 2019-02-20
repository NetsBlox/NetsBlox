/*
 * libstacktest.c
 * 
 * Test harness code for stacktest library.
 * 
 */

#include "simpletools.h"  
#include "stacktest.h"                  

void myCog();
int *cog;
int cogVal;

#define ELEMENTS 20

volatile int elements = ELEMENTS;
volatile int offset = 0;
volatile int result = 100;
volatile int globalArray[ELEMENTS];

int testStack[46 + 32];

int main()
{
  // cog = cog_runStackTest(myCog, 32);
  cogVal = cogstart_stackTest(myCog, NULL, testStack, sizeof(testStack)); 
  //simpleterm_close();
  pause(2000);
  //simpleterm_open();
  //int stacksize = cog_endStackTest(cog);
  int stacksize = cogstop_stackTest(cogVal, testStack);
  print("stacksize = %d\n", stacksize);
}

void myCog()
{
  //pause(100);
  //simpleterm_open();
  int array[elements];
  int n = 0;
  //print("Hello");
  //simpleterm_close();
  while(1)
  {
    n++;
    array[n%20] = n + offset;
    pause(10);
  }
}

/*

Test data:

cogRunTestOverhead = 8 bytes, 2 ints
stackOverhead = 176 bytes, 44 ints
stackOther = 32 ints



---[ cogstart_stackTest ]--- 

Cog Address = 9592, Cog Value = 1
Stack Count Address = 9596, Stack Count = 78



---[ cogstop_stackTest ]--- 

Cog Address = 9592, Cog Value = 1
Stack Count Address = 9596, Stack Count = 78

stackOverhead = 176 bytes, 44 ints
cogRunTestOverhead = 8 bytes, 2 ints
stackOther = 32 ints

idx = -2, addr = 9592, val = 1
idx = -1, addr = 9596, val = 78
idx = 0, addr = 9600, val = 14537
idx = 1, addr = 9604, val = 10287
idx = 2, addr = 9608, val = 14011
idx = 3, addr = 9612, val = 5940
idx = 4, addr = 9616, val = 467
idx = 5, addr = 9620, val = 15786
idx = 6, addr = 9624, val = 9559
idx = 7, addr = 9628, val = 18649
idx = 8, addr = 9632, val = 11932
idx = 9, addr = 9636, val = 200
idx = 10, addr = 9640, val = 201
idx = 11, addr = 9644, val = 202
idx = 12, addr = 9648, val = 203
idx = 13, addr = 9652, val = 204
idx = 14, addr = 9656, val = 205
idx = 15, addr = 9660, val = 206
idx = 16, addr = 9664, val = 207
idx = 17, addr = 9668, val = 208
idx = 18, addr = 9672, val = 209
idx = 19, addr = 9676, val = 210
idx = 20, addr = 9680, val = 211
idx = 21, addr = 9684, val = 212
idx = 22, addr = 9688, val = 213
idx = 23, addr = 9692, val = 214
idx = 24, addr = 9696, val = 215
idx = 25, addr = 9700, val = 216
idx = 26, addr = 9704, val = 217
idx = 27, addr = 9708, val = 218
idx = 28, addr = 9712, val = 219
idx = 29, addr = 9716, val = 25452
idx = 30, addr = 9720, val = 8558
idx = 31, addr = 9724, val = 0
idx = 32, addr = 9728, val = 1551630361
idx = 33, addr = 9732, val = -2130960380
idx = 34, addr = 9736, val = 146780176
idx = 35, addr = 9740, val = 12133
idx = 36, addr = 9744, val = 15864
idx = 37, addr = 9748, val = 1944
idx = 38, addr = 9752, val = 24455
idx = 39, addr = 9756, val = 14319
idx = 40, addr = 9760, val = 3146
idx = 41, addr = 9764, val = 12435
idx = 42, addr = 9768, val = 7123
idx = 43, addr = 9772, val = 5749
idx = 44, addr = 9776, val = 23315
idx = 45, addr = 9780, val = 26849
idx = 46, addr = 9784, val = 23193
idx = 47, addr = 9788, val = 8162
idx = 48, addr = 9792, val = 30875
idx = 49, addr = 9796, val = 18231
idx = 50, addr = 9800, val = 19508
idx = 51, addr = 9804, val = 19528
idx = 52, addr = 9808, val = 13027
idx = 53, addr = 9812, val = 1620
idx = 54, addr = 9816, val = 9013
idx = 55, addr = 9820, val = 7893
idx = 56, addr = 9824, val = 32537
idx = 57, addr = 9828, val = 7371
idx = 58, addr = 9832, val = 24135
idx = 59, addr = 9836, val = 8308
idx = 60, addr = 9840, val = 7382
idx = 61, addr = 9844, val = 1423
idx = 62, addr = 9848, val = 21444
idx = 63, addr = 9852, val = 22850
idx = 64, addr = 9856, val = 12573
idx = 65, addr = 9860, val = 1344
idx = 66, addr = 9864, val = 23315
idx = 67, addr = 9868, val = 29879
idx = 68, addr = 9872, val = 5396
idx = 69, addr = 9876, val = 30776
idx = 70, addr = 9880, val = 12232
idx = 71, addr = 9884, val = 31889
idx = 72, addr = 9888, val = 21632
idx = 73, addr = 9892, val = 30036
idx = 74, addr = 9896, val = 27257
idx = 75, addr = 9900, val = 22143
stacksize = 23


*/