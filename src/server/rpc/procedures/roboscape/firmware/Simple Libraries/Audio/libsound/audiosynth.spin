' LameAudio Synthesizer
' -------------------------------------------------
' Version: 1.0
' Copyright (c) 2013-2014 LameStation LLC
' See end of file for terms of use.
' 
' Authors: Brett Weir
' Modified by Andy Lindsay: DAC PWM -> pulse density, pin configurable,
'                           differential option, C compatible
'                           
' -------------------------------------------------

CON
    SAMPLES     = 512                                                           ' samples per cycle
    PERIOD      = 80_000_000 / 40_000                                           ' clkfreq / sample rate
    OSCILLATORS = 4                                                             ' hardcoded oscillators used by synthesizer

    #0, _SQUARE, _SAW, _TRIANGLE, _SINE, _NOISE, _SAMPLE                        ' waveform options
    #0, _ENV, _ATK, _DEC, _SUS, _REL, _WAV
    #0, _O, _A, _D, _S, _R
    'AUDIO       = 27
    'AUDIO2      = 26


VAR
    long    osc_sample         '0

    long    osc_envelope       '$01010101 
    long    osc_attack         '$7F7F7F7F
    long    osc_decay          '0
    long    osc_sustain        '$7F7F7F7F
    long    osc_release        '0
    long    osc_waveform       '0

    long    osc_state          '0
    
    long    osc_target[4]      '0[4]
    long    osc_vol[4]         '(127<<12)[4]
    
    long    osc_inc[4]         '0[4]
    long    osc_acc[4]         '0[4]    
  
    long    freqtable[12]       '439638, 465780, 493477, 522820, 553909, 586846      ' precalculated frequency constants
                                '621742, 658713, 697882, 739380, 783346, 829926      ' see frequencytiming

PUB null
   
PUB Start
    osc_sample      :=    0

    osc_envelope    :=    $01010101 
    osc_attack      :=    $7F7F7F7F
    osc_decay       :=    0
    osc_sustain     :=    $7F7F7F7F
    osc_release     :=    0
    osc_waveform    :=    0

    osc_state       :=    0
    
    osc_target[0]   :=    0
    osc_target[1]   :=    0
    osc_target[2]   :=    0
    osc_target[3]   :=    0
    
    osc_vol[0]      :=    (127<<12)
    osc_vol[1]      :=    (127<<12)
    osc_vol[2]      :=    (127<<12)
    osc_vol[3]      :=    (127<<12)
    
    osc_inc[0]         :=    0
    osc_inc[1]         :=    0
    osc_inc[2]         :=    0
    osc_inc[3]         :=    0

    osc_acc[0]         :=    0    
    osc_acc[1]         :=    0    
    osc_acc[2]         :=    0    
    osc_acc[3]         :=    0    
  
    freqtable[0]       :=    439638
    freqtable[1]       :=    465780
    freqtable[2]       :=    493477
    freqtable[3]       :=    522820
    freqtable[4]       :=    553909
    freqtable[5]       :=    586846      ' precalculated frequency constants
    freqtable[6]       :=    621742
    freqtable[7]       :=    658713
    freqtable[8]       :=    697882
    freqtable[9]       :=    739380
    freqtable[10]      :=    783346
    freqtable[11]      :=    829926      ' see frequencytiming
    
    cognew(@entry, @osc_sample)    'start assembly cog
    
PUB SetVolume(channel, value)
    
    osc_vol[channel] := value << 12
    
PUB SetNote(channel, value)
    
    osc_inc[channel] := freqtable[value//12] >> (9 - value/12)
    
PUB SetFreq(channel, value)
    
    osc_inc[channel] := value

PUB SetParam(channel, type, value)

    byte[@osc_envelope[type]][channel] := value
    
PUB SetADSR(channel, attackvar, decayvar, sustainvar, releasevar)
    
    osc_attack.byte[channel] := attackvar
    osc_decay.byte[channel] := decayvar
    osc_sustain.byte[channel] := sustainvar
    osc_release.byte[channel] := releasevar
    
PUB LoadPatch(patchAddr) | i, j, t, c

    c := byte[patchAddr] & $F
        
    repeat j from 0 to 3
        if c & $1
            SetEnvelope(j,1)
            t := patchAddr + 1
            repeat i from _ATK to _WAV
                SetParam(j, i, byte[t++])
        c >>= 1
    
PUB SetWaveform(channel, value)
    
    osc_waveform.byte[channel] := value
    
PUB SetEnvelope(channel, value)
   
    osc_envelope.byte[channel] &= constant(!1)
    if value
        osc_envelope.byte[channel] |= 1
    
PUB StartEnvelope(channel, enable)
    osc_envelope.byte[channel] &= constant(!2)
    if enable
        osc_envelope.byte[channel] |= 2
    osc_envelope.byte[channel] |= 4
    osc_envelope.byte[channel] &= !4
 
PUB SetSample(value)
    
    osc_sample := value

PUB PlaySound(channel, value)
    
    SetEnvelope(channel, 1)
    StartEnvelope(channel, 1)
    SetNote(channel, value)

PUB StopSound(channel)
    
    StartEnvelope(channel, 0)
    
PUB StopAllSound | i

    repeat i from 0 to 3
        StopSound(i)
        
DAT
                        org
' ---------------------------------------------------------------
' Setup
' ---------------------------------------------------------------
entry                  '{
                        mov      addr, par
                        add      addr, #144
                        rdlong   ctraval, addr
                        add      addr, #4
                        rdlong   diraval, addr
                        add      addr, #4
                        rdlong   divVal, addr
                       '}                        
                        or      dira, diraval                               ' set APIN to output
                        mov     ctra, ctraval                               ' establish counter A mode and APIN
                        'mov     ctrb, ctrbval                              ' establish counter A mode and APIN
                        'mov     frqa, #1                                   ' set counter to increment 1 each cycle

                        mov     time, cnt                                   ' record current time
                        add     time, periodval                             ' establish next period
                     
                        mov     t1, par                                     ' get parameter address
                        mov     addr_sample, t1                             ' get sample address
                        add     t1, #4

                        mov     addr_env, t1                                ' envelope address
                        add     t1, #4
                        mov     addr_atk, t1                                ' attack address
                        add     t1, #4
                        mov     addr_dec, t1                                ' decay address
                        add     t1, #4
                        mov     addr_sus, t1                                ' sustain address
                        add     t1, #4
                        mov     addr_rel, t1                                ' release address
                        add     t1, #4
                        mov     addr_wav, t1                                ' waveform address
                        add     t1, #4
                        
                        mov     addr_state, t1                              ' adsr state address
                        add     t1, #4
                        
                        mov     addr_voltgt, t1                             ' volume target address
                        add     t1, #16
                        mov     addr_vol, t1                                ' volume address
                        add     t1, #16
                        
                        mov     addr_inc, t1                                ' phase inc address
                        add     t1, #16
                        mov     addr_acc, t1                                ' phase acc address
                        
' ---------------------------------------------------------------
' Main Loop
' ---------------------------------------------------------------
loop_main               waitcnt time, periodval                             ' wait until next period
                        shl     out_main, #21
                        mov     frqa, out_main                              ' back up phsa so that it trips "value cycles from now
                        'mov     frqb, out_main                              ' back up phsa so that it trips "value cycles from now
    
                        mov     out_main, #0                                ' zero out out_main long
                        mov     index, #OSCILLATORS                         ' count number of oscillators
                        
                        rdlong  ptr_env, addr_env
                        rdlong  ptr_atk, addr_atk
                        rdlong  ptr_dec, addr_dec
                        rdlong  ptr_sus, addr_sus
                        rdlong  ptr_rel, addr_rel
                        rdlong  ptr_wav, addr_wav
                        
                        mov     ptr_state, addr_state
                        
                        mov     ptr_voltgt, addr_voltgt
                        mov     ptr_vol, addr_vol
                        
                        mov     ptr_inc, addr_inc
                        mov     ptr_acc, addr_acc
                        
loop_channel            call    #routine_adsr
                        call    #routine_phase
                        call    #routine_waveform
                        call    #routine_amplitude
                        
                        shr     ptr_env, #8
                        shr     ptr_atk, #8
                        shr     ptr_dec, #8
                        shr     ptr_sus, #8
                        shr     ptr_rel, #8
                        shr     ptr_wav, #8
                        
                        add     ptr_state, #1
                        
                        add     ptr_voltgt, #4
                        add     ptr_vol, #4
                        
                        add     ptr_inc, #4
                        add     ptr_acc, #4
    
                        djnz    index, #loop_channel

                        adds    out_main, outputoffset                      ' Add DC offset for output to PWM
                        jmp     #loop_main
                        
                       
' ---------------------------------------------------------------
' ADSR Envelope
' ---------------------------------------------------------------    
routine_adsr            rdbyte  state, ptr_state
                        mov     envelope, ptr_env
                        test    envelope, #1        wz ' envelope on
                if_nz   jmp     #:adsr_on
' ---------------------------------------------------------------
:adsr_off               rdlong  volume, ptr_vol
                        
                        jmp     #routine_adsr_ret
' ---------------------------------------------------------------                          
:adsr_on                test    envelope, #4        wz
            if_nz       jmp     #:state_O
    
                        test    envelope, #2        wz

                        mov     volinc, #10                                 ' needed for volinc calculation.
                        
            if_z        jmp     #:state_R
            if_nz       jmp     #:state_A
' ``````````````````````````````````````````````````````````````` 
:state_O                mov     voltarget, #0
                        mov     volume, #0
                        mov     volinc, #0
                        
                        jmp     #:adsr_write
' ``````````````````````````````````````````````````````````````` 
:state_A                mov     voltarget, #127
                        shl     voltarget, #12
                        
                        mov     t1, ptr_atk                                 ' read attack
                        and     t1, #$7F
                        shr     t1, #3
                        shl     volinc, t1
                        
                        jmp     #:adsr_trackup
' ```````````````````````````````````````````````````````````````
:state_R                mov     voltarget, #0
                        
                        mov     t1, ptr_rel                                 ' read release
                        and     t1, #$7F
                        shr     t1, #4
                        mov     t2, #8 
                        sub     t2, t1
                        shl     volinc, t2
                        
                        jmp     #:adsr_trackdown
' ---------------------------------------------------------------
:adsr_trackup           rdlong  volume, ptr_vol                             ' get volume parameters
                        cmps    volume, voltarget           wc, wz
            if_b        adds    volume, volinc                              ' if volume < target    volume += osc_volinc
            if_ae       mov     volume, voltarget
            if_ae       mov     state, #_S
            
                        jmp     #:adsr_write
                        
:adsr_trackdown         rdlong  volume, ptr_vol                             ' get volume parameters
                        cmps    volume, voltarget           wc, wz          ' track downwards
            if_a        subs    volume, volinc                              ' if volume > target    volume -= osc_volinc
            if_be       mov     volume, voltarget
' ---------------------------------------------------------------
:adsr_write             wrlong  volume, ptr_vol
                        rdbyte  state, ptr_state
routine_adsr_ret        ret

' ---------------------------------------------------------------                         
' Phase Accumulator
' --------------------------------------------------------------- 
routine_phase           rdlong  t1, ptr_inc                                 ' Update phase increment with new frequency
                        
                        rdlong  phase, ptr_acc                              ' Add phase increment to accumulator of oscillator
                        add     phase, t1
                        wrlong  phase, ptr_acc

                        shr     phase, #12                                  ' shift and truncate phase to 512 samples
                        and     phase, #$1FF
                        
routine_phase_ret       ret

' --------------------------------------------------------------- 
' Waveform Generator
' --------------------------------------------------------------- 
routine_waveform        mov     t1, ptr_wav
                        and     t1, #$FF

                        add     $+2, t1                                     ' jumps to the appropriate waveform handler
                        nop
                        jmpret  $, $+1                                      ' see "Here Symbol" in Propeller Manual

                        long    :squarewave, :rampwave,   :triwave
                        long    :sinewave,   :whitenoise, :sample
' ```````````````````````````````````````````````````````````````
:squarewave             cmp     phase, #256                 wc              ' if square wave, compare truncated phase with 128
                        negnc   out_osc, #128                               ' (half the height of 8 bits) and scale
                                                                            ' 
                        jmp     #:oscOutput
' ``````````````````````````````````````````````````````````````` 
:rampwave               mov     out_osc, phase                              ' if ramp wave, fit the truncated phase accumulator into
                        subs    out_osc, #256                               ' the proper 8-bit scaling and output as waveform
                        sar     out_osc, #1
                        
                        jmp     #:oscOutput
' ```````````````````````````````````````````````````````````````
:triwave                cmp     phase, #256                 wc              ' if triangle wave, double the amplitude of a square
if_c                    mov     out_osc, phase                              ' wave and add truncated phase for first half, and
if_nc                   mov     out_osc, #511                               ' subtract truncated phase for second half of cycle
if_nc                   subs    out_osc, phase
                        subs    out_osc, #128
                        
                        jmp     #:oscOutput
' ```````````````````````````````````````````````````````````````
:sinewave               mov     t1, phase                                   ' if sine wave, use truncated phase to read values
                        and     t1, #$FF                                    ' from sine table in main memory.  This requires
                        cmp     t1, #128                    wc              ' the most time to complete, with the exception
if_nc                   xor     t1, #$FF                                    ' of noise generation
                        and     t1, #$7F

                        shl     t1, #5
                        add     t1, sineAddr
                        rdword  out_osc, t1
                        shr     out_osc, #9

                        cmp     phase, #256                 wc              
if_nc                   neg     out_osc, out_osc

                        jmp     #:oscOutput
' ```````````````````````````````````````````````````````````````
:whitenoise             sar     rand, #1                                    ' pseudo-random number generator truncated to 8 bits.
                        mov     t1, rand
                        and     t1, #$FF
                        mov     t2, t1
                        shl     t2, #2
                        xor     t2, t1
                        shl     t2, #24
                        add     rand, t2

                        mov     out_osc, rand
                        and     out_osc, #$FF

                        jmp     #:oscOutput
' ```````````````````````````````````````````````````````````````
:sample                 rdword  t1, addr_sample
                        add     t1, phase
                        rdbyte  out_osc, t1
                        subs    out_osc, #128
' ```````````````````````````````````````````````````````````````
:oscOutput
routine_waveform_ret    ret 

' ---------------------------------------------------------------    
' Amplitude
' ---------------------------------------------------------------
routine_amplitude       mov     t1, out_osc
                        mov     t2, volume
                        call    #routine_multiply                           ' result is in tr
                        adds    out_main, tr

routine_amplitude_ret   ret

' ---------------------------------------------------------------
' Unrolled Multiplier
' ---------------------------------------------------------------
routine_multiply        mov     tr, #0
                        shr     t2, #15                                     ' shift right 8 for sustain then 3 for multiplier
                        
                        and     t2, #%00001                 nr, wz
if_nz                   add     tr, t1                             
                        shl     t1, #1
                        and     t2, #%00010                 nr, wz
if_nz                   add     tr, t1
                        shl     t1, #1
                        and     t2, #%00100                 nr, wz
if_nz                   add     tr, t1
                        shl     t1, #1
                        and     t2, #%01000                 nr, wz
if_nz                   add     tr, t1
                        shl     t1, #1
                        and     t2, #%10000                 nr, wz
if_nz                   add     tr, t1
                            
'                        sar     tr, #5     '5-2            ' Quieter
'                        sar     tr, #2     '5-2            ' Louder
                        sar     tr, divVal
routine_multiply_ret    ret
    
' ---------------------------------------------------------------
' Variables
' ---------------------------------------------------------------
'diraval         long    (|< AUDIO) | (|< AUDIO2)                                
'ctraval         long    (%00100 << 26) + pin#AUDIO                
'ctraval         long    (%00111 << 26) | AUDIO | (AUDIO2 << 9)                 
'ctraval         long    (%00111 << 26) | pin#AUDIO                  
'ctrbval         long    (%00111 << 26) | pin#AUDIO2                 
periodval       long    PERIOD                                              ' period = clkfreq / period

sineAddr        long    $E000
outputoffset    long    PERIOD/2
'outputoffset    long    10000
'outputoffset    long    1<<31
rand            long    203943

time            res     1
index           res     1  

addr_sample     res     1
        
addr_env        res     1    
addr_atk        res     1
addr_dec        res     1
addr_sus        res     1
addr_rel        res     1
addr_wav        res     1

addr_state      res     1

addr_voltgt     res     1
addr_vol        res     1

addr_inc        res     1
addr_acc        res     1


ptr_env         res     1    
ptr_atk         res     1
ptr_dec         res     1
ptr_sus         res     1
ptr_rel         res     1
ptr_wav         res     1

ptr_state       res     1

ptr_voltgt      res     1
ptr_vol         res     1

ptr_inc         res     1
ptr_acc         res     1


envelope        res     1
state           res     1
    
volinc          res     1
voltarget       res     1
volume          res     1
phase           res     1

out_main        res     1
out_osc         res     1

t1              res     1
t2              res     1
tr              res     1

addr            res     1
ctraval         res     1
diraval         res     1
divVal          res     1
' ---------------------------------------------------------------
    
                fit 496

DAT
{{

 TERMS OF USE: MIT License

 Permission is hereby granted, free of charge, to any person obtaining a copy of this software and
 associated documentation files (the "Software"), to deal in the Software without restriction, including
 without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the
 following conditions:

 The above copyright notice and this permission notice shall be included in all copies or substantial
 portions of the Software.

 THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT
 LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.
 IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY,
 WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE
 SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

}}
DAT