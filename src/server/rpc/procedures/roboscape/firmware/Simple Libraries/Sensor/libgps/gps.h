/**
 * @file gps.h
 *
 * @author Daniel Harris
 *
 * @copyright
 * Copyright (C) Parallax, Inc. 2014. All Rights MIT Licensed.
 *
 * @brief   This library provides basic NMEA parsing  capabilities.  It is designed to take raw NMEA strings,
  parse the data out of them, and make the data available to a parent application through accessor
  functions.

 *
 * @par Core Usage
 * Each call to rfid_open launches a serial communication process into another core.
 *
 * @par Memory Models
 * Use with CMM or LMM.
 *
 * @version 0.50
 */

#ifndef __SIMPLE_NMEA_PARSER__
#define __SIMPLE_NMEA_PARSER__

#if defined(__cplusplus)
#extern "C" {
#endif


#include "simpletools.h"
#include "fdserial.h"

#define KNOTS          0
#define MPH            1
#define KPH            2
#define MPS            3

#define GPS_TRUE       1
#define GPS_FALSE      0

#define GPS_INBUFF_SIZE    128  //needs to be big enough to hold an entire NMEA sentence and a few estra bytes

//Type definitions
typedef unsigned char gps_byte_t;

typedef struct nmea_data_s
{
  int fix;            //fix quality, 0=invalid, 1=GPS, 2=DGPS, etc...
  int fix_valid;      //boolean indicating a valid GPS fix
  float lat_dds;      //current latitude in decimal degress
  float lon_dds;      //current longitude in decimal degrees
  int sats_tracked;   //current number of satellites tracked by the GPS
  float altitude;     //current altitude, in meters, as float
  float heading;      //current direction of travel, in degrees, as float
  float velocity;     //current speed if travel, in knots, as float
  float date;         //current date, raw format with tenths of second, as float
  int time;           //current UTC time, raw format, as integer
  float mag_var;      //current magnetic variation, as float

} nmea_data;

/**
 * @brief Starts the GPS NMEA parser process.  This process ultimately consumes two cogs - one cog to continuously parse new data and the other cog to act as a UART serial port to receive data from the GPS module.
 *
 * @param gpsSin Propeller I/O pin connected to GPS modules TXD pin.  Receives NMEA sentences from the GPS module on this pin.
 *
 * @param gpsSout Propeller I/O pin connected to GPS modules RXD pin.  The Propeller transmits data to the GPS module on this pin.
 *
 * @param gps_baud Specifies the baud rate the UART communicates at.
 *
 * @returns Non-zero result for success, or zero upon failure to launch the parser process.
 */
int gps_open(int gpsSin, int gpsSout, int gps_baud);

/**
 * @brief Changes the baud rate of the UART without requiring you to respecify communication pins.  To change the communication pins, call gps_close() and re-call gps_open() with the new settings.
 *
 * @param The desired new baud rate, in symbols per second.
 *
 * @returns Non-zero result for success, or zero upon failure to re-launch the parser process.
 */
int gps_changeBaud(int newBaudRate);


/**
 * @brief Stops the GPS parser process and communication UART.  Calling this effectively frees two cogs.
 *
 */
void gps_close();


/**
 * @brief Provides the caller with the current latitude in decimal degrees.
 *
 * @returns A float representing the current latitude in decimal degrees.  Or zero if there is no valid fix.
 */
float gps_latitude();


/**
 * @brief Provides the caller with the current longitude in decimal degrees.
 *
 * @returns A float representing the current longitude in decimal degrees.  Or zero if there is no valid fix.
 */
float gps_longitude();


/**
 * @brief Provides the caller with information about the quality of the current GPS fix.
 *        Possible values are:
 *        0: invalid fix
 *        1: GPS fix
 *        2: DGPS fix (3D fix)
 *        others
 *
 * @returns The currect fix type the GPS module has acquired.
 */
int gps_fix();


/**
 * @brief Provides the caller with a way to determine if the GPS module has a valid lock.
 *
 * @returns A non-zero value if the GPS module has a lock, or zero if there is no valid lock.
 */
int gps_fixValid();


/**
 * @brief Provides the caller with the number of GPS satellites the module is currently tracking.
 *
 * @returns The number of satellites currently being tracked by the GPS module.
 */
int gps_satsTracked();


/**
 * @brief Provides the caller with the altitude above sea-level of the GPS module, in meters.
 *
 * @returns The currect altitude above sea-level, in meters.
 */
float gps_altitude();


/**
 * @brief Provides the caller with the current compass degree heading the GPS module is travelling in.  If the GPS module is not in motion, the heading degree will be zero.
 *
 * @returns The compass degree heading the module is travelling in.
 */
float gps_heading();


/**
 * @brief Provides the caller with the current speed the GPS module is travelling at.  If the GPS module is not in motion, the GPS module may report close-to-zero speeds because of small variations in the timing signals received from the GPS satellite.
 *
 * @param The desired unit type to scale the measured speed by.  Possible unit types are KNOTS, MPH, KPH, MPS.
 *
 * @returns The measured speed scaled by a unit type.
 */
float gps_velocity(int units_type);


/**
 * @brief Provides the caller with the UTC date received from the GPS satellite network.  The date will be an decimal integer value in the format DDMMYY.
 *
 * @returns UTC date received from the GPS satellite network.
 */
int gps_rawDate();


/**
 * @brief Provides the caller with the UTC time received from the GPS satellite network.  The time will be an decimal integer value in the format HHMMSS.
 *
 * @returns UTC time received from the GPS satellite network.
 */
int gps_rawTime();


/**
 * @brief Provides the caller with the number of degrees of magnetic varation.  This value can be fractional, so it is returned as a float.
 *
 * @returns A float of the number of degrees of magnetic variation.
 */
float gps_magneticVariation();


/**
 * @brief Provides the caller with a way to send data to the GPS module.  This way, the module can be configured to suit the application needs.
 *
 * @param The byte to send to the GPS module.
 *
 * @returns None.
 */
void gps_txByte(int txByte);

#if defined(__cplusplus)
}
#endif
//  end __cplusplus

#endif
//  end __SIMPLE_NMEA_PARSER__ redefinition guard


/**
 * TERMS OF USE: MIT License
 *
 * Permission is hereby granted, free of charge, to any person obtaining a
 * copy of this software and associated documentation files (the "Software"),
 *  to deal in the Software without restriction, including without limitation
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


