#include "simpletools.h"
#include "badgewxtools.h"


volatile int led_brightness[] = {0, 0};
static int led_pwm_cog_id;


void led_pwm() {
  int shiftmask = ~(1 << 31);
  int mask = (1 << LED_PIN);
  int led_pin_state = 0;
  while(1)
  {
    led_pin_state = !led_pin_state;

    int led_bit = led_brightness[led_pin_state] & 1;
    
    led_brightness[led_pin_state] = ((led_brightness[led_pin_state] >> 1) & shiftmask) | (led_brightness[led_pin_state] << 31);      

    DIRA = DIRA & ~mask;
    
    // Toggle the state of the LED_PIN
    OUTA ^= (-led_pin_state ^ OUTA) & mask;
    //set_output(LED_PIN, led_pin_state);
    
    // Set the LED_PIN as input or output 
    set_direction(LED_PIN, led_bit);
    //usleep(10);
    
  }  
}

void led_pwm_set(char side, char level) {
  
  int led_levels[] = {0b0,
                      0b1,
                      0b11,
                      0b111,
                      0b1111,
                      0b11111,
                      0b111111,
                      0b1111111,
                      0b111111111,
                      0b11111111111,
                      0b1111111111111,
                      0b1111111111111111,
                      0b1111111111111111111,
                      0b1111111111111111111111,
                      0b1111111111111111111111111,
                      0b1111111111111111111111111111,
                      0b11111111111111111111111111111111 };                 

  // Make sure the entries are not out of range (0-15)
  level = level > 15 ? 15 : level;
  level = level < 0  ?  0 : level;

  led_brightness[side] = led_levels[level];
}

void led_pwm_start() {
  led_pwm_cog_id = cog_run(led_pwm, 24); 
}

void led_pwm_stop() {
  if(led_pwm_cog_id) {
    cogstop(led_pwm_cog_id);
  }    
}  
