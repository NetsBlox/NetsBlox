OBJ

  voice  : "talk"                                       ' Phil Pilgrim's Phonemic Voice Synth
  system : "Propeller Board of Education"               ' PropBOE configuration tools
  time   : "Timing"                                     ' Timing convenience methods

PUB Go                                                 ' Program starts here

  system.Clock(80_000_000)                             ' Propeller system clock -> 80 MHz
  voice.start(26)                                      ' Start speech syntehsis cog

  voice.say(string("heloa"))                           ' Say "hello" 
  time.Pause(1000)                                     ' Wait 1 second
  voice.say(string("goodbae"))                         ' Say "goodbye"

  