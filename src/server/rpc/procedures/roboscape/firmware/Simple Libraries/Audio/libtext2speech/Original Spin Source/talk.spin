'' Phonemic voice synthesizer.
'' 
''Copyright (C) 2006 Philip C. Pilgrim
'' 
''This program is free software; you can redistribute it and/or modify
''it under the terms of the GNU General Public License as published by
''the Free Software Foundation; either version 2 of the License.
''
''This program is distributed in the hope that it will be useful,
''but WITHOUT ANY WARRANTY; without even the implied warranty of
''MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
''GNU General Public License for more details.
''
''You should have received a copy of the GNU General Public License
''along with this program; if not, write to the Free Software
''Foundation, Inc., 51 Franklin St, Fifth Floor, Boston, MA  02110-1301  USA
''
''CONTACT
''
''  phil@phipi.com (First contact may require addition to my whitelist.)
''
''VERSION HISTORY
''
''  0.01 alpha: released 2006.10.31
''
''  0.02 alpha: released 2006.11.04
''
''    Improved k and z sounds; added whispering, medium pause, spell function.
''
''  0.03 alpha: released 2006.11.07
''
''    Added inflections via sliding pitch (/\) during vowel pronunciation.
''    Added accents ('), which combine the [ and \ functions.
''    Added rolled R (rr) phoneme.
''    Added music notation (CDEFGABC) to make songs more readable.
''    Added tempo adjustment (%).
''    Added multiple speaker support (#) (pitch only).
''
''SUMMARY
''
'' This program is an attempt to use Chip Gracey's VocalTract module to produce phonemic-based speech.
'' The formant values it uses are based heavily on work done by D.H. Klatt in the "KLSYN" formant
'' synthesis program.
''
'' This program's "say" function accepts a string of bytes that represent English phonemes.
'' It "speaks" them on the port given in the argument to "start". The string can include the following
'' one- and two-character combinations:
''
''    #         Select speaker 0.
''    #n        Select speaker n (0 =< n =< 9).
''    _         Set the glottal pitch to the base frequency.
''    [         Raise glottal pitch by one semitone.
''    ]         Lower glottal pitch by one semitone.
''    /         Slide the glottal pitch up by one semitone during the next frame.
''    \         Slide the glottal pitch down by one semitone during the next frame.
''    '         Accent the next frame (same as +\).
''    +         Raise the glottal pitch by one semitone. (i.e. "Sharp" the previous note.)
''    +n        Raise the glottal pitch by n semitones (n = "1" to "9").
''    -         Lower the glottal pitch by one semitone. (i.e. "Flat" the previous note.)
''    -n        Lower the glottal pitch by n semitones (n = "1" to "9").
''    A .. G    Set the glottal pitch to the indicated note in the current octave.
''    An .. Gn  Set the glottal pitch to the indicated note in octave n (n = "0" to "9").
''    %         Set the tempo to 100%
''    %nnnn     Set the tempo to nnnn% (25 =< nnnn =< 1600) Larger numbers = slower tempo.
''    <         Raise the volume by one notch.
''    >         Lower the volume by one notch.
''    ~         Add a short "uh" to the end of the last letter (usually a consonant) for emphasis.
''    ,         Short pause.
''    ;         Medium pause.
''    .         Long pause.
''    (         Begin whispering.
''    )         End whispering.
''    |         Do not interpolate between previous and next phonemes.
''    <blank>   Syntactic separator. Prevents adjacent letters from being treated as a pair.
''    a         A as in At.
''    ae        Long I sound, as in bIte.
''    al        AL, as in pAL.
''    ai,ay     Long A sound, as in bAIt.
''    ar        AR, as in pARt.
''    ah,o      "ah" sound, as in pOt.
''    e         Short E sound, as in pEt.
''    ee        Long E sound, as in fEEd.
''    ew        EW, as in pEW.
''    er,ir     IR, as in gIRl 
''    el        EL, as in pELt.
''    i         Short I sound, as in hIt.
''    o         Short O sound, as in pOt.
''    oa        Long O sound, as in bOAt.
''    or        OR, as in fORt.
''    ol        "ahl" sound, as in mALl
''    ou,ow     OU, as in OUt.
''    oi,oy     OY, as in bOY.
''    oo        Long OO sound, as in bOOt.
''    u         Short U sound, as in gUt.
''    uu        Short OO sound, as in pUt.
''    d         D, as in Dog.
''    dh        Soft (voiced) TH sound, as in THat.
''    t         T, as in Tot.
''    th        Hard (unvoiced) TH sound, as in THink.
''    s         S, as in Sip.
''    sh        SH, as in SHip.
''    c,k       C, as in Cot.
''    ch        CH, as in CHip.
''    z         Z, as in Zoo.
''    zh        ZH sound, as in aZure.
''    l         L, as in Lot.
''    r         R, as in Rot.
''    rr        Rolled R, as in peRRo (Esp.).
''    w         W, as in Want.
''    y         Y, as in Yell.
''    m         M, as in Mom.
''    n         N, as in Name.
''    p         P, as in Pop.
''    g         G, as in Good.
''    b         B, as in Bad.
''    f         F, as in Fad.
''    h         H, as in Had.
''    v         V, as in Vat.
''    j         J, as in Job.
''
'' The "set" procedure sets the vocal tract parameters based on its list of arguments. It uses a crude audio
'' "kerning" function, wherein each frame can have a lead-in time, a play time, and a lead-out time. Lead-in
'' and lead-out determine the amount of blending that occurs between frames. The actual lead-in time used is
'' the lesser of a frame's designated lead-in time and the lead-out time of the previous frame. 

CON

  ZERO          = $FF
    
  #0, AAZ,GAZ,GP,VP,VR,F1,F2,F3,F4,NAZ,NF,FAZ,FF,AA,GA,NA,FA,GPS,QT

OBJ

  v    : "VocalTract"

VAR

  byte  vt[18], vtp[18], cbuf[300], speaker[10]
  word  glide, base_freq, gain, dilate
  byte  vocal_cog, aspirate, initial_k, initial_g, whisper, volume

PUB start (pin)

  stop
  vocal_cog := v.start(@vt, pin, -1, -1)
  bytefill(@speaker, 100, 10)
  base_freq := 100

PUB stop

  if vocal_cog
    cogstop(vocal_cog - 1)
    vocal_cog~

PUB set_speaker(spkr, base)

'' Assign a base pitch to speaker #spkr.

  speaker[spkr #> 0 <# 9] := base

PUB spell (ptr) | char, s

  repeat while char := byte[ptr++]
    if  char => "A" and char =< "Z"
      say(string("k'apitul"))
      char += $20
    case char
      " " : s := string("spays")
      "a" : s := string("ay")
      "b" : s := string("bee")
      "c" : s := string("see")
      "d" : s := string("dee")
      "e" : s := string("ee")
      "f" : s := string("ef")
      "g" : s := string("jee")
      "h" : s := string("aych")
      "i" : s := string("ae")
      "j" : s := string("jay")
      "k" : s := string("kay")
      "l" : s := string("el")
      "m" : s := string("em~")
      "n" : s := string("en~")
      "o" : s := string("oa")
      "p" : s := string("pee")
      "q" : s := string("kew")
      "r" : s := string("ar")
      "s" : s := string("ess")
      "t" : s := string("tee")
      "u" : s := string("yoo")
      "v" : s := string("vee")
      "w" : s := string("d'ubulyoo")
      "x" : s := string("eks")
      "y" : s := string("wae")
      "z" : s := string("zee")
      "0" : s := string("z'eeroa")
      "1" : s := string("wun~")
      "2" : s := string("too")
      "3" : s := string("three")
      "4" : s := string("for")
      "5" : s := string("faev")
      "6" : s := string("siks")
      "7" : s := string("s'even~")
      "8" : s := string("ayt")
      "9" : s := string("naen~")
      "." : s := string("p'eereeud")
      "," : s := string("k'omu")
      ":" : s := string("k'oalun~")
      "?" : s := string("kw'estshun mark~")
      "!" : s := string("'eksklam'ayshun point")
      ";" : s := string("s'emaekoalun~")
      "'" : s := string("uhp'ostrufee")
      "@" : s := string("at")
      "#" : s := string("n'umber")
      "$" : s := string("d'olur saen")
      "%" : s := string("pers'ent")
      "^" : s := string("k'a rut")
      "&" : s := string("'ampersand")
      "*" : s := string("star")
      "(" : s := string("left pur'enthesis")
      ")" : s := string("raet pur'enthesis")
      "-" : s := string("haefun")
      "_" : s := string("'underskor")
      "+" : s := string("plus")
      "=" : s := string("'eekwol saen~")
      other : s := string("'unoan k'a racter")
    say(s)
    say(string(";"))

PUB say (ptr) | this, nxt, octave  

  if vocal_cog == 0
    return
  vt[GP] := vt[GPS] := base_freq
  initial_k := initial_g := aspirate := whisper := 0
  volume := 6
  dilate := 100
  set(formant(650, 990, 2530, 3480), string(QT), 0, 10, 0)
  repeat while this := byte[ptr++]
    case this
      "_" : vt[GP] := vt[GPS] := base_freq
      "/" : vt[GPS] += 4
      "\" : vt[GPS] -= 4
      "[" : vt[GPS] := vt[GP] += 4
      "]" : vt[GPS] := vt[GP] -= 4
      "'" : vt[GP] += 4
      "," : set(0, string(QT), 100, 200, 0)
      ";" : set(0, string(QT), 100, 450, 0)
      "." : set(0, string(QT), 100, 750, 0)
      "|" : glide~
      "(" : whisper~~
      ")" : whisper~
      "%" :
        dilate~
        repeat while (nxt := byte[ptr++]) => "0" and nxt =< "9"
          dilate := dilate * 10 + nxt - "0"
        ptr--
        if dilate
          dilate := dilate #> 25 <# 1600
        else
          dilate := 100
      "~" : set(formant(640, 1200, 2400, 3000), string(GA, 15), 10, 15, 10)
      "#", "_", "A" .. "G", "+", "-", "=", "<", ">", "a", "e", "i", "o", "u" , "d", "t", "s", "c", "k", "g", "z", "r" :
        nxt := byte[ptr++]
        case this
          "#" :
            case nxt
              "0" .. "9" :
                base_freq := speaker[nxt - "0"]
              other : ptr--
                base_freq := speaker[0]
            vt[GP] := vt[GPS] := base_freq
          "A" .. "G" :
            case nxt
              "1" .. "5" : octave := nxt - "0"
              other : ptr--
                octave := (vt[GP] + 32) / 48
            vt[GP] := vt[GPS] := (octave - 1) * 48 + byte[string(52, 60, 16, 24, 32, 36, 44)][this - "A"] <# 255    
          "+", "-" :
            case nxt
              "1" .. "9" : vt[GP] += (("," - this) * (nxt - "0")) << 2
              other : ptr--
                vt[GP] += ("," - this) << 2
            vt[GPS] := vt[GP]
          "=" :
            case nxt
              "0" .. "9" : volume := (nxt - "0")
              other : ptr--
                volume := 6
          "<", ">" :
            case nxt
              "0" .. "9" : volume := volume + ("=" - this) * (nxt - "0") <# 9 #> 0
              other : ptr--
                volume := volume + "=" - this <# 9 #> 0
          "a" :
            case nxt
              "e" {fIne} :
                set(formant(650, 990, 2530, 3480), 0, 10, 1, 300)
                set(formant(310, 2020, 2960, 3500), 0, 300, 50, 100)
              "l" {pAL} :
                set(formant(660, 1700, 2400, 3900), 0, 200, 200, 100)
                set(formant(310, 1050, 2880, 3500), 0, 100, 200, 50)
              "i", "y" {mAIl} :
                set(formant(660, 1700, 2400, 3900), 0, 200, 0, 150)
                set(formant(310, 2020, 2960, 3500), 0, 150, 200, 100)
              "r" {pARt} :
                set(formant(650, 990, 2530, 3480), 0, 200, 100, 100)
                set(formant(470, 1120, 2430, 3400), 0, 100, 200, 100)
                set(formant(310, 1060, 1380, 3500), string(QT), 100, 200, 200)              
              "h" {pOt (same as "o")} : set(formant(650, 990, 2530, 3480), 0, 200, 200, 100)
              other {pAt} : ptr--
                set(formant(660, 1700, 2400, 3900), 0, 200, 200, 100)
          "e" :
            case nxt
              "e" {wEE} : set(formant(310, 2020, 2960, 3500), 0, 100, 200, 100) 
              "w" {fEW} :
                set(formant(310, 2020, 2960, 3500), 0, 100, 0, 150)
                set(formant(300, 870, 2250, 3900), 0, 200, 100, 100)
              "r" {fERn} :
                set(formant(470, 1120, 2430, 3400), 0, 100, 200, 100)
                set(formant(310, 1060, 1380, 3500), string(QT), 100, 200, 200)              
              "l" {fELL} :
                set(formant(580, 1799, 2605, 3677), 0, 100, 100, 100)
                set(formant(310, 1050, 2880, 3500), 0, 100, 200, 50)
              other {pEt} : ptr--
                set(formant(580, 1799, 2605, 3677), 0, 100, 100, 100)
          "i" :
            case nxt
              "r" {gIRl (same as "er")} :
                set(formant(470, 1120, 2430, 3400), 0, 100, 200, 100)
                set(formant(310, 1060, 1380, 3500), string(QT), 100, 200, 200)              
              other {pIt} : ptr--
                set(formant(400, 2000, 2550, 3900), 0, 100, 150, 100)
          "o" :
            case nxt
              "a" {bOAt} : 
                set(formant(640, 1200, 2400, 3000), 0, 100, 0, 150)
                set(formant(300, 870, 2250, 3900), 0, 150, 100, 100)
              "r" {fOR} :
                set(formant(640, 1200, 2400, 3000), 0, 100, 0, 100)
                set(formant(300, 870, 2250, 3900), 0, 100, 0, 100)
                set(formant(470, 1120, 2430, 3400), string(GA, 20), 100, 0, 50)
                set(formant(310, 1060, 1380, 3500), string(QT), 50, 200, 200)              
              "l" {mALL} :
                set(formant(650, 990, 2530, 3480), 0, 200, 200, 100)
                set(formant(310, 1050, 2880, 3500), 0, 100, 200, 50)
              "u", "w" {pOUt} :
                set(formant(660, 1700, 2400, 3900), 0, 100, 100, 300)
                set(formant(300, 870, 2250, 3900), 0, 300, 50, 100)
              "i", "y" {bOY} :
                set(formant(640, 1200, 2400, 3000), 0, 100, 0, 150)
                set(formant(300, 870, 2250, 3900), 0, 150, 0, 200)
                set(formant(310, 2020, 2960, 3500), 0, 200, 50, 100)
              "o" {bOOt} : set(formant(300, 870, 2250, 3900), 0, 100, 200, 100)
              other {pOt (same as "ah")} : ptr--
                set(formant(650, 990, 2530, 3480), 0, 200, 200, 100)
          "u" :
            case nxt
              "u" {pUt} : set(formant(470, 1120, 2430, 3400), 0, 100, 200, 100)
              other {pUtt} : ptr--
                set(formant(640, 1200, 2400, 3000), 0, 100, 200, 100)
          "d" :
            case nxt
              "h" {THis} :
                set(0, string(QT), 0, 30, 0)
                set(formant(350, 1800, 2820, 3400), string(QT, GA, 5, FA, 5, FF, 250), 0, 100, 0)
              other {Dot} : ptr--
                set(formant(400, 1600, 2600, 3500), string(QT), 0, 100, 0)
                set(0, string(AA, 200), 0, 10, 10)
                set(0, string(AA, 20, NA, 50, NF, 20), 100, 100, 100) 
          "t" :
            case nxt
              "h" {THick} :
                set(0, string(QT), 0, 30, 0)
                set(formant(350, 1800, 2820, 3400), string(QT, FA, 10, FF, 250), 0, 200, 50)
              other {Tot} : ptr--
                set(formant(400, 1600, 2600, 3500), string(QT), 0, 100, 0)
                set(0, string(QT, AA, 200), 0, 10, 10)
                set(0, string(QT, AA, 20, NA, 50, NF, 20), 100, 100, 100) 
          "s" :
            case nxt
              "h" {SHot} :
                set(0, string(QT), 0, 30, 0)
                set(formant(470, 1120, 2430, 3400), string(QT, AA, 10, FA, 5, FF, 50), 0, 200, 0)
                set(0, string(QT), 0, 1, 50) 
              other {Sit} : ptr--
                set(0, string(QT), 0, 30, 0)
                set(formant(19, 38, 57, 57), string(QT, FA, 2, FF, 100), 0, 200, 0)
                set(formant(470, 1120, 2430, 3400), string(GA, ZERO), 0, 1, 50) 
          "c", "k" :
            if this == "c" and nxt == "h" {CHat}
              set(0, string(QT), 0, 30, 0)
              set(formant(260, 2070, 3020, 3500), string(QT, FF, 100, FA, 5), 0, 100, 200)
              set(0, string(GA, ZERO), 0, 1, 50)
            else
              ptr--
              case nxt
                "a", "e", "i", "o", "u" {Cat} : initial_k := true 
                other {maC} :
                  set(formant(50, 1750, 1750, 3500), string(QT), 50, 1, 1)
                  set(0, string(QT), 10, 1, 1)
                  set(0, string(QT, FA, 30, FF, 90), 0, 15, 0)
                  set(0, string(QT), 0, 40, 0)
          "g" :
            ptr--
            case nxt
              "a", "e", "i", "o", "u" {Got} : initial_g := true
              other {piG} :
                set(formant(300, 1990, 2850, 3500), string(QT, GA, 20, AA, 200), 0, 10, 10)
                set(0, string(QT, GA, 20, AA, 20, NA, 50, NF, 20), 40, 40, 10)                 
          "z" :
            case nxt
              "h" {aZure} :
                'set(0, string(QT), 0, 30, 0)
                set(formant(470, 1120, 2430, 3400), string(QT, GA, 20, AA, 10, FA, 5, FF, 50), 50, 300, 0)
                'set(0, string(QT), 0, 1, 50) 
              other {Zoo} : ptr--
                set(formant(150, 1400, 2300, 3180), string(FF, 250, FA, 10, GA, 20), 200, 100, 200)
          "r" :
            case nxt
              "r" {peRRo (Esp.)} :
                repeat 3
                  set(formant(310, 1060, 1380, 3500), string(QT), 0, 50, 200)
                  set(formant(640, 1200, 2400, 3000), string(GA, 15), 10, 15, 10)
              other {Rot} : ptr--
            set(formant(310, 1060, 1380, 3500), string(QT), 0, 50, 200)                  
      other:
        case this
          "l" {Lot} : set(formant(310, 1050, 2880, 3500), 0, 0, 200, 50)
          "w" {Wad} : set(formant(290, 610, 2150, 3500), string(QT), 0, 50, 200)
          "y" {Yet} : set(formant(310, 2020, 2960, 3500), string(QT), 0, 100, 200)
          "m" {Mom} : set(formant(480, 1270, 2130, 3500), string(QT, GA, 5, NA, 5, NF, 14), 10, 200, 30)
          "n" {No}  : set(formant(480, 1340, 2470, 3500), string(QT, GA, 5, NA, 5, NF, 14), 10, 200, 30)
          "p" {Pot} :
            set(formant(400, 1100, 2150, 3500), string(QT), 0, 100, 0)
            set(0, string(QT, AA, 60), 0, 10, 10)
            set(0, string(QT, AA, 20, NA, 50, NF, 20), 100, 100, 100)
          "b" {Bad} :
            set(formant(200, 1100, 2150, 3500), string(QT), 0, 100, 10)
            set(0, string(QT, GA, 10), 10, 40, 10) 
          "f" {Fit} :
            set(0, string(QT), 0, 30, 0)
            set(formant(19, 38, 57, 57), string(QT, FA, 2, FF, 250), 0, 200, 0)
            set(formant(470, 1120, 2430, 3400), String(GA, ZERO), 0, 1, 50) 
          "h" {Hit} : aspirate := true
          "v" {Vat} : set(formant(220, 1100, 2080, 3500), string(QT, FF, 250, FA, 2), 0, 100, 200)
          "j" {Jot} : set(formant(260, 2070, 3020, 3500), string(QT, GA, 10, FF, 100, FA, 10), 0, 150, 100)
  set(0, string(QT), 0, 1, 0)

PRI formant(sf1, sf2, sf3, sf4)

  if sf1
    vt[F1] := sf1 / 19
  if sf2
    vt[F2] := sf2 / 19
  if sf3
    vt[F3] := sf3 / 19
  if sf4
    vt[F4] := sf4 / 19
  return 0
  
PRI set (fmt, ptr, pre, time, post) | this, nxt, vol

  if ptr
    repeat while this := byte[ptr++]
      if this == ZERO
        this~
      if this == QT
        vt[AA] := vt[GA] := vt[NA] := vt[FA] := 0
      elseif nxt := byte[ptr++]
        if nxt == ZERO
          nxt~
        vt[this] := nxt
      else
        abort
  if pre or time
    if aspirate
      vt[AAZ] := vt[GAZ] := 0
      v.go(1)
      vt[AAZ] := 10
      v.go(200 * dilate / 100 #> 1)
      glide~
      aspirate~
    elseif initial_k or initial_g
      bytemove(@vtp, @vt, 18)
      if initial_g
        vt[F1] := vtp[F1] >> 2
        vt[F2] := vt[F3] := (vtp[F2] + vtp[F3]) >> 1
      else
        vt[F1] := (vt[F1] * 3) >> 2
        vt[F2] := (vtp[F2] * 3 + vtp[F3]) >> 2
        vt[F3] := (vtp[F3] * 3 + vtp[F2]) >> 2
      initial_k~
      initial_g~
      set(0, string(QT), 10, 1, 1)
      set(0, string(QT, FA, 30, FF, 90), 0, 15, 0)
      set(0, string(QT), 0, 40, 0)
      set(0, string(GA, 2), 0, 10, 100)
      bytemove(@vt, @vtp, 18)
    if whisper
      vt[AA] #>= vt[GA]
      vt[GA]~
    vol := byte[string(32, 37, 44, 51, 59, 69, 80, 94, 109, 128)][volume]
    vt[GAZ] := (vt[GA] * vol) >> 7
    vt[AAZ] := (vt[AA] * vol) >> 7
    vt[FAZ] := (vt[FA] * vol) >> 7
    vt[NAZ] := (vt[NA] * vol) >> 7
    v.go((pre <# glide) * dilate / 100 #> 1)
    vt[GP] := vt[GPS]
    v.go(time * dilate / 100 #> 1)
  glide := post
  vt[FA]~  
  vt[GA] := 40

DAT

stretch       word      128, 140, 152, 166, 181, 197, 215, 235, 256
              word           279, 304, 332, 362, 395, 431, 470, 512

