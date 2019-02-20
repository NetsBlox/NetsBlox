
#include "lsm9ds1.h"

int __pinAG;
float __gRes;

void imu_setGyroInterrupt(char axis, float threshold, char duration, char overUnder, char andOr)
{
  
  overUnder &= 0x01;
  unsigned char tempRegValue = 0;

  imu_SPIreadBytes(__pinAG, CTRL_REG4, &tempRegValue, 1);     // Make sure interrupt is NOT latched
  tempRegValue &= 0xFD;
  imu_SPIwriteByte(__pinAG, CTRL_REG4, tempRegValue);

  imu_SPIreadBytes(__pinAG, INT_GEN_CFG_G, &tempRegValue, 1);

  if(andOr) tempRegValue |= 0x80;
  else      tempRegValue &= 0x7F;

  short gyroThs = 0;
  unsigned char gyroThsH = 0, gyroThsL = 0;
  gyroThs = (short) (__gRes * threshold);
  
  if(gyroThs > 16383)  gyroThs = 16383;
  if(gyroThs < -16384) gyroThs = -16384;
  
  gyroThsL = gyroThs & 0xFF;
  gyroThsH = (gyroThs >> 8) & 0x7F;
  
  switch (axis)
  {
    case X_AXIS:
      tempRegValue |= (1 << (0 + overUnder));
      imu_SPIwriteByte(__pinAG, INT_GEN_THS_XH_G, gyroThsH);
      imu_SPIwriteByte(__pinAG, INT_GEN_THS_XL_G, gyroThsL);
      break;
    case Y_AXIS:
      tempRegValue |= (1 << (2 + overUnder));
      imu_SPIwriteByte(__pinAG, INT_GEN_THS_YH_G, gyroThsH);
      imu_SPIwriteByte(__pinAG, INT_GEN_THS_YL_G, gyroThsL);
      break;
    case Z_AXIS:
      tempRegValue |= (1 << (4 + overUnder));
      imu_SPIwriteByte(__pinAG, INT_GEN_THS_ZH_G, gyroThsH);
      imu_SPIwriteByte(__pinAG, INT_GEN_THS_ZL_G, gyroThsL);
      break;
    default:
      imu_SPIwriteByte(__pinAG, INT_GEN_THS_XH_G, gyroThsH);
      imu_SPIwriteByte(__pinAG, INT_GEN_THS_XL_G, gyroThsL);
      imu_SPIwriteByte(__pinAG, INT_GEN_THS_YH_G, gyroThsH);
      imu_SPIwriteByte(__pinAG, INT_GEN_THS_YL_G, gyroThsL);
      imu_SPIwriteByte(__pinAG, INT_GEN_THS_ZH_G, gyroThsH);
      imu_SPIwriteByte(__pinAG, INT_GEN_THS_ZL_G, gyroThsL);
      tempRegValue |= (0b00010101 << overUnder);
      break;
  }
 
  imu_SPIwriteByte(__pinAG, INT_GEN_CFG_G, tempRegValue);
 
  if(duration > 0) duration = 0x80 | (duration & 0x7F);
  else             duration = 0x00; 
  imu_SPIwriteByte(__pinAG, INT_GEN_DUR_G, duration);
  
  imu_SPIreadBytes(__pinAG, INT1_CTRL, &tempRegValue, 1);
  tempRegValue |= 0x80;

  imu_SPIwriteByte(__pinAG, INT1_CTRL, tempRegValue);
}  


