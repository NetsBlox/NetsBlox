/**
  @file datetime.h

  @author Parallax Inc.

  @brief This library provides convenient functions for a
  variety of timekeeping operations.  This library makes use of
  a manual Spin to C translation of functions from Bob
  Belleville's date_time_epoch.spin for converting to/from
  between epoch time (seconds from midnight, 1/1/1970) and a
  datetime format.

  @version 0.6

  @copyright
  Copyright (c) Parallax Inc 2015. All rights MIT licensed;
                see end of file.
*/


#ifndef DATETIME_H
#define DATETIME_H

#if defined(__cplusplus)
extern "C" {
#endif

#ifndef SECONDS
/**
 * @brief Constant 1 for 1 second.
 */
#define SECONDS 1
#endif

#ifndef MINUTES
/**
 * @brief Constant 60 for seconds in a minute.
 */
#define MINUTES 60
#endif

#ifndef HOURS
/**
 * @brief Constant 3600 for seconds in an hour.
 */
#define HOURS   60 * MINUTES
#endif

#ifndef DAYS
/**
 * @brief Constant 86400 for seconds in a day.
 */
#define DAYS    24 * HOURS
#endif

typedef struct datetime_st /// datetime_st Structure containing y, mo, h, m, and s elements.
{
  volatile int y; /// Year
  volatile int mo; /// Month
  volatile int d; /// Day
  volatile int h; /// Hour
  volatile int m; /// Minute
  volatile int s; /// Second
} datetime; /// datetime Type definition of datetime_st structure.


/**
 * @brief Run a date/time second counting process in another cog.
 * Example: datetime dts = {2015, 9, 25, 8, 11, 04};
 * dt_run(dts);
 *
 * @param dt A datetime structure, pre-set before the call.
 */
void dt_run(datetime dt);

/**
 * @brief Stop a date/time second counting process and recover the
 * cog and lock.
 */
void dt_end();

/**
 * @brief Set the system date and time.  This can be used to change the
 * system's current date/time.  Example datetime mydt={2015, 9, 25, 8,
 * 13, 51}; dt_set(mydt);  You can also use this to change the datetime
 * type that was used in dt_start to "set" the second counter that
 * auto-increments.
 *
 * @param dt A datetime type containing the new date and time.
 */
void dt_set(datetime dt);

/**
 * @brief Get the current system time.  To find the current system
 * time (as a datetime type), call this function.  Note: This assumes
 * that a call to dt_run has been made.  This is common near the
 * beginning of a program that uses the system timekeeping.
 *
 * @returns The datetime representation of the current system time.
 */
datetime dt_get();

/**
 * @brief Get the number of ms into the current second from the system
 * time second. Notes: This assumes that a call to dt_run has been made.
 * This is common near the beginning of a program that uses the system
 * timekeeping.  The current second can be captured with dt_get.
 *
 * @returns Milliseconds since into the current second.  This second .
 */
int dt_getms();

/**
 * @brief Get the Unix epoch time (number of seconds from Midnight, 1/1/1970)
 * from a datetime type.  This number is a common form of timekeeping for
 * computer systems.
 *
 * @param dt A datetime type that contains a valid date and time.
 *
 * @returns et The number of seconds that date is from Midnight, 1/1/1970.
 */
int dt_toEt(datetime dt);

/**
 * @brief Get the datetime representation of an a Unix epoch time (number
 * of seconds from Midnight, 1/1/1970).
 *
 * @param et The number of seconds that date is from Midnight, 1/1/1970.
 *
 * @returns dt A datetime type with the equivalent date and time.
 */
datetime dt_fromEt(int et);

/**
 * @brief Populates a string (minimum 9 characters) with the mm/dd/yy
 * representation of a datetime type's date.
 *
 * @param dt Datetime type containing a valid date.
 *
 * @param *s String (minimum 9 characters) address.
 */
void dt_toDateStr(datetime dt, char *s);

/**
 * @brief Populates a string (minimum 9 characters) with the hh:mm:ss
 * representation of a datetime type's time.
 *
 * @param dt Datetime type containing a valid time.
 *
 * @param *s String (minimum 9 characters) address.
 */
void dt_toTimeStr(datetime dt, char *s);

/**
 * @brief Populates the y, mo, and d fields in a datetime type with
 * value representations of the characters in a string that contains
 * the date in mm/dd/yy format.
 *
 * @param dt Datetime type.  This datetime type may already contain
 * a time that will be unaffected.  Only the date (y, mo, d) fields
 * will be changed.
 *
 * @param *s String (minimum 9 characters) containing the date in
 * mm/dd/yy format.
 *
 * @returns A copy of the datetime type with updated date fields.
 */
datetime dt_fromDateStr(datetime dt, char *s);

/**
 * @brief Populates the time fields (h, m, and s) in a datetime type
 * with value representations of the characters in a string that
 * contains the time in hh/mm/ss format.
 *
 * @param dt Datetime type.  This datetime type may already contain
 * a date that will be unaffected.  Only the date (h, m, s) fields
 * will be changed.
 *
 * @param *s String (minimum 9 characters) containing the time in
 * hh:mm:ss format.
 *
 * @returns A copy of the datetime type with updated time fields.
 */
datetime dt_fromTimeStr(datetime dt, char *s);

#ifndef DOXYGEN_SHOULD_SKIP_THIS

  #ifndef _eunix
  #define _eunix 2440588
  #endif

  #ifndef _edos
  #define _edos 2444240
  #endif

  #ifndef _eunix
  #define _eunix 2440588
  #endif

  #ifndef _eprop
  #define _eprop 2451545
  #endif

  #ifndef _epoch
  #define _epoch _eunix
  #endif

  void secondctr(void *par);

  int dte_toJD(int y, int m, int d);
  int dte_toSPD(int h, int m, int s);
  int dte_toCal(int jd);
  int dte_dateETV(int etv);
  int dte_timeETV(int etv);
  //int dte_toETV(int y, int mo, int d,int h,int m, int s);

#endif // DOXYGEN_SHOULD_SKIP_THIS

#if defined(__cplusplus)
}
#endif
/* __cplusplus */
#endif
/* DATETIME_H */

/*
  TERMS OF USE: MIT License

  Permission is hereby granted, free of charge, to any person obtaining a
  copy of this software and associated documentation files (the "Software"),
  to deal in the Software without restriction, including without limitation
  the rights to use, copy, modify, merge, publish, distribute, sublicense,
  and/or sell copies of the Software, and to permit persons to whom the
  Software is furnished to do so, subject to the following conditions:

  The above copyright notice and this permission notice shall be included in
  all copies or substantial portions of the Software.

  THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
  IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
  FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL
  THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
  LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
  FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER
  DEALINGS IN THE SOFTWARE.
*/

