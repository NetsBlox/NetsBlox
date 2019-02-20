
/**
 * @file mma7455.h
 *
 * @author Andy Lindsay
 *
 * @version 0.50
 *
 * @copyright
 * Copyright (C) Parallax, Inc. 2014. All Rights MIT Licensed.
 *
 * @brief Simplifies reading Parallax MMA7455 3-Axis Accelerometer Module.
 */


#ifndef MMA7455_H
#define MMA7455_H

#if defined(__cplusplus)
extern "C" {
#endif


#include "simpletools.h"                        // Include simpletools lib

/**
 * MMA7455 XOUTL Register = 0x00.
 */
#define MMA7455_XOUTL        0x00              // 10 bits output value X LSB             XOUT[7]  XOUT[6]  XOUT[5]  XOUT[4]  XOUT[3]  XOUT[2]  XOUT[1]  XOUT[0]

/**
 * MMA7455 XOUTH Register = 0x01.
 */
#define MMA7455_XOUTH        0x01              // 10 bits output value X MSB             --       --       --       --       --       --       XOUT[9]  XOUT[8]

/**
 * MMA7455 YOUTL Register = 0x02.
 */
#define MMA7455_YOUTL        0x02              // 10 bits output value Y LSB             YOUT[7]  YOUT[6]  YOUT[5]  YOUT[4]  YOUT[3]  YOUT[2]  YOUT[1]  YOUT[0]

/**
 * MMA7455 YOUTH Register = 0x03.
 */
#define MMA7455_YOUTH        0x03              // 10 bits output value Y MSB             --       --       --       --       --       --       YOUT[9]  YOUT[8]

/**
 * MMA7455 ZOUTL Register = 0x04.
 */
#define MMA7455_ZOUTL        0x04              // 10 bits output value Z LSB             ZOUT[7]  ZOUT[6]  ZOUT[5]  ZOUT[4]  ZOUT[3]  ZOUT[2]  ZOUT[1]  ZOUT[0]

/**
 * MMA7455 ZOUTH Register = 0x05.
 */
#define MMA7455_ZOUTH        0x05              // 10 bits output value Z MSB             --       --       --       --       --       --       ZOUT[9]  ZOUT[8]

/**
 * MMA7455 XOUT8 Register = 0x06.
 */
#define MMA7455_XOUT8        0x06              // 8 bits output value X                  XOUT[7]  XOUT[6]  XOUT[5]  XOUT[4]  XOUT[3]  XOUT[2]  XOUT[1]  XOUT[0]

/**
 * MMA7455 YOUT8 Register = 0x07.
 */
#define MMA7455_YOUT8        0x07              // 8 bits output value Y                  YOUT[7]  YOUT[6]  YOUT[5]  YOUT[4]  YOUT[3]  YOUT[2]  YOUT[1]  YOUT[0]

/**
 * MMA7455 ZOUT8 Register = 0x08.
 */
#define MMA7455_ZOUT8        0x08              // 8 bits output value Z                  ZOUT[7]  ZOUT[6]  ZOUT[5]  ZOUT[4]  ZOUT[3]  ZOUT[2]  ZOUT[1]  ZOUT[0]

/**
 * MMA7455 STATUS Register = 0x09.
 */
#define MMA7455_STATUS       0x09              // Status registers                       --       --       --       --       --       PERR     DOVR     DRDY

/**
 * MMA7455 DETSRC Register = 0x0A.
 */
#define MMA7455_DETSRC       0x0A              // Detection source registers             LDX      LDY      LDZ      PDX      PDY      PDZ      INT1     INT2

/**
 * MMA7455 TOUT Register = 0x0B.
 */
#define MMA7455_TOUT         0x0B              // "Temperature output value" (Optional)  TMP[7]   TMP[6]   TMP[5]   TMP[4]   TMP[3]   TMP[2]   TMP[1]   TMP[0]


//#define MMA7455_           0x0C              // (Reserved)                             --       --       --       --       --       --       --       --

/**
 * MMA7455 I2CAD Register = 0x0D.
 */
#define MMA7455_I2CAD        0x0D              // I2C device address I                   2CDIS    DAD[6]   DAD[5]   DAD[4]   DAD[3]   DAD[2]   DAD[1]   DAD[0]

/**
 * MMA7455 USRINF Register = 0x0E.
 */
#define MMA7455_USRINF       0x0E              // User information (Optional)            UI[7]    UI[6]    UI[5]    UI[4]    UI[3]    UI[2]    UI[1]    UI[0]

/**
 * MMA7455 WHOAMI Register = 0x0F.
 */
#define MMA7455_WHOAMI       0x0F              // "Who am I" value (Optional)            ID[7]    ID[6]    ID[5]    ID[4]    ID[3]    ID[2]    ID[1]    ID[0]

/**
 * MMA7455 XOFFL Register = 0x10.
 */
#define MMA7455_XOFFL        0x10              // Offset drift X value (LSB)             XOFF[7]  XOFF[6]  XOFF[5]  XOFF[4]  XOFF[3]  XOFF[2]  XOFF[1]  XOFF[0]

/**
 * MMA7455 XOFFH Register = 0x11.
 */
#define MMA7455_XOFFH        0x11              // Offset drift X value (MSB)             --       --       --       --       --       XOFF[10] XOFF[9]  XOFF[8]

/**
 * MMA7455 YOFFL Register = 0x12.
 */
#define MMA7455_YOFFL        0x12              // Offset drift Y value (LSB)             YOFF[7]  YOFF[6]  YOFF[5]  YOFF[4]  YOFF[3]  YOFF[2]  YOFF[1]  YOFF[0]

/**
 * MMA7455 YOFFH Register = 0x13.
 */
#define MMA7455_YOFFH        0x13              // Offset drift Y value (MSB)             --       --       --       --       --       YOFF[10] YOFF[9]  YOFF[8]

/**
 * MMA7455 ZOFFL Register = 0x14.
 */
#define MMA7455_ZOFFL        0x14              // Offset drift Z value (LSB)             ZOFF[7]  ZOFF[6]  ZOFF[5]  ZOFF[4]  ZOFF[3]  ZOFF[2]  ZOFF[1]  ZOFF[0]

/**
 * MMA7455 ZOFFH Register = 0x15.
 */
#define MMA7455_ZOFFH        0x15              // Offset drift Z value (MSB)             --       --       --       --       --       ZOFF[10] ZOFF[9]  ZOFF[8]

/**
 * MMA7455 MCTL Register = 0x16.
 */
#define MMA7455_MCTL         0x16              // Mode control                           LPEN     DRPD     SPI3W    STON     GLVL[1]  GLVL[0]  MOD[1]   MOD[0]

/**
 * MMA7455 INTRST Register = 0x17.
 */
#define MMA7455_INTRST       0x17              // Interrupt latch reset                  --       --       --       --       --       --       CLRINT2  CLRINT1

/**
 * MMA7455 CTL1 Register = 0x18.
 */
#define MMA7455_CTL1         0x18              // Control 1                              --       THOPT    ZDA      YDA      XDA      INTRG[1] INTRG[0] INTPIN

/**
 * MMA7455 CTL2 Register = 0x19.
 */
#define MMA7455_CTL2         0x19              // Control 2                              --       --       --       --       --       DRVO     PDPL     LDPL

/**
 * MMA7455 LDTH Register = 0x1A.
 */
#define MMA7455_LDTH         0x1A              // Level detection threshold limit value  LDTH[7]  LDTH[6]  LDTH[5]  LDTH[4]  LDTH[3]  LDTH[2]  LDTH[1]  LDTH[0]

/**
 * MMA7455 PDTH Register = 0x1B.
 */
#define MMA7455_PDTH         0x1B              // Pulse detection threshold limit value  PDTH[7]  PDTH[6]  PDTH[5]  PDTH[4]  PDTH[3]  PDTH[2]  PDTH[1]  PDTH[0]

/**
 * MMA7455 PW Register = 0x1C.
 */
#define MMA7455_PW           0x1C              // Pulse duration value                   PD[7]    PD[6]    PD[5]    PD[4]    PD[3]    PD[2]    PD[1]    PD[0]

/**
 * MMA7455 LT Register = 0x1D.
 */
#define MMA7455_LT           0x1D              // Latency time value                     LT[7]    LT[6]    LT[5]    LT[4]    LT[3]    LT[2]    LT[1]    LT[0]

/**
 * MMA7455 TW Register = 0x1E.
 */
#define MMA7455_TW           0x1E              // Time window for 2nd pulse value        TW[7]    TW[6]    TW[5]    TW[4]    TW[3]    TW[2]    TW[1]    TW[0]


/**
 * MMA7455_STANDBY can be used with the MMA7455_setMode and getMode functions.  Its 
 * value is 0, the standby mode value.
 */
#define MMA7455_STANDBY      0b00              // Standby mode

/**
 * MMA7455_MEASUREMENT can be used with the MMA7455_setMode and getMode functions.  Its 
 * value is 1, the measurement mode value.
 */
#define MMA7455_MEASUREMENT  0b01              // Measurement mode

/**
 * MMA7455_LEVEL_DETECT can be used with the MMA7455_setMode and getMode functions.  Its 
 * value is 2, the level detect mode value.
 */
#define MMA7455_LEVEL_DETECT 0b10              // Measurement mode

/**
 * MMA7455_PULSE_DETECT can be used with the MMA7455_setMode and getMode functions.  Its 
 * value is 3, the pulse detect mode value.
 */
#define MMA7455_PULSE_DETECT 0b11              // Measurement mode


/**
 * Global variable for I/O pinconnected to MMA7455 module's DATA pin.
 */
extern int MMA7455_pinDat;

/**
 * Global variable for I/O pinconnected to MMA7455 module's CLK pin.
 */
extern int MMA7455_pinClk;

/**
 * Global variable for I/O pinconnected to MMA7455 module's /CS pin.
 */
extern int MMA7455_pinEn;


/**
 * @brief Initialize the sensor 
 *
 * @param pinData I/O pin connected to the DATA pin.
 *
 * @param pinClock I/O pin connected to the CLK pin.
 *
 * @param pinEnable I/O pin connected to the /ENABLE pin.
 */
void MMA7455_init(int pinData, int pinClock, int pinEnable);


/**
 * @brief Get 10 bit x, y, and z axis measurements.  The range is
 * +/- 8 g with values of +/- 64 corresponding to +/- 1 g.
 *
 * @param *x Address pointer to a signed short x variable.
 *
 * @param *y Address pointer to a signed short y variable.
 *
 * @param *z Address pointer to a signed short z variable.
 *
 */
void MMA7455_getxyz10(signed short *x, signed short *y, signed short *z);


/**
 * @brief Get 8 bit x, y, and z axis measurements.  
 * 
 * @details These measurements are scaled by the MMA7455_gRrange function so 
 * that the measurement will fit in a single signed byte (from -128 to 127).  
 * The gRange default value is 8, which causes +/- 1 g to correspond to +/- 16.  
 * Setting gRange to 4 causes +/- 1 g to correspond to +/- 32, and setting gRange 
 * to 2 causes +/- 1 g to correspond with +/- 64.  See the MMA7455_gRange function's
 * Details section for more info.  
 *
 * @param *x Address pointer to a signed char x variable.
 *
 * @param *y Address pointer to a signed char y variable.
 *
 * @param *z Address pointer to a signed char z variable.
 *
 */
void MMA7455_getxyz8(signed char *x, signed char *y, signed char *z);


/**
 * @brief Set value automatically added to X value measurement.  Start with value
 * that's twice the zero offset error, and repeat the test.  It may take a several
 * iterations.
 *
 * @param offset Twice the value you want the chip to add to the x axis measurement
 */
void MMA7455_setOffsetX(signed short offset);


/**
 * @brief Set value automatically added to Y value measurement.  Start with value
 * that's twice the zero offset error, and repeat the test.  It may take a several
 * iterations.
 *
 * @param offset Twice the value you want the chip to add to the y axis measurement
 */
void MMA7455_setOffsetY(signed short offset);


/**
 * @brief Set value automatically added to Z value measurement.  Start with value
 * that's twice the zero offset error, and repeat the test.  It may take a several
 * iterations.
 *
 * @param offset Twice the value you want the chip to add to the z axis measurement
 */
void MMA7455_setOffsetZ(signed short offset);


/**
 * @brief Get the mode of operation: (0) standby, (1) measurement, (2) level error
 * detection, (3) pulse impact detection.
 *
 * @returns mode Value from 0 to 3.
 */
unsigned char MMA7455_getMode();


/**
 * @brief Set the mode of operation: (0) standby, (1) measurement, (2) level error
 * detection, (3) pulse impact detection.
 *
 * @param mode Value from 0 to 3.
 */
void MMA7455_setMode(unsigned char mode);


/**
 * @brief Set the g measurement range to +/- 2, +/-4, or +/- 8 g.  
 *
 * @details This function makes the chip apply scalars to the values reported by 
 * MMA7455_getxyz8 so that the measurement will fit in a value that ranges from 
 * -128 to + 127.  If grange is set to 2, there is no scaling with values of +/-64 
 * corresponding to +/-1 g.  If grange is set to 4 for +/- 4 g, then values of +/- 32 
 * correspond to +/-1 g.  If grange is set to 8, values of +/- 16 correspond to +/- 1g.   
 *
 * @param range Valid range values are 2, 4, and 8.
 */
void MMA7455_gRange(unsigned char range);


/**
 * @brief write a byte value to an MMA7455 register
 *
 * @param address MMA7455 register address.
 *
 * @param value Configuration value for the register.
 */
void MMA7455_writeByte(unsigned char address, unsigned char value);


/**
 * @brief Read a value from an MMA7455 register
 *
 * @param address MMA7455 register address.
 *
 * @returns Value stored by the MMA7455 register.
 */
unsigned char MMA7455_readByte(unsigned char address);


#if defined(__cplusplus)
}
#endif
/* __cplusplus */ 
#endif
/* MMA7455_H */ 


/**
 * TERMS OF USE: MIT License
 *
 * Permission is hereby granted, free of charge, to any person obtaining a
 * copy of this software and associated documentation files (the "Software"),
 * to deal in the Software without restriction, including without limitation
 * the rights to use, copy, modify, merge, publish, distribute, sublicense,
 * and/or sell copies of the Software, and to permit persons to whom the
 * Software is furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL
 * THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
 * FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER
 * DEALINGS IN THE SOFTWARE.
 */





