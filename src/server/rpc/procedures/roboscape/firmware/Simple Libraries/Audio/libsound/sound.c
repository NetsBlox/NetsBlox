/*
  @file sound.c
  
  @author Parallax Inc.
  
  @brief Functions for creating tones.  4 channels, tone waveform
  options include sine, square, triangle, and saw.  Incorporates 
  Spin to C translation of sound components from Brett Weir's 
  LameStation package.
 
  @version 0.5 

  @copyright
  Copyright (c) Parallax Inc 2015. All rights MIT licensed;
                see end of file.
*/  
#include "simpletools.h"
#include "sound.h"

void replace_byte(int *address, int intOffset, int byteOffset, int newVal);
void sound_config(sound_t *device);

/*
sound_t *sound_run(int pin)
{
  int inputType = PIEZO;
  //int inputType = AUDIO;
  sound_t *device;
  device = (void *) malloc(sizeof(sound_t));
  sound_config(device, inputType);

  device->ctraval = (0b00110 << 26) | pin;
  device->pinmask = 1 << pin;

  if((pin == 26) | (pin == 27)) device->divVal = 5; 
  else device->divVal  = 5 - inputType;

  if(device->cog == 0)
  {
    extern int binary_audiosynth_dat_start[];
    device->cog = 1 + cognew((void*)binary_audiosynth_dat_start, (void*)device);
  }
  return device;
}
*/

sound_t *sound_run(int pin, int pin2)
{
  sound_t *device;
  device = (void *) malloc(sizeof(sound_t));
  sound_config(device);
  
  if(pin == -1 || pin2 == -1)
  {
    device->ctraval = (0b00110 << 26);
    if(pin != -1)
    {
      device->ctraval |= pin;
      device->pinmask = 1 << pin;
    }      
    else if(pin2 != -1)
    {
      device->ctraval |= pin2;
      device->pinmask = 1 << pin2;
    }      
  }
  else
  {
    device->ctraval = (0b00111 << 26) | pin | (pin2 << 9);
    device->pinmask = (1 << pin) | (1 << pin2);
  }    

  device->divVal  = 2;

  if(device->cog == 0)
  {
    extern int binary_audiosynth_dat_start[];
    device->cog = 1 + cognew((void*)binary_audiosynth_dat_start, (void*)device);
  }
  return device;
}

void sound_config(sound_t *device)
{
  device->osc_sample = 0;
  //device->osc_envelope = 0x01010101;
  device->osc_envelope = 0x00000000;
  device->osc_attack = 0x7f7f7f7f;
  device->osc_decay = 0;
  device->osc_sustain = 0;
  device->osc_release = 0;
  device->osc_waveform = 0x03030303;
  device->osc_state = 0;

  device->osc_target[0] = 0;
  device->osc_target[1] = 0;
  device->osc_target[2] = 0;
  device->osc_target[3] = 0;
  
  device->osc_vol[0] = (127<<12);
  device->osc_vol[1] = (127<<12);
  device->osc_vol[2] = (127<<12);
  device->osc_vol[3] = (127<<12);
  
  device->osc_inc[0] = 0;
  device->osc_inc[1] = 0;
  device->osc_inc[2] = 0;
  device->osc_inc[3] = 0;
  
  device->osc_acc[0] = 0;
  device->osc_acc[1] = 0;
  device->osc_acc[2] = 0;
  device->osc_acc[3] = 0;
  
  device->freqtable[0]       =    439638; // C
  device->freqtable[1]       =    465780; // Db
  device->freqtable[2]       =    493477; // D
  device->freqtable[3]       =    522820; // Eb
  device->freqtable[4]       =    553909; // E
  device->freqtable[5]       =    586846; // F
  device->freqtable[6]       =    621742; // Gb
  device->freqtable[7]       =    658713; // G
  device->freqtable[8]       =    697882; // Ab
  device->freqtable[9]       =    739380; // A
  device->freqtable[10]      =    783346; // Bb
  device->freqtable[11]      =    829926; // B  
}  

void sound_end(sound_t *device)
{
  if(device->cog > 0)
  {
    cogstop(device->cog - 1);
    device->cog = 0;
    free(device);
  }  
}

void sound_volume(sound_t *device, int channel, int value)
{
  device->osc_vol[channel] = value << 12;
}

void sound_note(sound_t *device, int channel, int value)
{
  device->osc_inc[channel] = device->freqtable[value%12] >> (9-value/12);
}

void sound_freq(sound_t *device, int channel, int Hz)
{
  // 2^21 / 40 k = 52.4288
  device->osc_inc[channel] = (int) ((float)Hz * 52.4288);
}
 
void sound_playChords(sound_t *device, float *chords)
{
  float  beatVal, tempo, tFullNote, msBeat;
  float *hold0 = 0, *ch0 = 0, 
        *hold1 = 0, *ch1 = 0, 
        *hold2 = 0, *ch2 = 0,
        *hold3 = 0, *ch3 = 0, 
        *end; 
  //int  t, i = 0, j = 0;
  int  i = 0;
  while(1)
  {
    //print("i = %d\n", i);
    if(chords[i] == BEAT_VAL)  
    {
      i++;
      beatVal = chords[i];
      //print("beatVal = %f\n", beatVal);
    }
    else if(chords[i] == TEMPO)
    {
      i++;
      tempo = chords[i];
      msBeat = 60000.0 / tempo;
      tFullNote = msBeat / beatVal;        
      //print("tempo = %f\n", tempo);
    }
    else if(chords[i] == HOLD0)
    {
        hold0 = &chords[i];
        i++;
        //print("hold0 = %d\n", hold0);
    }
    else if(chords[i] == HOLD1)
    {
      hold1 = &chords[i];
      i++;
      //print("hold1 = %d\n", hold1);
    }
    else if(chords[i] == HOLD2)
    {
      hold2 = &chords[i];
      i++;
      //print("hold2 = %d\n", hold2);
    }
    else if(chords[i] == HOLD3)
    {
      hold3 = &chords[i];
      i++;
      //print("hold3 = %d\n", hold3);
    }
    else if(chords[i] == CH0)
    {
      ch0 = &chords[i];
      i++;
      //print("ch0 = %d\n", ch0);
    }
    else if(chords[i] == CH1)
    {
      ch1 = &chords[i];
      i++;
      //print("ch1 = %d\n", ch1);
    }
    else if(chords[i] == CH2)
    {
      ch2 = &chords[i];
      i++;
      //print("ch2 = %d\n", ch2);
    }
    else if(chords[i] == CH3)
    {
      ch3 = &chords[i];
      i++;
      //print("ch3 = %d\n", ch3);
    }
    else if(chords[i] == END)
    {
      end = &chords[i];
      i++;
      //print("end = %d\n", end);
      break;
    } 
    i++;
  }
  
  /*
  dt = (int)(msBeat / 128.0);
  dt *= (clkfreq/1000);
  t = CNT; 
  while(1)
  {
    
    print("j = %d\n", j);
    t = (tFullNote / (int) holds[j]);
    print("t = %d\n", t);
    if(ch0 != 0)
    {
      //sound_note(device, 0, ch0[j]);
      sound_playSound(device, 0, ch0[j]);
      print("ch0[%d] = %d\n", j, ch0[j]);
    }      
    if(ch1 != 0)
    {
      //sound_note(device, 1, ch1[j]);
      sound_playSound(device, 1, ch1[j]);
      print("ch1[%d] = %d\n", j, ch1[j]);
    }      
    if(ch2 != 0)
    {
      //sound_note(device, 2, ch2[j]);
      sound_playSound(device, 2, ch2[j]);
      print("ch2[%d] = %d\n", j, ch2[j]);
    }      
    if(ch3 != 0)
    {
      //sound_note(device, 3, ch3[j]);
      sound_playSound(device, 3, ch3[j]);
      print("ch3[%d] = %d\n", j, ch3[j]);
    }      
    pause(t);
    //sound_freq(device, 0, 0);
    //sound_freq(device, 1, 0);
    //sound_freq(device, 2, 0);
    //sound_freq(device, 3, 0);
  }
  for(int k = 0; k < 4; k++)
  {
    sound_freq(device, k, 0);
  }
  */
}  

void sound_freqRaw(sound_t *device, int channel, int value)
{
  device->osc_inc[channel] = value;
}

/*
PUB SetParam(channel, type, value)

    byte[@osc_envelope[type]][channel] := value
*/
/*
void replace_byte(sound_t *device, int channel, int type, int value)
{
  int temp = device->osc_envelope[type];
  int nmask = ~(0xFF << (8*channel));
  temp &= nmask;
  value &= 0xFF;
  temp |= value << (8*channel);
  device->osc_envelope[type] = temp;
}
*/
void replace_byte(int *address, int intOffset, int byteOffset, int newVal)
{
  int temp = address[intOffset];
  int nmask = ~(0xFF << (8*byteOffset));
  temp &= nmask;
  newVal &= 0xFF;
  temp |= (newVal << (8*byteOffset));
  address[intOffset] = temp;
}
  
void sound_param(sound_t *device, int type, int channel, int value)
{
  replace_byte(&(device->osc_envelope), type, channel, value);
}

/*    
PUB SetADSR(channel, attackvar, decayvar, sustainvar, releasevar)
    
    osc_attack.byte[channel]  := attackvar
    osc_decay.byte[channel]   := decayvar
    osc_sustain.byte[channel] := sustainvar
    osc_release.byte[channel] := releasevar
*/

void sound_adsr(sound_t *device, int channel, int attack,  int decay, 
                                              int sustain, int release)
{
  replace_byte(&(device->osc_attack), 0, channel, attack);
  replace_byte(&(device->osc_decay), 0, channel, decay);
  replace_byte(&(device->osc_sustain), 0, channel, sustain);
  replace_byte(&(device->osc_release), 0, channel, release);
}  

/*    
PUB LoadPatch(patchAddr) | i, j, t, c

    c := byte[patchAddr] & $F
        
    repeat j from 0 to 3
        if c & $1
            SetEnvelope(j,1)
            t := patchAddr + 1
            repeat i from _ATK to _WAV
                SetParam(j, i, byte[t++])
        c >>= 1
*/
void sound_loadPatch(sound_t *device, int *patchAddr)
{
  
}  

/*    
PUB SetWaveform(channel, value)
    
    osc_waveform.byte[channel] := value
*/
void sound_wave(sound_t *device, int channel, int value)
{
  replace_byte(&(device->osc_waveform), 0, channel, value);
}



/*    
PUB SetEnvelope(channel, value)
   
    osc_envelope.byte[channel] &= constant(!1)
    if value
        osc_envelope.byte[channel] |= 1
*/
void sound_envelopeSet(sound_t *device, int channel, int value)
{
  int temp = device->osc_envelope;
  int mask = ~(1<<(8*channel));
  temp &= mask;
  if(value) temp |= (1<<(8*channel));
  device->osc_envelope = temp; 
}


/*    
PUB StartEnvelope(channel, enable)
    osc_envelope.byte[channel] &= constant(!2)
    if enable
        osc_envelope.byte[channel] |= 2
    osc_envelope.byte[channel] |= 4
    osc_envelope.byte[channel] &= !4
*/
void sound_envelopeStart(sound_t *device, int channel, int enable)
{
  int temp = device->osc_envelope;
  int mask = ~(2<<(8*channel));
  temp &= mask;
  if(enable) temp |= (2<<(8*channel));
  temp |= (4<<(8*channel));
  temp &= ~(4<<(8*channel));
  device->osc_envelope = temp; 
}


/* 
PUB SetSample(value)
    
    osc_sample := value
*/
void sound_sampleSet(sound_t *device, int value)
{
  device->osc_sample = value;
}


/*
PUB PlaySound(channel, value)
    
    SetEnvelope(channel, 1)
    StartEnvelope(channel, 1)
    SetNote(channel, value)
*/
void sound_playSound(sound_t *device, int channel, int value)
{
  sound_envelopeSet(device, channel, 1);
  sound_envelopeStart(device, channel, 1);
  sound_note(device, channel, value);
}



/*
PUB StopSound(channel)
    
    StartEnvelope(channel, 0)
*/
void sound_endSound(sound_t *device, int channel)
{
  sound_envelopeStart(device, channel, 1);
}


/*    
PUB StopAllSound | i

    repeat i from 0 to 3
        StopSound(i)
*/        
void sound_endAllSound(sound_t *device)
{
  for(int channel = 0; channel < 4; channel++)
    sound_endSound(device, channel);
}


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

