

#include "lsm9ds1.h"

int __pinM;
float __mRes;

void imu_setMagInterrupt(char axis, float threshold, char lowHigh)
{
  
  lowHigh &= 0x01;
  
  unsigned char tempCfgValue = 0x00;
  tempCfgValue |= (lowHigh << 2);
  tempCfgValue |= 0x03;

  unsigned char tempSrcValue = 0x00;

  int magThs = 0;
  unsigned char magThsL = 0, magThsH = 0;
  magThs = (int) (__mRes * threshold);
  
  if(magThs < 0)     magThs = -1 * magThs;
  if(magThs > 32767) magThs = 32767;
  
  magThsL = magThs & 0xFF;
  magThsH = (magThs >> 8) & 0x7F;
  
  imu_SPIwriteByte(__pinM, INT_THS_L_M, magThsL);
  imu_SPIwriteByte(__pinM, INT_THS_H_M, magThsH);

  switch (axis)
  {
    case X_AXIS:
      tempCfgValue |= (1 << 7);
      break;
    case Y_AXIS:
      tempCfgValue |= (1 << 6);
      break;
    case Z_AXIS:
      tempCfgValue |= (1 << 5);
      break;
    default:
      tempCfgValue |= (0b11100000);
      break;
  }
 
  imu_SPIwriteByte(__pinM, INT_CFG_M, tempCfgValue);  
}  

