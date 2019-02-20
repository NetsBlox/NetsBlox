/**
 * @file wavplayer.h
 *
 * @author Andy Lindsay
 *
 * @copyright
 * Copyright (C) Parallax Inc. 2012. All Rights MIT Licensed.
 *
 * @brief Plays 16-bit, 32ksps, mono .wav files in the root directory 
 * of a microSD card.
 *
 * @par Core Usage
 * sd_mount - 1, wav_play - 2.
 * @n The wav_play function only uses 2 cores while a file is playing, and stops
 * them again when the file ends, playback stops, or to start playing a different
 * file. 
 *
 * @par Memory Models
 * Use with CMM or LMM. 
 *
 * @version v0.90 
 * @li Clicks between tracks removed
 * @li Bug that prevented later tracks in a sequence from being played 
 * is fixed 
 *
 * @par Help Improve this Library
 * Please submit bug reports, suggestions, and improvements to this code to
 * editor@parallax.com.
 */
 
 
#ifndef WAVPLAYER_H
#define WAVPLAYER_H

#if defined(__cplusplus)
extern "C" {
#endif

/**
 * @brief Play a .wav file.
 *
 * @param wavFilename Pointer to character array with filename.
 */
void wav_play(const char* wavFilename);

/**
 * @brief Check if wav file is currently playing.
 *
 * @returns 1 if playing, 0 if not.
 */
int wav_playing();

/**
 * @brief Set wav play volume 0 to 10.  0 is lowest, 10 is highest.
 *
 * @param vol wav playback volume.
 */
void wav_volume(int vol);

/**
 * @brief Stop wav file reading but leave audio output open so that you 
 * can play another track without a click at the start.  Recommended 
 * over wav_close unless your application needs to recover both the wav 
 * reading and audio output cogs for other uses.
 */
void wav_stop(void);

/**
 * @brief Stop wav file reading and close audio output.  Only recommended
 * if your application needs to recover two cogs for other purposes.  
 * Otherwise, use wave_stop.  It will stop the cog that reads the wav
 * file, but leave the audio output cog open, which will prevent a click
 * at the start of the next track your application plays.
 */ 
void wav_close(void);


#if defined(__cplusplus)
}
#endif
/* __cplusplus */  
#endif
/* WAVPLAYER_H */  

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

