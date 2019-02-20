/*
 * @file wavplayer.c
 *
 * @author Andy Lindsay
 *
 * @copyright
 * Copyright (C) Parallax, Inc. 2012. All Rights MIT Licensed.
 *
 * @brief Plays 16-bit, 32ksps, mono .wav files in the root directory of a 
 * microSD card.

 * @n @n Currently supports LMM and CMM memory models.  
 * @n @n
 * WAV file info sources, thanks to:
 *   @n http://blogs.msdn.com/b/dawate/archive/2009/06/23/intro-to-audio-programming-part-2-demystifying-the-wav-format.aspx
 *   @n http://www.sonicspot.com/guide/wavefiles.html
 *   @n
 */

#include "simpletools.h"
#include "wavplayer.h"

static volatile int sampleRate;
static volatile int swap = 0;
static volatile int playing = 0;
static volatile short int wavVal;  
static volatile int dacVal;
static volatile unsigned int dtSample;
//static volatile unsigned int t;
static volatile int significantBitsPerSample=16;
static volatile unsigned int reps;
static volatile unsigned int cog = 0;
static volatile unsigned int cog2 = 0;
static volatile unsigned int settingUp = 0;

static volatile unsigned int volume = 0;
static volatile const unsigned int BUF_SIZE = 512;

static unsigned int stack[44 + 28];
static unsigned int stack2[44 + 128];

void play(void);
void wav_reader(void *par);
void audio_dac(void *par);
void spooler(void *par);

char wavDacBufferL[512];
char wavDacBufferH[512];

volatile const char* track;

FILE* fp;

//void wav_start(void)
void wav_play(const char* wavFilename)
{
  settingUp = 1;
  if(!volume) wav_volume(7);
  wav_stop();
  track = wavFilename;
  cog2 = cogstart(wav_reader, NULL, stack2, sizeof(stack2)) + 1;
  waitcnt(CLKFREQ/20 + CNT);
  //while(1);
}

int wav_playing()
{
  int status = settingUp || playing;
  return status;
}

void wav_volume(int vol)
{
  if(vol > 10) vol = 10;
  if(vol < 0) vol = 0;
  vol = 1 << (21 - significantBitsPerSample + vol);
  unsigned int vi = volume;
  unsigned int vf = vol;   
  for(int v = vi; volume != vf;)
  { 
    if(vf > volume) volume++;
    if(vf < volume) volume--;
    if(volume == vf) break;  
  } 
}

void wav_stop(void)
{
  playing = 0;
  if(fp) fclose(fp);
  fp = 0;
  if(cog2)
  {
    cogstop(cog2-1);
    cog2 = 0;
  }
}

void wav_close(void)
{
  if(cog)
  {
    cogstop(cog-1);
    cog = 0;
  }
  wav_stop();
}

void wav_reader(void *par)
{
  char b[4];
  int v;
  unsigned short int w;
  
  const char* trackp = (const char*) track;
  
  fp = fopen(trackp, "r");
  if(fp)
  {
    fread(b, 1, 4, fp);
    //print("Chunk ID: %s\n", b);
    
    fread(b, 1, 4, fp);
    int fileSize = b[3] << 24 | b[2] << 16 | b[1] << 8 | b[0];
    //print("File Size: %d\n", fileSize);
    
    fread(b, 1, 4, fp);
    //print("RIFF Type: %s\n", b);

    fread(b, 1, 4, fp);
    //print("Chunk ID: %s\n", b);
    
    fread(b, 1, 4, fp);
    int chunkDataSize = b[3] << 24 | b[2] << 16 | b[1] << 8 | b[0];
    //print("Chunk data size: %d\n", chunkDataSize);

    fread(b, 1, 2, fp);
    int compressionCode = b[1] << 8 | b[0];
    //print("Compression code: %d\n", compressionCode);

    fread(b, 1, 2, fp);
    int numberOfChannels = b[1] << 8 | b[0];
    //print("Number of channels: %d\n", numberOfChannels);

    fread(b, 1, 4, fp);
    sampleRate = b[3] << 24 | b[2] << 16 | b[1] << 8 | b[0];
    //print("Sample rate: %d\n", sampleRate);

    fread(b, 1, 4, fp);
    int averageBytesPerSecond = b[3] << 24 | b[2] << 16 | b[1] << 8 | b[0];
    //print("Average bytes per second: %d\n", averageBytesPerSecond);

    fread(b, 1, 2, fp);
    int blockAlign = b[1] << 8 | b[0];
    //print("Block align: %d\n", blockAlign);

    fread(b, 1, 2, fp);
    significantBitsPerSample = b[1] << 8 | b[0];
    //print("Significant bits/sample: %d\n", significantBitsPerSample);

    int extraFormatBytes;
    if(compressionCode != 1)
    {
      fread(b, 1, 2, fp);
      extraFormatBytes = b[1] << 8 | b[0];
    }
    else
    {
      extraFormatBytes = 0;
    }  
    //print("Extra format bytes: %d\n", extraFormatBytes);

    fread(b, 1, 4, fp);
    //print("Chunk identifier: %s\n", b);

    fread(b, 1, 4, fp);
    int dwordChunkSize = b[3] << 24 | b[2] << 16 | b[1] << 8 | b[0];
    //print("dword Chunk Size: %d\n", dwordChunkSize);

    //unsigned int ti, tf, t, byteRate;
    //ti = CNT;
    fread(wavDacBufferL, 1, 512, fp);
    //tf = CNT;
    //int t = tf - ti;
    //print("\nClock ticks for 512 bytes = %d\n", t); 
    //byteRate = CLKFREQ*32/t*16;
    //print("Bandwidth (bytes/sec): = %d\n\n", byteRate); 
    fread(wavDacBufferH, 1, 512, fp);
       
    if(!cog)
      cog = cogstart(audio_dac, NULL, stack, sizeof(stack)) + 1;
    
    int reps = (fileSize-1)/1024;
    playing = 1;
    settingUp = 0;
    int i;
    
    for(i = 1; i < reps; i++)
    { 
      while(swap != 2);
      fread(wavDacBufferL, 1, BUF_SIZE, fp);
      while(swap != 1);
      fread(wavDacBufferH, 1, BUF_SIZE, fp);
    }
    wav_stop();
  }
}

//__attribute__((fcache))
void audio_dac(void *par)
{
  while(!playing);

  CTRA = 0x18000000 + 27;
  CTRB = 0x18000000 + 26;
  DIRA |= (1<<27);
  DIRA |= (1<<26);

  dtSample = CLKFREQ/sampleRate;
  int i;
  int t = CNT;
  t += dtSample;

  while(1)
  {
    if(playing)
    {
      swap = 1;
      for(i = 0; i < BUF_SIZE; i+=2)
      {
        wavVal = wavDacBufferL[i] | wavDacBufferL[i+1]<<8;
        dacVal = (wavVal + 32768) * volume;
        FRQA = dacVal;
        FRQB = dacVal;
        waitcnt(t+=dtSample);
      }
      swap = 2;
      for(i = 0; i < BUF_SIZE; i+=2)
      {
        wavVal = wavDacBufferH[i] | wavDacBufferH[i+1]<<8;
        dacVal = (wavVal + 32768) * volume;
        FRQA = dacVal;
        FRQB = dacVal;
        waitcnt(t+=dtSample);
      }
    }
    else
    {
      dacVal = 32768 * volume;
      FRQA = dacVal;
      FRQB = dacVal;
      waitcnt(t+=dtSample);
    }
  }
}  


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

