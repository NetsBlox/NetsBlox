#include "simpletools.h"

int add_driver(_Driver *driverAddr);

extern _Driver _FileDriver;

int sd_mount(int doPin, int clkPin, int diPin, int csPin)
{
  _SD_Params* mountParams = (_SD_Params*)-1;
    
  static _SD_SingleSPI sdPins;
  sdPins.MISO = doPin;
  sdPins.CLK = clkPin;
  sdPins.MOSI = diPin;
  sdPins.CS = csPin;    
    
  static _SD_Params params;
  params.AttachmentType = _SDA_SingleSPI;
  params.pins.SingleSPI = sdPins;
    
  mountParams = &params;

  if (mountParams == (_SD_Params*)-1)
  {
      return -1;
  }

  uint32_t mountErr = dfs_mount(mountParams);
  if (mountErr)
  {
      //print("Mount error: %d\n", mountErr);
      return mountErr;
  }

//  print("done.\n\n");
  add_driver(&_FileDriver);
  
  return 0;
}
