/**
 * @author Daniel Harris
 *
 * @copyright
 * Copyright (C) Parallax, Inc. 2014. All Rights MIT Licensed.
 *
 * @version 0.50
 */

#include "gps.h"

volatile nmea_data gps_data;

float gps_velocity(int unit_type)
{
/*
  Returns the velocity measurement from the GPS, in the desired predefined unit type.
*/
  float vel = gps_data.velocity;

  switch(unit_type)
  {
    case KNOTS:
      break;
    case MPH:
      //Conversion, knots to miles per hour (MPH).
      //1 Knot = 1.15078 MPH
      vel *= 1.15078;
      break;
    case KPH:
      //Conversion, knots to kilometers per hour (KPH).
      //1 Knot = 1.852 KPH
      vel *= 1.852;
      break;
    case MPS:
      //Conversion, knots to meters per second (mps).
      //1 Knot = .5144444 m/s
      vel *= 0.514444444444444;
      break;
    default:
      //invalid type specifier
      vel = -1;
  }
  return(vel);
}

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
