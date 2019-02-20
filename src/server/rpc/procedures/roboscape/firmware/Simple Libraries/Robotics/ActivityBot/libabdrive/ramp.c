#include "abdrive.h"

volatile int abd_speed[2];   

void drive_speed(int left, int right);

void drive_ramp(int left, int right)
{
  drive_speed(left, right);
  
  while(1)
  {
    int done = ( (abd_speed[0] > (left - 4)) && (abd_speed[0] < (left + 4)) ); 
       done += ( (abd_speed[1] > (right - 4)) && (abd_speed[1] < (right + 4)) );
    
    if(done) return; 
    pause(20); 
  }     
}


