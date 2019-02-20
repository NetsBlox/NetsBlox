/*
  libsirc.c

  Test harness for sonyremote control protocol library.
*/

/*
void ir_tLimit(int ms);
int ir_key(int irDetPin);
int ir_code(int irDetPin, int bits);

#define SONY_IR_ENTER  11
#define SONY_IR_CH_UP  16
#define SONY_IR_CH_DN  17
#define SONY_IR_VOL_UP 18
#define SONY_IR_VOL_DN 19
#define SONY_IR_MUTE   20
#define SONY_IR_PWR    21
#define SONY_IR_PRV_CH 59
*/

#include "simpletools.h"                     // Library includes
#include "sirc.h"

int main()                                   // Main function
{
  sirc_setTimeout(1000);                           // -1 if no remote in 1 s
  while(1)                                   // Repeat indefinitely
  {
    print("%c button = %d, device = %d%c", 
           HOME,       sirc_button(10), sirc_device(10), CLREOL);
    pause(100);
  }  
}

