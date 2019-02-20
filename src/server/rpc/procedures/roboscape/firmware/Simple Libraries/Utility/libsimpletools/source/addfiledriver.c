#include "simpletools.h"

extern _Driver _SimpleSerialDriver;

const int DRIVER_LIST_SIZE = 16;

_Driver *_driverlist[] = {
    &_SimpleSerialDriver, 
    NULL, NULL, NULL, NULL,
    NULL, NULL, NULL, NULL,
    NULL, NULL, NULL, NULL,
    NULL, NULL, NULL
};

int add_driver(_Driver *driverAddr)
{
  int i;
  for(i = 0; i < DRIVER_LIST_SIZE; i++)                      
  {
    if(_driverlist[i] == 0) break;
  }
  //print("i = %d", i);
  //print("\n");
  _driverlist[i] = driverAddr;
  return i;
}

