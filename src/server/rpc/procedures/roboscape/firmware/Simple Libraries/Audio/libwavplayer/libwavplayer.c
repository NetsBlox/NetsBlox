/*
* @file libwavplayer.c
*
* @author Andy Lindsay
*
* @copyright
* Copyright (C) Parallax, Inc. 2013. All Rights MIT Licensed.
*
* @brief Project and test harness for the wavplayer library.
*/

#include "simpletools.h"
#include "wavplayer.h"

int main()                             
{
  int DO = 22, CLK = 23, DI = 24, CS = 25;
  sd_mount(DO, CLK, DI, CS);
  
  const char levels[] = {"levels.wav"};
  wav_play(levels);
  
  pause(6000);
  wav_volume(2);
  pause(6000);
  wav_volume(6); 
  pause(6000);
  wav_volume(4); 
  pause(6000);
  wav_stop();
  pause(1000);
  
  const char crazy[] = {"crazy.wav"};
  wav_play(crazy);
  while(1);
}