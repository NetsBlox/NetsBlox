#include "lsm9ds1.h"

int __pinAG, __pinM;

void imu_clearAccelInterrupt()
{
  unsigned char tempRegValue;
  imu_SPIwriteByte(__pinAG, INT_GEN_THS_X_XL, 0x00);
  imu_SPIwriteByte(__pinAG, INT_GEN_THS_Y_XL, 0x00);
  imu_SPIwriteByte(__pinAG, INT_GEN_THS_Z_XL, 0x00);
  imu_SPIwriteByte(__pinAG, INT_GEN_CFG_XL, 0x00);
  imu_SPIwriteByte(__pinAG, INT_GEN_DUR_XL, 0x00);
  
  imu_SPIreadBytes(__pinAG, INT1_CTRL, &tempRegValue, 1);
  tempRegValue &= 0xBF;

  imu_SPIwriteByte(__pinAG, INT1_CTRL, tempRegValue);
}  

void imu_clearGyroInterrupt()
{
  unsigned char tempRegValue;
  imu_SPIwriteByte(__pinAG, INT_GEN_THS_XH_G, 0x00);
  imu_SPIwriteByte(__pinAG, INT_GEN_THS_XL_G, 0x00);
  imu_SPIwriteByte(__pinAG, INT_GEN_THS_YH_G, 0x00);
  imu_SPIwriteByte(__pinAG, INT_GEN_THS_YL_G, 0x00);
  imu_SPIwriteByte(__pinAG, INT_GEN_THS_ZH_G, 0x00);
  imu_SPIwriteByte(__pinAG, INT_GEN_THS_ZL_G, 0x00);
  imu_SPIwriteByte(__pinAG, INT_GEN_CFG_G, 0x00);
  imu_SPIwriteByte(__pinAG, INT_GEN_DUR_G, 0x00);
  
  imu_SPIreadBytes(__pinAG, INT1_CTRL, &tempRegValue, 1);
  tempRegValue &= 0x7F;

  imu_SPIwriteByte(__pinAG, INT1_CTRL, tempRegValue);
}  

void imu_clearMagInterrupt()
{
  unsigned char tempRegValue;
  imu_SPIwriteByte(__pinM, INT_THS_L_M, 0x00);
  imu_SPIwriteByte(__pinM, INT_THS_H_M, 0x00);
  imu_SPIwriteByte(__pinM, INT_SRC_M, 0x00);
  imu_SPIwriteByte(__pinM, INT_CFG_M, 0x00);
}  