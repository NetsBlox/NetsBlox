/**
  @file sound.h

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
                                                                             //
#ifndef __SOUND_H
#define __SOUND_H

#ifdef __cplusplus
extern "C"
{
#endif

/*
#define PIEZO 3
#define AUDIO 0
*/

#ifndef DOXYGEN_SHOULD_SKIP_THIS

  #define SAMPLES 512
  #define PERIOD 80_000_000 / 40_000
  #define OSCILLATORS 4

  #define _SAMPLE 5
  #define _ENV 0
  #define _ATK 1
  #define _DEC 2
  #define _SUS 3
  #define _REL 4
  #define _WAV 5
  #define _O 0
  #define _A 1
  #define _D 2
  #define _S 3
  #define _R 4

#endif // DOXYGEN_SHOULD_SKIP_THIS

                                              //
#define SQUARE 0                             /// Square wave
#define SAW 1                                /// Saw wave
#define TRIANGLE 2                           /// Triangle wave
#define SINE 3                               /// Sine wave
#define NOISE 4                              /// Noise
#define INC_HZ 52.4588                        /// Value for 1 Hz

#ifndef MUSIC_NOTES
#define MUSIC_NOTES                           /// Music note list for sound library

#define REST     (float) 255                  /// Notes player rest
#define END      (float) 254                  /// Notes player end
#define BEAT_VAL (float) 253                  /// Notes player beat value
#define TEMPO    (float) 252                  /// Notes player tempo rate
#define HOLDS    (float) 251                  /// Notes player holds
#define CH0      (float) 250                  /// Notes player channel 0
#define CH1      (float) 249                  /// Notes player channel 1
#define CH2      (float) 248                  /// Notes player channel 2
#define CH3      (float) 247                  /// Notes player channel 3
#define HOLD0    (float) 246                  /// Notes player hold channel 0
#define HOLD1    (float) 245                  /// Notes player hold channel 1
#define HOLD2    (float) 244                  /// Notes player hold channel 2
#define HOLD3    (float) 243                  /// Notes player hold channel 3


#define C0        (float) 0                   /// Note C0
#define D0b       (float) 1                   /// Note D0b/C0#
#define D0        (float) 2                   /// Note D0
#define E0b       (float) 3                   /// Note E0b/E0#
#define E0        (float) 4                   /// Note E0
#define F0        (float) 5                   /// Note F0
#define G0b       (float) 6                   /// Note G0b/F0#
#define G0        (float) 7                   /// Note G0
#define A0b       (float) 8                   /// Note A0b/G0#
#define A0        (float) 9                   /// Note A0
#define B0b       (float) 10                  /// Note B0b/A0#
#define B0        (float) 11                  /// Note B0


#define C1        (float) 12                  /// Note C1
#define D1b       (float) 13                  /// Note D1b/C1#
#define D1        (float) 14                  /// Note D1
#define E1b       (float) 15                  /// Note E1b/E1#
#define E1        (float) 16                  /// Note E1
#define F1        (float) 17                  /// Note F1
#define G1b       (float) 18                  /// Note G1b/F1#
#define G1        (float) 19                  /// Note G1
#define A1b       (float) 20                  /// Note A1b/G1#
#define A1        (float) 21                  /// Note A1
#define B1b       (float) 22                  /// Note B1b/A1#
#define B1        (float) 23                  /// Note B1


#define C2        (float) 24                  /// Note C2
#define D2b       (float) 25                  /// Note D2b/C2#
#define D2        (float) 26                  /// Note D2
#define E2b       (float) 27                  /// Note E2b/E2#
#define E2        (float) 28                  /// Note E2
#define F2        (float) 29                  /// Note F2
#define G2b       (float) 30                  /// Note G2b/F2#
#define G2        (float) 31                  /// Note G2
#define A2b       (float) 32                  /// Note A2b/G2#
#define A2        (float) 33                  /// Note A2
#define B2b       (float) 34                  /// Note B2b/A2#
#define B2        (float) 35                  /// Note B2


#define C3        (float) 36                  /// Note C3
#define D3b       (float) 37                  /// Note D3b/C3#
#define D3        (float) 38                  /// Note D3
#define E3b       (float) 39                  /// Note E3b/E3#
#define E3        (float) 40                  /// Note E3
#define F3        (float) 41                  /// Note F3
#define G3b       (float) 42                  /// Note G3b/F3#
#define G3        (float) 43                  /// Note G3
#define A3b       (float) 44                  /// Note A3b/G3#
#define A3        (float) 45                  /// Note A3
#define B3b       (float) 46                  /// Note B3b/A3#
#define B3        (float) 47                  /// Note B3


#define C4        (float) 48                  /// Note C4
#define D4b       (float) 49                  /// Note D4b/C4#
#define D4        (float) 50                  /// Note D4
#define E4b       (float) 51                  /// Note E4b/E4#
#define E4        (float) 52                  /// Note E4
#define F4        (float) 53                  /// Note F4
#define G4b       (float) 54                  /// Note G4b/F4#
#define G4        (float) 55                  /// Note G4
#define A4b       (float) 56                  /// Note A4b/G4#
#define A4        (float) 57                  /// Note A4
#define B4b       (float) 58                  /// Note B4b/A4#
#define B4        (float) 59                  /// Note B4


#define C5        (float) 60                  /// Note C5
#define D5b       (float) 61                  /// Note D5b/C5#
#define D5        (float) 62                  /// Note D5
#define E5b       (float) 63                  /// Note E5b/E5#
#define E5        (float) 64                  /// Note E5
#define F5        (float) 65                  /// Note F5
#define G5b       (float) 66                  /// Note G5b/F5#
#define G5        (float) 67                  /// Note G5
#define A5b       (float) 68                  /// Note A5b/G5#
#define A5        (float) 69                  /// Note A5
#define B5b       (float) 70                  /// Note B5b/A5#
#define B5        (float) 71                  /// Note B5


#define C6        (float) 72                  /// Note C6
#define D6b       (float) 73                  /// Note D6b/C6#
#define D6        (float) 74                  /// Note D6
#define E6b       (float) 75                  /// Note E6b/E6#
#define E6        (float) 76                  /// Note E6
#define F6        (float) 77                  /// Note F6
#define G6b       (float) 78                  /// Note G6b/F6#
#define G6        (float) 79                  /// Note G6
#define A6b       (float) 80                  /// Note A6b/G6#
#define A6        (float) 81                  /// Note A6
#define B6b       (float) 82                  /// Note B6b/A6#
#define B6        (float) 83                  /// Note B6


#define C7        (float) 84                  /// Note C7
#define D7b       (float) 85                  /// Note D7b/C7#
#define D7        (float) 86                  /// Note D7
#define E7b       (float) 87                  /// Note E7b/E7#
#define E7        (float) 88                  /// Note E7
#define F7        (float) 89                  /// Note F7
#define G7b       (float) 90                  /// Note G7b/F7#
#define G7        (float) 91                  /// Note G7
#define A7b       (float) 92                  /// Note A7b/G7#
#define A7        (float) 93                  /// Note A7
#define B7b       (float) 94                  /// Note B7b/A7#
#define B7        (float) 95                  /// Note B7


#define C8        (float) 96                  /// Note C8
#define D8b       (float) 97                  /// Note D8b/C8#
#define D8        (float) 98                  /// Note D8
#define E8b       (float) 99                  /// Note E8b/E8#
#define E8        (float) 100                 /// Note E8
#define F8        (float) 101                 /// Note F8
#define G8b       (float) 102                 /// Note G8b/F8#
#define G8        (float) 103                 /// Note G8
#define A8b       (float) 104                 /// Note A8b/G8#
#define A8        (float) 105                 /// Note A8
#define B8b       (float) 106                 /// Note B8b/A8#
#define B8        (float) 107                 /// Note B8

#endif  // MUSIC_NOTES


#ifndef DOXYGEN_SHOULD_SKIP_THIS

  typedef struct audiosynthpasm_struct
  {
    volatile int osc_sample;
    volatile int osc_envelope;
    volatile int osc_attack;
    volatile int osc_decay;
    volatile int osc_sustain;
    volatile int osc_release;
    volatile int osc_waveform;
    volatile int osc_state;
    volatile int osc_target[4];     // = {0, 0, 0, 0};
    volatile int osc_vol[4];        // = {(127<<12),(127<<12),(127<<12),(127<<12)};
    volatile int osc_inc[4];        // = {0, 0, 0, 0};
    volatile int osc_acc[4];        // = {0, 0, 0, 0};
    volatile int freqtable[12];     // ={ 439638, 465780, 493477, 522820, 553909, 586846,
                                    //   621742, 658713, 697882, 739380, 783346, 829926};
    volatile int ctraval;
    volatile int pinmask;
    volatile int divVal;
    int cog;
  } sound_t;

#endif // DOXYGEN_SHOULD_SKIP_THIS

typedef sound_t sound;                        /// Sound process ID & pointer


/**
  @brief start a talk process, uses a cog.

  @param pin An I/O pin to deliver signals.  Use -1 if you don't want
  to use this I/O pin.

  @param npin An I/O pin to deliver the opposite of the pin signals.
  This is useful for differential signaling or sound over two headphone
  channels.  Use -1 if you don't want to use this I/O pin.

  @returns A pointer to the talk process info for use as a process ID
  in other function calls.
*/
sound_t *sound_run(int pin, int npin);


/**
  @brief stop a talk process and recover a cog.

  @param *device The pointer returned by talk_start that indicates
  which talk process is to be stopped.
*/
void sound_end(sound_t *device);

/**
  @brief Set volume for one of the sound process' four channels

  @param *device Sound process ID, the pointer to the sound process
  info returned by sound_run.

  @param channel 0, 1, 2, or 3.

  @param volume 0 to 127.
*/
void sound_volume(sound_t *device, int channel, int volume);

/**
  @brief Make one of the sound process' four channels play a note.

  @param *device Sound process ID, the pointer to the sound process
  info returned by sound_run.

  @param channel 0, 1, 2, or 3.

  @param note From C0 (0) to B8 (107), append with b for flat notes.
*/
void sound_note(sound_t *device, int channel, int note);

/**
  @brief Set the waveform of one of the process' four channels

  @param *device Sound process ID, the pointer to the sound process
  info returned by sound_run.

  @param channel 0, 1, 2, or 3.

  @param wave SQARE, SAW, TRIANGLE, SINE, or NOISE.
*/
void sound_wave(sound_t *device, int channel, int wave);

/**
  @brief Set Hz the frequency transmitted by one of the sound process'
  four channels.

  @param *device Sound process ID, the pointer to the sound process
  info returned by sound_run.

  @param channel 0, 1, 2, or 3.

  @param freq Hz from 1 to 20 k.

  @returns
*/
void sound_freq(sound_t *device, int channel, int freq);


#ifndef DOXYGEN_SHOULD_SKIP_THIS

  void sound_freqRaw(sound_t *device, int channel, int value);

  void sound_adsr(sound_t *device, int channel, int attack,  int decay,
                                                int sustain, int release);
  void sound_envelopeSet(sound_t *device, int channel, int value);
  void sound_envelopeStart(sound_t *device, int channel, int enable);

  void sound_playChords(sound_t *device, float *chords);

  void replace_byte(int *address, int intOffset, int byteOffset, int newVal);
  void sound_param(sound_t *device, int type, int channel, int value);
  void sound_loadPatch(sound_t *device, int *patchAddr);
  void sound_sampleSet(sound_t *device, int value);

  void sound_playSound(sound_t *device, int channel, int value);
  void sound_endSound(sound_t *device, int channel);
  void sound_endAllSound(sound_t *device);

#endif // DOXYGEN_SHOULD_SKIP_THIS

#ifdef __cplusplus
}
#endif
/* __cplusplus */
#endif
/* __SOUND_H */


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

