#include "melody.h"
#include "simpletools.h"

enum {
    PIEZO_SPEAKER_PIN = 2,
};

#define ARRAY_SIZE(x) (sizeof((x)) / sizeof((x)[0]))

// define notes


// helmholtz system
#define c 261
#define d 294
#define e 329
#define f 349
#define g 392
#define a 440
#define b 493
#define A 440
#define B 494
#define C 523
#define D 587
#define E 659
#define F 698
#define G 784
#define R 0

// scientific system
#define B0  31
#define C1  33
#define CS1 35
#define D1  37
#define DS1 39
#define E1  41
#define F1  44
#define FS1 46
#define G1  49
#define GS1 52
#define A1  55
#define AS1 58
#define B1  62
#define C2  65
#define CS2 69
#define D2  73
#define DS2 78
#define E2  82
#define F2  87
#define FS2 93
#define G2  98
#define GS2 104
#define A2  110
#define AS2 117
#define B2  123
#define C3  131
#define CS3 139
#define D3  147
#define DS3 156
#define E3  165
#define F3  175
#define FS3 185
#define G3  196
#define GS3 208
#define A3  220
#define AS3 233
#define B3  247
#define C4  262
#define CS4 277
#define D4  294
#define DS4 311
#define E4  330
#define F4  349
#define FS4 370
#define G4  392
#define GS4 415
#define A4  440
#define AS4 466
#define B4  494
#define C5  523
#define CS5 554
#define D5  587
#define DS5 622
#define E5  659
#define F5  698
#define FS5 740
#define G5  784
#define GS5 831
#define A5  880
#define AS5 932
#define B5  988
#define C6  1047
#define CS6 1109
#define D6  1175
#define DS6 1245
#define E6  1319
#define F6  1397
#define FS6 1480
#define G6  1568
#define GS6 1661
#define A6  1760
#define AS6 1865
#define B6  1976
#define C7  2093
#define CS7 2217
#define D7  2349
#define DS7 2489
#define E7  2637
#define F7  2794
#define FS7 2960
#define G7  3136
#define GS7 3322
#define A7  3520
#define AS7 3729
#define B7  3951
#define C8  4186
#define CS8 4435
#define D8  4699
#define DS8 4978

//Mario main theme melody
int mario_melody[] = {
    E7, E7, 0, E7,
    0, C7, E7, 0,
    G7, 0, 0,  0,
    G6, 0, 0, 0,

    C7, 0, 0, G6,
    0, 0, E6, 0,
    0, A6, 0, B6,
    0, AS6, A6, 0,

    G6, E7, G7,
    A7, 0, F7, G7,
    0, E7, 0, C7,
    D7, B6, 0, 0,

    C7, 0, 0, G6,
    0, 0, E6, 0,
    0, A6, 0, B6,
    0, AS6, A6, 0,

    G6, E7, G7,
    A7, 0, F7, G7,
    0, E7, 0, C7,
    D7, B6, 0, 0
};
//Mario main them tempo
int mario_tempo[] = {
    12, 12, 12, 12,
    12, 12, 12, 12,
    12, 12, 12, 12,
    12, 12, 12, 12,

    12, 12, 12, 12,
    12, 12, 12, 12,
    12, 12, 12, 12,
    12, 12, 12, 12,

    9, 9, 9,
    12, 12, 12, 12,
    12, 12, 12, 12,
    12, 12, 12, 12,

    12, 12, 12, 12,
    12, 12, 12, 12,
    12, 12, 12, 12,
    12, 12, 12, 12,

    9, 9, 9,
    12, 12, 12, 12,
    12, 12, 12, 12,
    12, 12, 12, 12,
};

//Underworld melody
int underworld_melody[] = {
    C4, C5, A3, A4,
    AS3, AS4, 0,
    0,
    C4, C5, A3, A4,
    AS3, AS4, 0,
    0,
    F3, F4, D3, D4,
    DS3, DS4, 0,
    0,
    F3, F4, D3, D4,
    DS3, DS4, 0,
    0, DS4, CS4, D4,
    CS4, DS4,
    DS4, GS3,
    G3, CS4,
    C4, FS4, F4, E3, AS4, A4,
    GS4, DS4, B3,
    AS3, A3, GS3,
    0, 0, 0
};
//Underwolrd tempo
int underworld_tempo[] = {
    12, 12, 12, 12,
    12, 12, 6,
    3,
    12, 12, 12, 12,
    12, 12, 6,
    3,
    12, 12, 12, 12,
    12, 12, 6,
    3,
    12, 12, 12, 12,
    12, 12, 6,
    6, 18, 18, 18,
    6, 6,
    6, 6,
    6, 6,
    18, 18, 18, 18, 18, 18,
    10, 10, 10,
    10, 10, 10,
    3, 3, 3
};

int music1_melody[] = { C, b, g, C, b, e};
int music1_beats[] = { 16, 16, 16,  8,  8,  16};

int music2_melody[] = { C, b, g, C, b, e, R, C, c, g, a, C, R };
int music2_beats[] = { 16, 16, 16,  8,  8,  16, 32, 16, 16, 16, 8, 8, 8 };

void play_melody(int melody[], int beats[], int length)
{
    long tempo = 10;
    // Initialize core variables
    int tone_ = 0;
    int beat = 0;
    long duration  = 0;

    for (int i=0; i<length; i++) {
        tone_ = melody[i];
        beat = beats[i];
        duration = beat * tempo; // Set up timing
        print("buzzing freq %d, duration %d, notenumber %d/%d\n", tone_, duration, i, length);
        freqout(PIEZO_SPEAKER_PIN, duration, tone_);
        // A pause between notes...
        int delayTime = duration * 0.3;
        pause(delayTime);
    }

    print("finished playing melody\n");
    freqout(PIEZO_SPEAKER_PIN, 0, 100);
}


void play_mario()
{
    print("playing mario\n");
    play_melody(mario_melody, mario_tempo, ARRAY_SIZE(mario_melody));
}

void play_music1()
{
    print("playing music1\n");
    play_melody(music1_melody, music1_beats, ARRAY_SIZE(music1_melody));

}

void play_underworld()
{
    print("playing music1\n");
    play_melody(underworld_melody, underworld_tempo, ARRAY_SIZE(underworld_melody));
}

