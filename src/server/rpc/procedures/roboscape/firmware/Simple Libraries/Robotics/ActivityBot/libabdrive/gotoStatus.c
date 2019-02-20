#include "abdrive.h"

volatile int abd_gotoFlag[2];

int drive_gotoStatus(int side)
{
  if(side == SIDE_LEFT)
  {
    return abd_gotoFlag[ABD_L];
  }
  else if(side == SIDE_RIGHT)
  {
    return abd_gotoFlag[ABD_R];
  }
  else
  {
    return abd_gotoFlag[ABD_L] + abd_gotoFlag[ABD_R];
  }    
}  

