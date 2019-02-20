/**
 * @author Daniel Harris
 *
 * @copyright
 * Copyright (C) Parallax, Inc. 2014. All Rights MIT Licensed.
 *
 * @version 0.5
 */

#include "gps.h"

volatile int  gps_cog;
volatile int  gps_stopping;
volatile int  gps_stack[100];
volatile int _gps_rx_pin, _gps_tx_pin, _gps_baud;

nmea_data gps_data;

gps_byte_t inBuff[GPS_INBUFF_SIZE];
gps_byte_t *ptrBuff;

fdserial *gps_ser;


void ParseRMC();
void ParseGGA();
void PrepBuff();

void gps_run(void *par)
{
  gps_byte_t tempBuff[16];
  gps_byte_t ch;
  int idx;

  gps_ser = fdserial_open(_gps_rx_pin, _gps_tx_pin, 0, _gps_baud);
  for(;;)
  {
    if(gps_stopping)
    {

      fdserial_close(gps_ser);
      gps_stopping = 0;
    }
    ch = fdserial_rxChar(gps_ser);
    
    //search for the start of an NMEA sentence
    if(ch != '$')
      continue;


    //read in characters from the GPS
    idx = 0;
    do
    {
      ch = fdserial_rxChar(gps_ser);
      inBuff[idx++] = ch;      
    }while(ch != 13);
    inBuff[idx] = 0;      //null terminate

    //got the full sentence, do a little prep work to get ready for parsing.
    //modifies inBuff!
    PrepBuff();

    if(strncmp(inBuff, "GPRMC", 5) == 0)
      ParseRMC();
    if(strncmp(inBuff, "GPGGA", 5) == 0)
      ParseGGA();
  }
}

void ParseRMC()
{
  int i;
  float f_temp;

  ptrBuff = strtok(inBuff,",");
  i=0;  
  while(ptrBuff && i<12)
  {
    if(i==1)  //time in RMC sentence, raw format, as float
      gps_data.time = atof(ptrBuff);

    if(i==2)  //Fix status
      gps_data.fix_valid = strcmp(ptrBuff, "A") ? GPS_FALSE:GPS_TRUE;

    if(i==3)  //latitude field in RMC sentence
    {
      int sign;
      int degs;
      f_temp = (float)atof(ptrBuff);
      ptrBuff = strtok(NULL,",");
      i++;

      //sign = (abs(strcmp(ptrBuff,"S"))<<1)-1;
      sign = strcmp(ptrBuff,"N") ? -1:1;  //create a sign multiplier from N/S
      degs = (int)f_temp/100;   //grab the whole number of degrees
      f_temp -= (degs*100);     //remove the degrees from the calculation
      gps_data.lat_dds = sign*((f_temp/60)+degs);  //calculate decimal degrees from remaining minutes, then add back degrees and apply the sign
    }

    if(i==5)  //longitude field in RMC sentence
    {
      int sign;
      int degs;
      f_temp = (float)atof(ptrBuff);
      ptrBuff = strtok(NULL,",");
      i++;

      //these next few lines convert
      //  degs and mins to decimal degree seconds

      //sign = (abs(strcmp(ptrBuff,"W"))<<1)-1;
      sign = strcmp(ptrBuff,"E") ? -1:1;  //create a sign multiplier from E/W
      degs = (int)f_temp/100;   //grab the whole number of degrees
      f_temp -= (degs*100);     //remove the degrees from the calculation
      gps_data.lon_dds = sign*((f_temp/60)+degs);  //calculate decimal degrees from remaining minutes, then add back degrees and apply the sign
    }

    if(i==7)  //speed field in RMC sentence, in knots
      gps_data.velocity = (float)atof(ptrBuff);
    
    if(i==8)  //heading angle in RMC sentence, in degrees
      gps_data.heading = (float)atof(ptrBuff);
    
    if(i==9)  //date in RMC sentence, raw format, as integer
      gps_data.date = atoi(ptrBuff);

    if(i==10) //magnetic variation in RMC sentence, in degrees
      gps_data.mag_var = (float)atof(ptrBuff);
    
    ptrBuff = strtok(NULL,",");
    i++;
  }


}

void ParseGGA()
{
  int i;  //i will contain the field number of the comma separated string.

  ptrBuff = strtok(inBuff,",");
  i=0;  
  while(ptrBuff && i<16)
  {
    if(i==6)  //fix quality in GGA sentence
      gps_data.fix = atoi(ptrBuff);
    
    if(i==7)  //number of satellites tracked in GGA sentence
      gps_data.sats_tracked = atoi(ptrBuff);

    if(i==9) //altitude of receiver, in meters, as a float
      gps_data.altitude = (float)atof(ptrBuff);
    
    ptrBuff = strtok(NULL,",");
    i++;
  }
}

void PrepBuff()
{
  //this is a private helper function to add ascii 0's to empty strings in the rxed NMEA sentence
  //this is needed by strtok so as not to skip over empty strings.
  int ch, prevch=0, len, i;
  len = strlen(inBuff);

  for(i=0; i<len; i++)
  {
    ch = inBuff[i];
    if(ch == ',' && prevch == ',')  //have we seen two ',' in a row?
    {
      memmove(inBuff+i+1, inBuff+i, len-i); //make room for a byte in the buffer
      prevch = inBuff[i] = '0';     //insert the '0', update the last byte seen
      len++;                        //we grew the buffer's length, so account for it
    }
    else
    {
      prevch = ch;  //remember this byte as the last byte seen
    }
  }
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
