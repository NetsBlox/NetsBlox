
#include "LSM9DS1.h"

int __pinAG;

void LSM9DS1_initGyro()
{
  LSM9DS1_SPIwriteByte(__pinAG, CTRL_REG1_G,  0xC0);
  LSM9DS1_SPIwriteByte(__pinAG, CTRL_REG2_G,  0x00);  
  LSM9DS1_SPIwriteByte(__pinAG, CTRL_REG3_G,  0x00);
  LSM9DS1_SPIwriteByte(__pinAG, CTRL_REG4,    0x3A);
  LSM9DS1_SPIwriteByte(__pinAG, ORIENT_CFG_G, 0x00);
  LSM9DS1_setGyroScale(245);
}
