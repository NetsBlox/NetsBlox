
#include "lsm9ds1.h"

int __pinAG;
float __aRes;

void imu_setAccelInterrupt(char axis, float threshold, char duration, char overUnder, char andOr)
{
  
  overUnder &= 0x01;
  andOr &= 0x01;
  
  unsigned char tempRegValue = 0;
  
  imu_SPIreadBytes(__pinAG, CTRL_REG4, &tempRegValue, 1);     // Make sure interrupt is NOT latched
  tempRegValue &= 0xFD;
  imu_SPIwriteByte(__pinAG, CTRL_REG4, tempRegValue);


  imu_SPIreadBytes(__pinAG, INT_GEN_CFG_XL, &tempRegValue, 1);
  
  if(andOr) tempRegValue |= 0x80;
  else      tempRegValue &= 0x7F;
  
  if(threshold < 0) threshold = -1 * threshold;

  unsigned char accelThs = 0;
  unsigned int tempThs = 0;

  tempThs = ((int) (__aRes * threshold)) >> 7;
  accelThs = tempThs & 0xFF;

  switch (axis)
  {
    case X_AXIS:
      tempRegValue |= (1 << (0 + overUnder));
      imu_SPIwriteByte(__pinAG, INT_GEN_THS_X_XL, accelThs);
      break;
    case Y_AXIS:
      tempRegValue |= (1 << (2 + overUnder));
      imu_SPIwriteByte(__pinAG, INT_GEN_THS_Y_XL, accelThs);
      break;
    case Z_AXIS:
      tempRegValue |= (1 << (4 + overUnder));
      imu_SPIwriteByte(__pinAG, INT_GEN_THS_Z_XL, accelThs);
      break;
    default:
      imu_SPIwriteByte(__pinAG, INT_GEN_THS_X_XL, accelThs);
      imu_SPIwriteByte(__pinAG, INT_GEN_THS_Y_XL, accelThs);
      imu_SPIwriteByte(__pinAG, INT_GEN_THS_Z_XL, accelThs);
      tempRegValue |= (0b00010101 << overUnder);
      break;
  }
 
  imu_SPIwriteByte(__pinAG, INT_GEN_CFG_XL, tempRegValue);
 
  if(duration > 0) duration = 0x80 | (duration & 0x7F);
  else             duration = 0x00; 
  imu_SPIwriteByte(__pinAG, INT_GEN_DUR_XL, duration);
  
  imu_SPIreadBytes(__pinAG, INT1_CTRL, &tempRegValue, 1);
  tempRegValue |= 0x40;

  imu_SPIwriteByte(__pinAG, INT1_CTRL, tempRegValue);
}  

