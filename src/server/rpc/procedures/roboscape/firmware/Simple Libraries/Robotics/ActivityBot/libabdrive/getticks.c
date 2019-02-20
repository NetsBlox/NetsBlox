#include "abdrive.h"


volatile int abd_ticks[2]; 
// distance calculated
volatile int abd_dc[2];                                      
                               

void drive_getTicks(int *left, int *right)
{
  *left = abd_ticks[ABD_L];
  *right = abd_ticks[ABD_R];
}

void drive_getTicksCalc(int *left, int *right)
{
  *left = abd_dc[ABD_L];
  *right = abd_dc[ABD_R];
}
