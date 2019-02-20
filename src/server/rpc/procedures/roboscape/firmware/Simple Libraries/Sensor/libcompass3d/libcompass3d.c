/*
* @file libcompass3d.c
*
* @author Andy Lindsay
*
* @copyright
* Copyright (C) Parallax, Inc. 2013. All Rights MIT Licensed.
*
* @brief Temporary project and test harness for the name library.
*
* SCL connected to P3 and SDA connected to P2. Display measurement results in 
* SimpleIDE Terminal
*/

#include "simpletools.h"                      // Include simpletools header
#include "compass3d.h"                        // Include compass3d header
#include "simplei2c.h"

int main()                                    // Main function
{


  int x, y, z;                                // Declare x, y, & z axis variables
  pause(1000);
  print("c32\n");
  i2c *bus = i2c_newbus(3, 2, 0);             // New I2C bus SCL=P3, SDA=P2
  compass_init(bus);                          // Initialize compass on bus.

  print("c54\n");
  i2c *bus2 = i2c_newbus(5, 4, 0);            // New I2C bus SCL=P3, SDA=P2
  compass_init(bus2);                         // Initialize compass on bus.

  print("%c", HOME);

  while(1)                                    // Repeat indefinitely
  {
    print("%c", HOME);
    print("c32\n");
    compass_read(bus, &x, &y, &z);            // Compass vals -> variables

    int *px, *py, *pz;

    px = &x;
    py = &y;
    pz = &z;
 
    *px = x;
    *py = y;
    *pz = z;

    float heading = atan2(x, y);
    if(heading < 0)
    {
      heading += 2.0 * 3.14;
    }
     
    float headingDegrees = heading * 180/3.14; 

    print("\nx=%d, y=%d, z=%d%c\n",              // Display raw compass values
          x, y, z, CLREOL);
    print("heading = %f, \n",                    // Display raw compass values
          headingDegrees);
    waitcnt(CLKFREQ/2+CNT);

    print("c54\n");
    compass_read(bus2, &x, &y, &z);              // Compass vals -> variables

    px = &x;
    py = &y;
    pz = &z;
 
    *px = x;
    *py = y;
    *pz = z;

    heading = atan2(x, y);
    if(heading < 0)
    {
      heading += 2.0 * 3.14;
    }
     
    headingDegrees = heading * 180/3.14; 

    print("\nx=%d, y=%d, z=%d%c\n",              // Display raw compass values
          x, y, z, CLREOL);
    print("heading = %f, \n",                    // Display raw compass values
          headingDegrees);
    pause(500);                                  // Wait 1/2 second
  }


}





