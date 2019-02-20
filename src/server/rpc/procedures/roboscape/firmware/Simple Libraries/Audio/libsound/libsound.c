/*
  libaudiosynth.c
  Test harness for the audiosynth library, which can launch multiple
  instances of the light blinking process.  
*/

#include "simpletools.h"                      // Library includes
#include "sound.h"

sound *audio; 

int main()                                    // Main function
{
  audio = sound_run(9, 10);
  
  print("C6, ch 0, volume = 127\n");
  sound_volume(audio, 0, 127);
  sound_note(audio, 0, C6);
  pause(1000);
  print("C6, ch 0, volume = 0\n");
  sound_volume(audio, 0, 0);
  pause(1000);
  print("C6, ch 0, volume = 64\n\n");
  sound_volume(audio, 0, 64);
  sound_note(audio, 0, C6);
  pause(1000);
  print("All f = 0\n\n");
  sound_freq(audio, 0, 0);
  pause(1000);

  print("ch 0, volume = 127\n (default for all channels)\n\n");
  sound_volume(audio, 0, 127);
  pause(1000);

  print("ch 0, f = 3000\n");
  print("ch 1, f = 3003\n");
  sound_freq(audio, 0, 3000);
  sound_freq(audio, 1, 3003);
  pause(2000);
  print("All f = 0\n\n");
  sound_freq(audio, 0, 0);
  sound_freq(audio, 1, 0);
  pause(1000);
  
  print("Ch 0\n");
  print("C6\n");
  sound_note(audio, 0, C6);
  pause(250);
  print("D6\n");
  sound_note(audio, 0, D6);
  pause(250);
  print("E6\n");
  sound_note(audio, 0, E6);
  pause(250);
  print("F6\n");
  sound_note(audio, 0, F6);
  pause(250);
  print("G6\n");
  sound_note(audio, 0, G6);
  pause(250);
  print("A6\n");
  sound_note(audio, 0, A6);
  pause(250);
  print("B6\n");
  sound_note(audio, 0, B6);
  pause(250);
  print("C6\n");
  sound_note(audio, 0, C7);
  pause(250);
  print("All f = 0\n\n");
  sound_freq(audio, 0, 0);

  pause(1000);

  print("ch0-C6, ch1-E6, ch2-G6\n");
  sound_note(audio, 0, C6);
  pause(250);
  sound_note(audio, 1, E6);
  pause(250);
  sound_note(audio, 2, G6);
  pause(250);
  print("All f = 0\n\n");
  sound_freq(audio, 0, 0);
  sound_freq(audio, 1, 0);
  sound_freq(audio, 2, 0);
  
  pause(1000);
  
  print("C6 waveforms\n");
  print("Traingle\n");
  sound_wave(audio, 0, TRIANGLE);
  sound_note(audio, 0, C6);
  pause(1000);
  sound_freq(audio, 0, 0);
  pause(1000);

  print("Square\n");
  sound_wave(audio, 0, SQUARE);
  sound_note(audio, 0, C6);
  pause(1000);
  sound_freq(audio, 0, 0);
  pause(1000);

  print("Saw\n");
  sound_wave(audio, 0, SAW);
  sound_note(audio, 0, C6);
  pause(1000);
  sound_freq(audio, 0, 0);
  pause(1000);

  print("Sine\n");
  sound_wave(audio, 0, SINE);
  sound_note(audio, 0, C6);
  pause(1000);
  print("All f = 0\n\n");
  sound_freq(audio, 0, 0);
  pause(1000);
  
  print("Sine\n");
  sound_wave(audio, 0, NOISE);
  sound_note(audio, 0, C6);
  pause(1000);
  print("All f = 0\n\n");
  // BUG noise won't turn off without first switching to a different
  //     waveform
  sound_wave(audio, 0, SINE);
  sound_freq(audio, 0, 0);
  pause(1000);
  
  // NOT IMPLEMENTED YET

  print("Chord array - not working, debugging info\n");
  print("=========================================\n");
  float chords[] = 
  { 
    BEAT_VAL, 0.25, 
    TEMPO,   100.0,
    
    CH0,      G6,     G6,     G6,   E6b, 
    HOLD0, 0.125,  0.125,  0.125,   0.5, 

    CH1,      G6,     G6,     G6,   E6b, 
    HOLD1, 0.125,  0.125,  0.125,   0.5, 

    CH2,      G6,                   E6b, 
    HOLD2, 0.375,                   0.5, 

    END 
  };
                   
  sound_playChords(audio, chords);  
}


/*

  // audio.Start
  audio = sound_run(26, AUDIO);
  
  //audio.SetWaveform(0, audio#_SINE)
  sound_wave(audio, 0, _SINE);

  //audio.setEnvelope(0, 0)
  sound_envelopeSet(audio, 0, 0);  

  //audio.SetVolume(0, 127)
  sound_volume(audio, 0, 127);

  //audio.SetFreq(0, 52510*1)       '1 kHz
  sound_freqRaw(audio, 0, 52510*2);
  
  pause(1000);
  
  sound_freqRaw(audio, 0, 52810);
  
  pause(1000);
  
  sound_volume(audio, 0, 64);
  
  pause(1000);
  
  sound_wave(audio, 0, _SQUARE);
  
  pause(1000);
  
  sound_volume(audio, 0, 0);
  
  // sound_endSound(audio, 0);
  
  while(1);

*/  

