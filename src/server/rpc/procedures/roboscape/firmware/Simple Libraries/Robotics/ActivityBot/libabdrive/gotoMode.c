#include "abdrive.h"

volatile int abd_blockGoto;

void drive_gotoMode(int mode)
{
  abd_blockGoto = mode;
}  
