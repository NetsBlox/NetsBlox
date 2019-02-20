/**
 * @file simpletools.h
 *
 * @author Andy Lindsay
 *
 * @copyright
 * Copyright (C) Parallax, Inc. 2013-2017. All Rights MIT Licensed.
 *
 * @brief This library provides convenient functions 
 * for a variety of microcontroller I/O, timing, conversion, and  
 * communication tasks.  This library also includes (and you can 
 * call functions from) 
 * <a target="blank" href="html/../../../Text%20Devices/libsimpletext/
 * Documentation%20simpletext%20Library.html">simpletext</a> 
 * and
 * <a target="blank" href="html/../../../Text%20Devices/libsimpletext/
 * Documentation%20serial%20Library.html">serial</a>.  
 *
 * @details This library provides a set of introductory functions that simplify:
 *  
 * @li I/O control - convenient I/O pin monitoring and control functions
 * @li Timing - Delays, timeouts
 * @li Timed I/O - pulse generation/measurement, square waves, transition
 * counting, RC decay, etc.
 * @li Analog - D/A conversion, PWM, and more.  
 * @n For A/D conversion see ...Learn/Simple Libraries/Convert
 * for A/D conversion libraries
 * @li Serial Communication - SPI, I2C
 * @n For half and full duplex asynchronous serial communication, see 
 * ...Learn/Simple Libraries/Text Devices
 * @li Memory - EEPROM, SD storage
 *
 * Applications include: monitoring, control and
 * communication with simple peripherals, like lights, buttons,
 * dials, motors, peripheral integrated circuits and prototyping with
 * simple systems that use pulse, or serial communication.  (A few
 * examples from the very large list of devices includes: servos,
 * ultrasonic distance sensors, accelerometers, serial liquid crystal,
 * display, etc.)
 *
 * Intended use: Accompanies introductory electronics, robotics and
 * programming lessons and projects on learn.parallax.com.  After
 * these lessons, bridge lessons will be added to familiarize the
 * programmer with standard practices used by the community for
 * adding libraries to support and endless variety of peripherals
 * and applications.
 *
 * @par Core Usage
 * Any of these functions, if called, will launch a process into another cog
 * and leave it launched for set it/forget it processes:
 * 
 * @li cog_run (1 cog per call)
 * @li squareWave (1 cog)
 * @li pwm (1 cog)
 * @li dac (1 cog)
 *
 * @par Memory Models
 * Use with CMM or LMM.
 * 
 * @version
 * 1.1.8 Add constrainFloat, constrainInt, mapFloat, mapInt, and random.  
 * @par
 * 1.1.7 Update pause function for up to 2,147,483,647 ms.  
 * @par
 * 0.98.2 Add term_cmd function for SimpleIDE Terminal cursor, screen, and audio
 * control.  
 * @par
 * 0.98 fpucog floating point coprocessor no longer self-starts by default.  
 * All floating point functionality is still supported, processing just happens in
 * the same cog.  i2c_out and i2c_in char regAddr parameter changed to int memAddr. 
 * itoa removed, use sprint(charArray, "%d", intVal) to make int to ASCII 
 * conversions.  st_msTicks and st_usTicks global variables are pre-initialized to the 
 * number of system clock ticks in a millisecond and microsecond for convenience in
 * library development.  Variables named us and ms are initialized to the same values 
 * for user applications.  Function endianSwap added to simplify communication with 
 * devices that send/receive byte data in big endian format.
 * @par
 * 0.97 Add cog_run and cog_end for simplified running of functioncode in other cogs.
 * @par
 * 0.96.1 Add documentation for start_fpu_cog and stop_fpu_cog.
 * @par
 * 0.96 ee_putStr updated to support 128 byte page writes.  More corrections to ee_put
 * for contiguous data crossing address/128 boundary.
 * @par
 * 0.95 square_wave bug that prevented output frequency changes
 * (fixed).
 * @par
 * 0.94 Fixed bug in ee_put* that prevented contiguous data from crossing the EEPROM's 
 * address/128 buffer boundaries.  Updated stack array to static in mstimer.c.
 * @par
 * 0.93 i2c_newbus now uses @n
 *   .../Learn/Simple Libraries/Protocol/simplei2c/@n 
 * Added:@n
 *   i2c_out, i2c_in to cover most common I2C applications
 * EEPROM ee_get_* and ee_put_* changed to ee_get* and ee_put* where 
 * the * term is camel-case.
 * @par
 * 0.92 Simpletext functionality incorporated for use of
 * character and string I/O with both terminal and peripheral devices.
 * Simple Text folder replaces PropGCC serial driver support for simple
 * and full duplex serial peripherals.
 * @par
 * 0.91 shift_in function pre-clock mode bug fixed. @n @n
 * 
 * @par Help Improve this Library
 * Please submit bug reports, suggestions, and improvements to this code to
 * editor@parallax.com.
 */

#ifndef SIMPLETOOLS_H
#define SIMPLETOOLS_H

#if defined(__cplusplus)
extern "C" {
#endif

#include <propeller.h>
#include "simpletext.h"
#include <driver.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <cog.h>
#include <ctype.h>
#include <unistd.h>
#include <sys/stat.h>
#include <dirent.h>
#include <sys/sd.h>
#include <math.h>
#include "simplei2c.h"


/**
 * @brief Propeller system clock ticks in 1 millisecond (ms).
 */
extern int ms;


/**
 * @brief Propeller system clock ticks in 1 millisecond (us).
 */
extern int us;



/**
 * @name Private (used by simpletools library)
 * @{
 */



/**
 * @brief Propeller system clock ticks in 1 millisecond.  Changing this value is
 * not recommended because it can affect library performance.
 */
extern int st_msTicks;


/**
 * @brief Propeller system clock ticks in 1 microsecond.  Changing this value is
 * not recommended because it can affect library performance.
 */
extern int st_usTicks;


/**
 * @brief Clock ticks in a time increment used by pulse_in, pulse_out, and rc_time.
 * Default value is the number of system clock ticks in a microsecond = CLKFREQ/1000000.
 */
extern int st_iodt;

/**
 * @brief Clock ticks in a time increment used by pulse_in, pulse_out, and rc_time.
 * Default value is the number of system clock ticks in 1/4 s = CLKFREQ/4.
 */
extern int st_timeout;

/**
 * @brief Clock ticks in a time increment used by pause function.  Default value is the 
 * number of system clock ticks in 1/1000 s = CLKFREQ/1000.
 */
extern int st_pauseTicks;

/**
 * @brief Variable shared by mark and time_out functions.
 */
extern int st_mark;

/**
 * @brief Variable used by i2c_newbus.
 */
extern unsigned int st_buscnt;

/**
 * @brief The busID for the Propeller Activity Board's EEPROM bus.
 */
extern i2c *st_eeprom;

/**
 * @brief Initialization flag used by ee_ functions.
 */
extern int st_eeInitFlag;


/**
 * @}
 */

 
 
#ifndef PI
/**
 * @brief 3.141592653589793
 */
#define PI 3.141592653589793
#endif



/**
 * @name SimpleIDE Terminal Constants
 * @{
 */



/* Values for use with SimpleIDE Terminal */
#ifndef HOME
/**
 * @brief HOME character (1) sends SimpleIDE Terminal's cursor to top-left "home" position.
 */
#define HOME   (1)
#endif

#ifndef CRSRXY
/**
 * @brief CRSRXY character (2) sends cursor to a certain number of spaces over (X)
 * and returns (Y) down from SimpleIDE Terminal's top-left HOME position.  This 
 * character has to be followed immediately by the X and Y values when transmitted
 * to the SimpleIDE Terminal. 
 */
#define CRSRXY (2)
#endif

#ifndef CRSRLF
/**
 * @brief CRSRLF character (3) sends the SimpleIDE Terminal's cursor one column 
 * (space) to the left of its current position.
 */
#define CRSRLF (3)
#endif

#ifndef CRSRRT
/**
 * @brief CRSRRT character (4) sends the SimpleIDE Terminal's cursor one column 
 * (space) to the right of its current position.
 */
#define CRSRRT (4)
#endif

#ifndef CRSRUP
/**
 * @brief CRSRUP character (5) sends the SimpleIDE Terminal's cursor one row 
 * (carriage return) upward from its current position.
 */
#define CRSRUP (5)
#endif

#ifndef CRSRDN
/**
 * @brief CRSRDN character (6) sends the SimpleIDE Terminal's cursor one row 
 * (carriage return) downward from its current position.
 */
#define CRSRDN (6)
#endif

#ifndef BEEP
/**
 * @brief BEEP character (7) makes the system speaker in some computers beep 
 * when received by SimpleIDE Terminal.
 */
#define BEEP   (7)
#endif

#ifndef BKSP
/**
 * @brief BKSP character (8) sends the SimpleIDE Terminal's cursor one column 
 * (space) to the left of its current position and erases whatever character 
 * was there.
 */
#define BKSP   (8)
#endif

#ifndef TAB
/**
 * @brief TAB character (9) advances the cursor to the right by a tab's worth 
 * of spaces.  
 */
#define TAB    (9)
#endif

#ifndef NL
/**
 * @brief NL character (10) sends the SimpleIDE Terminal's cursor to the leftmost
 * character in the next line down.
 */
#define NL     (10)
#endif

#ifndef LF
/**
 * @brief LF is same as NL.
 */
#define LF     (10)
#endif

#ifndef CLREOL
/**
 * @brief CLREOL character (11) erases all SimpleIDE Terminal characters to the 
 * right of the cursor.
 */
#define CLREOL (11)
#endif

#ifndef CLRDN
/**
 * @brief CLRDN character (12) erases all SimpleIDE Terminal characters below the 
 * cursor.
 */
#define CLRDN  (12)
#endif

#ifndef CR
/**
 * @brief CR character (13) sends SimpleIDE Terminal's cursor one row
 * downward.
 */
#define CR     (13)
#endif

#ifndef CRSRX
/**
 * @brief CRSRX character (14) positions SimpleIDE Terminal's cursor X characters
 * from the its left edge.
 */
#define CRSRX  (14)
#endif

#ifndef CRSRY
/**
 * @brief CRSRY character (15) sends SimpleIDE Terminal's cursor Y rows to the 
 * from its top edge.  
 */
#define CRSRY  (15)
#endif

#ifndef CLS
/**
 * @brief CLS character (16) clears SimpleIDE's screen, erasing all characters and
 * placing the cursor in the top-left corner.
 */
#define CLS    (16)
#endif



/**
 * @}
 *
 * @name SPI Constants for shift_in & shift_out
 * @{
 */



#ifndef   MSBPRE     
/**
 * @brief For use with shift_in.  Stands for most significant bit first, pre-clock.
 */
#define   MSBPRE     0
#endif

#ifndef   LSBPRE     
/**
 * @brief For use with shift_in.  Stands for least significant bit first, pre-clock.
 */
#define   LSBPRE     1
#endif

#ifndef   MSBPOST    
/**
 * @brief For use with shift_in.  Stands for most significant bit first, post-clock.
 */
#define   MSBPOST    2
#endif

#ifndef   LSBPOST    
/**
 * @brief For use with shift_in.  Stands for least significant bit first, post-clock.
 */
#define   LSBPOST    3
#endif
  
// Values for use with shift_out
#ifndef   LSBFIRST   
/**
 * @brief For use with shift_out.  Stands for least significant bit first.
 */
#define   LSBFIRST   0
#endif

#ifndef   MSBFIRST   
/**
 * @brief For use with shift_out.  Stands for most significant bit first.
 */
#define   MSBFIRST   1
#endif



/**
 * @}
 *
 * @name Counter Module Constants
 * @{
 */



#ifndef NCO_PWM_1
/**
 * @brief Building block for configuring a cog's counter module to PWM mode.  
 * Used by pwm functions.  PWM stands for pulse width modulation.
 */
#define NCO_PWM_1 (0b00100 << 26)
#endif

#ifndef CTR_NCO
/**
 * @brief Building block for configuring a cog's counter module to NCO mode.  
 * Used by square_wave function.  NCO stands for numerically controlled oscillator.
 */
#define CTR_NCO (0b100 << 26)
#endif

#ifndef CTR_PLL
/**
 * @brief Building block for configuring a cog's counter module to PLL mode.  
 * Used by square_wave function.  PLL stands for phase locked loop.
 */
#define CTR_PLL (0b10 << 26)
#endif

#ifndef DUTY_SE
/**
 * @brief Building block for configuring a cog's counter module to DUTY_SE mode.  
 * Used by dac functions.  DUTY_SE stands for duty single ended.
 */
#define DUTY_SE (0b110 << 26)
#endif



/**
 * @}
 *
 * @name Reverse Compatibility Functions
 * @{
 */



/**
 * @brief ee_put_byte renamed ee_putByte.
 */
#define ee_put_byte ee_putByte


/**
 * @brief ee_get_byte renamed ee_getByte.
 */
#define ee_get_byte ee_getByte


/**
 * @brief ee_put_int renamed ee_putInt.
 */
#define ee_put_int ee_putInt


/**
 * @brief ee_get_int renamed ee_getInt.
 */
#define ee_get_int ee_getInt


/**
 * @brief ee_put_str renamed ee_putStr.
 */
#define ee_put_str ee_putStr


/**
 * @brief ee_get_str renamed ee_getStr.
 */
#define ee_get_str ee_getStr


/**
 * @brief ee_put_float32 renamed ee_putFloat32.
 */
#define ee_put_float32 ee_putFloat32


/**
 * @brief (Deprecated) Use waitcnt(CLKFREQ + CNT) for a delay that lasts 1 second,
 * and use fractions of CLKFREQ for smaller numbers of system clock ticks.
 */
#define pause_ticks(pticks) __builtin_propeller_waitcnt(pticks+CNT, 0)



/**
 * @}
 *
 * @name Propeller EEPROM Address
 * @{
 */



#ifndef EEPROM_ADDR
/**
 * @brief Propeller EEPROM I2C bus  address
 */
#define EEPROM_ADDR	 0x50
#endif



/**
 * @}
 */



/**
 * @brief Set an I/O pin to output-high
 *
 * @details This function set makes the Propeller
 * P8X32A connect the I/O pin to its positive 3.3 V
 * supply voltage enabling it to source up to
 * 40 mA of current (max 1 W dissipation per chip).
 *
 * @param pin Number of the I/O pin to set high.
 */
void high(int pin);


/**
 * @brief Set an I/O pin to output-low
 *
 * @details This function makes the Propeller
 * P8X32A connect the I/O pin to its ground 0 V
 * supply voltage enabling it to sink up to
 * 40 mA of current (max 1 W dissipation per chip).
 *
 * @param pin Number of the I/O pin to set low.
 */
void low(int pin);


/**
 * @brief Set an I/O pin to input and return 1 if pin
 * detects a high signal, or 0 if it detects low.
 *
 * @details This function makes the Propeller
 * connect the I/O pin to its input buffer
 * so that it can return the binary value of the
 * voltage applied by an external circuit.  
 *
 * @param pin Number of the I/O pin to set to input.
 *
 * @returns 1 to indicate high (above 1.65 V) received 
 * or 0 to indicate low (below 1.65 V) received.
 */
int input(int pin);



/**
 *
 * @name More Individual I/O
 * @{
 */
 
 

/**
 * @brief Toggle the output state of the I/O pin.
 *
 * @details Change I/O pin's output state from low to high
 * or high to low.  This function assumes that some other
 * function has already set the I/O pin to output.
 *
 * @param pin I/O pin number.
 *
 * @returns The new pin state.
 */
unsigned int toggle(int pin);

/**
 * @brief Reverse the direction of an I/O pin.
 *
 * @details If an I/O pin's direction is set to input, this
 * function changes it to output.  If it's set to output,
 * this function changes it to input.
 *
 * @param pin I/O pin number.
 *
 * @returns The new pin direction.
 */
unsigned int reverse(int pin);


/**
 * @brief Check the state of an I/O pin without
 * setting it to input.
 *
 * @details Use this function instead of input if the
 * Propeller needs to maintain an output.  For example,
 * you can use this to monitor another cog's or counter's
 * output signal activity on a pin.  (Note: if the pin
 * is already set to input, it will return the state the
 * external circuit is applying, just like input.)
 *
 * @param pin Number of the I/O pin
 *
 * @returns The pin's state.  If the pin is an output,
 * 1 = 3.3 V and 0 = 0 V.  If the pin is an input,
 * 1 means V > 1.65 V, 0 means it's less.
 */
unsigned int get_state(int pin);

/**
 * @brief Check the direction of the I/O pin.                                        
 *
 * @details This function will tell you the direction of the
 * I/O pin as seen by the cog executing it.  Keep in mind that
 * that your program might make other cogs use the I/O pin as
 * an output, and a cog that treats a pin as an output wins over
 * one that treats it as an input.
 *
 * @param pin I/O pin number
 *
 * @returns I/O pin direction as seen by the cog that runs the
 * function.
 */
unsigned int get_direction(int pin);

/**
 * @brief Get I/O pin output state.
 *
 * @details Keep in mind that this function reports the value in the output
 * register for the cog running the function.  That doesn't tell you if the
 * I/O pin is set to input, or whether another cog is sending a different
 * output state.
 *
 * @param pin I/O pin number.
 *
 * @returns In a register bit for I/O pin, either 1 or 0.
 */
unsigned int get_output(int pin);

/**
 * @brief Set an I/O pin to a given direction.                                        
 *
 * @details This function sets an I/O pin to either output or input.
 *
 * @param pin I/O pin number.
 * @param direction I/O pin direction.
  */
void set_direction(int pin, int direction);

/**
 * @brief Set I/O pin output register bit to either 1 or 0.
 *
 * @details This function focuses on the I/O pin's output register.  If you
 * intend to use it to send high or low signals, consider using high or low
 * functions.  This function can also be used in conjunction with set_direction
 * to send high or low signals.
 *
 * @param pin I/O pin to set high or low.
 * @param state 1 for high, 0 for low (when pin is actually set to output,
 * which can be done with setDirection.
 */
void set_output(int pin, int state);



/**
 * @}
 *
 * @name Group I/O
 * @{
 */



/**
 * @brief Get states of a contiguous group of I/O pins
 *
 * @details This works the same as getState, but for a group of pins.  It
 * tells you the actual state of each pin, regardless of whether it's a 
 * voltage applied to input or transmitted by an output.
 *
 * @param endPin The highest numbered pin.
 * @param startPin The lowest numbered pin.
 *
 * @returns States value containing the binary bit pattern.  The value for
 * startPin should be in bit-0, next in bit-1, etc.
 */
unsigned int get_states(int endPin, int startPin);

/**
 * @brief Get directions for a contiguous group of I/O pins.
 *
 * @details Get direction register states from a contiguous group of bits 
 * in the cog's output register.
 *
 * @param endPin The highest numbered pin.
 * @param startPin The lowest numbered pin.
 *
 * @returns States value containing a binary bit pattern.  The value for
 * startPin should be in bit-0, next in bit-1, etc.
 */
unsigned int get_directions(int endPin, int startPin);

/**
 * @brief Get output settings for a contiguous group of I/O pins.
 *
 * @details Get output register settings for a contiguous group of bits 
 * in the cog's output register.
 *
 * @param endPin The highest numbered pin.
 * @param startPin The lowest numbered pin.
 *
 * @returns Pattern value containing a binary bit pattern.  The value 
 * for startPin should be in bit-0, next in bit-1, etc.
 */
unsigned int get_outputs(int endPin, int startPin);

/**
 * @brief Set directions for a contiguous group of I/O pins.
 *
 * @details Set directions values in a contiguous group of bits in the 
 * cog's output register.
 *
 * @param endPin The highest numbered pin.
 * @param startPin The lowest numbered pin.
 * @param pattern Value containing the binary bit pattern.  The value for
 * startPin should be in bit-0, next in bit-1, etc.
 */
void set_directions(int endPin, int startPin, unsigned int pattern);

/**
 * @brief Set output states for a contiguous group of I/O pins.
 *
 * @details Set output states of a contiguous group of bits in the cog's
 * output register.
 *
 * @param endPin The highest numbered pin.
 * @param startPin The lowest numbered pin.
 * @param pattern Value containing the binary bit pattern.  The value for
 * startPin should be in bit-0, next in bit-1, etc.
 */
void set_outputs(int endPin, int startPin, unsigned int pattern);




/**
 * @}
 *
 * @name Timing
 * @{
 */




/**
 * @brief Delay cog from moving on to the next statement for a certain length
 * of time.
 *
 * @details The default time increment is 1 ms, so pause(100) would delay for
 * 100 ms = 1/10th of a second.  This time increment can be changed with a call
 * to the set_pause_dt function.
 *
 * @param time The number of time increments to delay.
 */
void pause(int time);

/**
 * @brief Set time increment for pause function
 *
 * @details Default time increment for pause function is 1 ms.  This function
 * allows you to change that delay to custom values. For example,
 * set_pause_dt(CLKFREQ/2000) would set it to 1/2 ms increments.  To return to
 * default 1 ms increments, use set_pause_dt(CLKFREQ/1000).
 *
 * @param clockticks the number of clock ticks that pause(1) will delay.
 */
void set_pause_dt(int clockticks);




/**
 * @}
 *
 * @name Timed I/O
 * @{
 */




/**
 * @brief Count number of low to high transitions an external input applies to
 * an I/O pin over a certain period of time.
 *
 * @param pin I/O pin number
 * @param duration Amount of time the measurement counts transitions
 *
 * @returns The number of low to high transitions
 */
long count(int pin, long duration);

/**
 * @brief Set D/A voltage
 *
 * @details Launches process into another cog for up to two channels of D/A conversion
 * on any I/O pin.  Other libraries may be available that provide D/A for more channels.
 * Check SimpleIDE/Learn/Simple Libraries/Convert for options.  For more options, check
 * obex.parallax.com.
 *
 * This library uses another cog's counter modules (2 per cog) to perform duty modulation,
 * which is useful for D/A conversion.  The digital signal it generates will affect LED
 * brightness.  The signal can be passed through a low pass RC filter for digital to 
 * analog voltage conversion.  Add an op amp buffer if it needs to drive a load.  
 *
 * Default resolution is 8 bits for output voltages ranging from 0 V to (255/256) of
 * 3.3 V.
 *
 * General equation is dacVal * (3.3 V/2^bits)
 *
 * Default is 8 bits, which results in dacVal * (3.3 V/ 256), so dacVal
 * specifies the number of 256ths of 3.3 V.  You can change the resolution with
 * the dac_ctr_res function.
 *
 * @param pin I/O pin number.
 * @param channel Use 0 or 1 to select the cog's CTRA or CTRB counter modules, which
 * are used for D/A conversion.
 * @param dacVal Number of 256ths of 3.3 V by default.  Use a value from 0 (0 V) 
 * to 255 .
 */
void dac_ctr(int pin, int channel, int dacVal);

/**
 * @brief Set D/A voltage resolution
 *
 * @details Default resolution is 8-bits for output voltages ranging from 0 V to (255/256) of
 * 3.3 V.
 *
 * General equation is dacVal * (3.3 V/2^bits)
 *
 * Default is 8 bits, which results in dacVal * (3.3 V/ 256), so dacVal
 * specifies the number of 256ths of 3.3 V.
 *
 * @param bits The D/A converter's resolution in bits.
 */
void dac_ctr_res(int bits);

/**
 * @brief Stop the cog that's transmitting the DAC signal(s).  
 *
 * @details Stops any signals, lets go of any I/O pins, and reclaims the cog for
 * other uses.  
 *
 */
void dac_ctr_stop(void);

/**
 * @brief Use same cog to send square wave of a certain 
 * frequency for a certain amount of time.  For set and forget
 * with another cog, try square_wave function instead.
 *
 * @param pin I/O pin that sends the frequency
 * @param msTime Time in ms that the signal lasts
 * @param frequency Frequency of the signal in Hz.  Accepts
 * values from 1 Hz to 128000000 Hz (128 MHz).
 */
void freqout(int pin, int msTime, int frequency);

/**
 * @brief Start pulse width modulation (PWM) process in another cog.
 *
 * @details Great for DC motors, can also be used for servos, but the 
 * servo library is probably a better choice for that.
 *
 * A PWM signal sends repeated high signals with a fixed cycle time.
 * Your code will typically control the amount of time a PWM signal is
 * high during each cycle.  For example, pwm_start(1000) will establish
 * a 1000 us PWM cycle.  You can then use the pwm_set function to send
 * high signals that last anywhere from 0 to 1000 us.   
 *
 * @param cycleMicroseconds Number of microseconds the PWM cycle lasts.
 */
int pwm_start(unsigned int cycleMicroseconds);

/**
 * @brief Set a PWM signal's high time.
 *
 * @details After a single call to pwm_start, this function allows you
 * to set a PWM signal's high time.  For example, if your pwm_start call
 * sets up 1000 us (1 ms) you could use this function to make the signal
 * high for 3/4 of its cycle with pwm_set(pin, channel, 750).  If the
 * signal goes to a DC motor through an H bridge or other driver circuit,
 * the motor will behave as though it's only getting 3/4 of the supply 
 * and turn at roughly 3/4 of full speed.
 *
 * @param pin I/O pin to send the PWM signal.  You can change this 
 * value on the fly, which is useful for speed control of a DC motor in 
 * two different directions.  When the PWM signal changes to a new pin,
 * the cog sets the previous pin to input.  If you want it to stay low
 * when the PWM cog lets go, just set the pin low in your code before 
 * calling pwm_start.
 * 
 * @param channel You have options of 0 or 1 for up to two simultaneous 
 * PWM signals.  If you have an application in mind that requires more
 * PWM signals, check the SimpleIDE/Learn/Simple Libraries/Motor
 * directory, and also online at obex.parallax.com. 
 *
 * @param tHigh The high time for each PWM cycle repetition.
 */
void pwm_set(int pin, int channel, int tHigh);

/**
 * @brief Shut down PWM process and reclaim cog and I/O pins for other
 * uses.
 *
 * @details Shut down PWM process and reclaim cog and I/O pins for other uses
 *
 */
void pwm_stop(void);

/**
 * @brief Measure the duration of a pulse applied to an I/O pin
 *
 * @details Default time increments are specified in 1 microsecond units.  Unit size
 * can be changed with a call to set_io_dt function.
 *
 * @param pin I/O pin number
 * @param state State of the pulse (1 for positive or high pulses, 0 for negative or
 * low pulses.
 *
 * @returns Number of time units the pulse lasted.
 */
long pulse_in(int pin, int state);

/**
 * @brief Transmit a pulse with an I/O pin
 *
 * @details Default time increments are specified in 1 microsecond units.  Unit size
 * can be changed with a call to set_io_dt function.  The pulse will be positive if the
 * I/O pin is transmitting a low signal before the call.  The pulse will be negative
 * if it transmits a high signal before the call.  When the pulse is done, the pin
 * returns to whatever state it was in before the pulse.  If the pin was an input, it
 * will be changed to output and use whatever value was in the output register bit
 * for the pin.  This defaults to low on start-up, but you can pre-set it while leaving
 * the pin set to input with the set_output function (or check it with get_output).
 *
 * @param pin I/O pin number.
 * @param time Amount of time the pulse lasts.
 */
void pulse_out(int pin, int time);

/**
 * @brief Set I/O pin to input and measure the time it takes a signal to transition from
 * a start state to the opposite state.
 *
 * @details Named rc_time because it is often used to measure a resistor-capacitor
 * circuit's tendency to "decay" to either ground or 5 V (depending on wiring).  Default
 * time increments are specified in 1 microsecond units.  Unit size can be changed with a
 * call to set_io_dt function.  The pulse will be positive if the I/O pin is transmitting a
 * low signal before the call.
 *
 * @param pin I/O pin number.
 * @param state Starting pin state.
 *
 * @returns Time from starting pin.
 */
long rc_time(int pin, int state);

/**
 * @brief Make I/O pin transmit a repeated high/low signal at a certain frequency.
 * High and low times are the same.  Frequency can range from 1 Hz to 128 MHz.  
 *
 * @details Uses one additional cog with up to two active channels, each with a selectable
 * frequency.  You can change transmit pins on the fly by calling this function on the 
 * same channel, but with a different pin.  The previous pin will be set to input in that
 * cog.  If your code is set to output, it will not affect that setting, only the setting
 * for the cog that is transmitting the square wave.  Code in your cog, or some other cog
 * can modulate the signal.  A low signal allows the square wave to transmit, and a high
 * signal prevents it.  
 *
 * @param pin I/O pin that transmits square wave frequency.  To stop sending the signal.
 * and change the pin back to input, pass the pin as a negative number.
 * @param channel 0 or 1 selects the counter module to transmit the frequency.
 * @param freq Square wave frequency.
 *
 */
void square_wave(int pin, int channel, int freq);

/**
 * @brief Stop the cog that's transmitting a square wave.  
 *
 * @details Stops any signals, lets go of any I/O pins, and reclaims the cog for
 * other uses.  
 *
 */
void square_wave_stop(void);

/**
 * @brief Sets the timeout value for the following timed I/O functions: pulse_in, rc_time
 *
 * @details Time increment is set in clock ticks.  For example, the default of 0.25
 * seconds is set with set_io_timeout(CLKFREQ/4).  To set the timeout to 20 ms, you could
 * use set_io_timeout(CLKFREQ/50).
 *
 * @param clockTicks Number of clock ticks for timed I/O
 */
void set_io_timeout(long clockTicks);

/**
 * @brief Sets the time increment for the following timed I/O functions: count, pulse_in,
 * pulse_out, rc_time.
 *
 * @details Time increment is set in clock ticks.  For example, the default of 1 us
 * units is specified with set_io_dt(CLKFREQ/1000000).  For 2 microsecond units, use
 * set_io_dt(CLKFREQ/500000).
 *
 * @param clockticks Number of clock ticks that represents one I/O time increment.
 */
void set_io_dt(long clockticks);




/**
 * @}
 *
 * @name SPI
 * @{
 */




/**
* @brief Receive data from a synchronous serial device
*
* @param pinDat Data pin.
* @param pinClk Clock pin.
* @param mode Order and orientation to clock pulse options: 
* MSBPRE, LSBPRE, MSBPOST,LSBPOST.
* @param bits Number of binary values to transfer.
*
* @returns Value received from the synchronous serial device.
*/
int shift_in(int pinDat, int pinClk, int mode, int bits);

/**
* @brief Send data to a synchronous serial device
*
* @param pinDat Data pin
* @param pinClk Clock pin
* @param mode Order that bits are transmitted, either LSBFIRST or MSBFIRST.
* @param bits Number of binary values to transfer.
* @param value to transmit.
*/
void shift_out(int pinDat, int pinClk, int mode, int bits, int value);




/**
 * @}
 *
 * @name I2C
 * @{
 */




/**
 * @brief Set up a simple serial driver with transmit & receive pins.
 *
 * @param sclPin the I2C bus' serial clock pin.
 *
 * @param sdaPin the I2C bus' serial data pin.
 *
 * @param sclDrive sets I/O pin connected to SCL line to send high signals by 
 * either (sclDrive = 0) allowing the pull-up resistor on the bus to pull the 
 * line high, or (sclDrive = 1) by setting the I/O pin to output and driving the
 * line high.  sclDrive = 0 is by far the most common arrangement.  sclDrive = 1 
 * is used with some Propeller boards that do not have a pull-up resistor on the 
 * EEPROM's SCL line.    
 *
 * @returns busID - a pointer to the I2C bus info in memory.  The busID value gets
 * passed to i2c_out, i2c_in, and i2c_busy's busID parameter to select which I2C 
 * bus to use. 
 */
i2c *i2c_newbus(int sclPin, int sdaPin, int sclDrive);


/**
 * @brief Send data to device using I2C protocol.
 *
 * @details This function uses Simple Libraries/Protocol/libsimplei2c for
 * clock and data line signaling.  You can also use this library to create
 * custom I2C functions.  Other I2C signaling options are included in
 * Propeller GCC.  Search for i2C in the propgcc folder for more info.  
 *
 * @param *busID I2C bus identifier.  i2c_newbus returns this pointer.
 *
 * @param i2cAddr 7 bit I2C device address.   
 *
 * @param memAddr Value for setting memory address pointer inside the I2C
 * device.
 *
 * @param memAddrCount Number of bytes to use for memAddr.  This value can 
 * be zero for no register or memory address data, in which case memAddr
 * can be set to NULL.
 *
 * @param *data Pointer to bytes to send to the I2C device.
 *
 * @param dataCount Number of bytes in data to send.  Use a positive value to transmit
 * least significant byte first, or a negative value to transmit most significant 
 * byte first.
 *
 * @returns total number of bytes written. Should be 1 + memAddrCount + dataCount.  
 */
HUBTEXT int  i2c_out(i2c *busID, int i2cAddr, 
                     int memAddr, int memAddrCount, 
                     const unsigned char *data, int dataCount);


/**
 * @brief Receive data from device using I2C protocol.
 *
 * @details This function uses Simple Libraries/Protocol/libsimplei2c for
 * clock and data line signaling.  You can also use this library to create
 * custom I2C functions.  Other I2C signaling options are included in
 * Propeller GCC.  Search for i2C in the propgcc folder for more info.  
 *
 * @param *busID I2C bus identifier.  i2c_newbus returns this pointer.
 *
 * @param i2cAddr 7 bit I2C device address.   
 *
 * @param memAddr Value for setting memory address pointer inside the I2C
 * device.
 *
 * @param memAddrCount Number of bytes to use for memAddr.  This value can 
 * be zero for no register or memory address data, in which case memAddr
 * can be set to NULL.
 *
 * @param *data Pointer to bytes set aside for receiving data from the I2C device.
 *
 * @param dataCount Number of bytes in data to send.  Use a positive value to load data
 * into result variable(s) least significant byte first, or a negative value for most 
 * significant byte first.
 *
 * @returns total number of bytes written. Should be 1 + memAddrCount + dataCount.  
 */
HUBTEXT int  i2c_in(i2c *busID, int i2cAddr, 
                    int memAddr, int memAddrCount, 
                    unsigned char *data, int dataCount);


/**
 * @brief Check if I2C device is busy or responding.
 *
 * @param *busID I2C bus identifier.  i2c_newbus returns this pointer.
 *
 * @param i2cAddr 7 bit I2C device address.   
 *
 * @returns 1 if busy, 0 if ready.  
 */
HUBTEXT int i2c_busy(i2c *busID, int i2cAddr);




/**
 * @}
 *
 * @name Propeller EEPROM
 * @{
 */




/**
 * @brief Store a byte value at a certain address in the Propeller Chip's
 * dedicated EEPROM.
 *
 * @param value The byte value to store in EEPROM.
 *
 * @param addr The EEPROM address where the value is to be stored.
 * 
 */
void ee_putByte(unsigned char value, int addr);

/**
 * @brief Get a byte value from a certain address in the Propeller Chip's
 * dedicated EEPROM.
 *
 * @param addr The EEPROM address that with the byte value that should be fetched.
 *
 * @returns value The byte value stored by the EEPROM at the address specified
 * by the addr parameter.
 */
char ee_getByte(int addr);


/**
 * @brief Store an int value at a certain address in the Propeller Chip's
 * dedicated EEPROM.  An int value occupies four bytes, so the next value
 * should be stored at an address value that's four bytes higher.
 *
 * @param value The int value to store in EEPROM.
 *
 * @param addr The EEPROM address where the value is to be stored.
 */
void ee_putInt(int value, int addr);

/**
 * @brief Get an int value from a certain address in the Propeller Chip's
 * dedicated EEPROM.  If you are fetching several int values, make sure to 
 * add 4 to the addr value with each successive call.
 *
 * @param addr The EEPROM address with the int value that should be fetched.
 *
 * @returns value The int value stored by the EEPROM at the specified address.
 */
int ee_getInt(int addr);

/**
 * @brief Store a string of byte values starting at a certain address in 
 * the Propeller Chip's dedicated EEPROM.
 *
 * @param s Address of a char array containing the string of bytes.
 *
 * @param n The number of bytes to copy from the array.
 *
 * @param addr The EEPROM address of the first byte in the string.
 */
void ee_putStr(unsigned char *s, int n, int addr);

/**
 * @brief Fetch a string of byte values starting at a certain address in 
 * Propeller Chip's dedicated EEPROM.  
 *
 * @param s Address of a char array to receive the string of bytes fetched
 * from EEPROM.
 *
 * @param n The number of bytes to copy from EEPROM to the array.
 *
 * @param addr The EEPROM address of the first byte in the string.
 * 
 * @returns The address of the array that stores the characters that
 * were fetched.
 */
unsigned char* ee_getStr(unsigned char* s, int n, int addr);

/**
 * @brief Store a 32-bit precision floating point value at a certain address
 * in the Propeller Chip's dedicated EEPROM.  A 32-bit value occupies four bytes
 * so if you are storing values in a sequence, make sure to add 4 to each addr
 * parameter value.
 *
 * Make sure that the Math box is checked in the Project Manager.  In Simple View,
 * click the Show Project Manager button in SimpleIDE's bottom-left corner.  Then
 * click the Linker tab, and check the Math Lib box.
 *
 * @param value The 32-bit floating point float value to store in EEPROM.
 *
 * @param addr The EEPROM address where the value is to be stored.
 */
void ee_putFloat32(float value, int addr);

/**
 * @brief Fetch a 32-bit precision floating point value from a certain address
 * in the Propeller Chip's dedicated EEPROM.  A 32-bit value occupies four bytes
 * so if you are fetching values in a sequence, make sure to add 4 to each addr
 * parameter value.
 *
 * Make sure that the Math box is checked in the Project Manager.  In Simple View,
 * click the Show Project Manager button in SimpleIDE's bottom-left corner.  Then
 * click the Linker tab, and check the Math Lib box.
 *
 * @param addr The EEPROM address with the 32-bit floating point float value 
 * that should be fetched.
 *
 * @returns value The float value stored by the EEPROM at the specified address.
 */
float ee_getFloat32(int addr);

/**
 * @brief Optional function for setting a custom EEPROM configuration.  Other
 * ee_ functions automatically check if the EEPROM has been initialized, and 
 * if not, they use default settings equivalent to ee_config(28, 29, 0).  This
 * function can be called before any other ee_ functions to replace those 
 * defaults with custom settings.    
 *
 * @warning: If you're going to call this function, make sure to do it before
 * calling any other ee_ functions.  If one ee_ function gets called before this,
 * it'll set up defaults, and this function cannot override them after they have
 * been set.
 *
 * @param sclPin Propeller I/O pin connected to the EEPROM's SCL (serial
 * clock) pin.
 *
 * @param sdaPin Propeller I/O pin connected to the EEPROM's SDA (serial
 * data) pin.
 *
 * @param sclDrive Use 0 for standard design where the SCL pin has a pull-up
 * resistor, or 1 if it does not have a pull-up and needs to be driven.
 */
void ee_config(int sclPin, int sdaPin, int sclDrive);



/**
 * @}
 *
 * @name SD Card
 * @{
 */



/**
 * @brief Mount an SD card with the minimal 4-pin interface.  For <a href="html/http://learn.parallax.com" target="_blank">Parallax Learn Site</a>
 * examples, see: <a href="html/http://learn.parallax.com/propeller-c-simple-devices/sd-card-data" target="_blank">SD Card Data</a> and <a href="html/http://learn.parallax.com/propeller-c-simple-devices/play-wav-files" target="_blank">Play WAV Files</a>.
 *
 * @param doPin The SD card's data out pin.
 *
 * @param clkPin The SD card's clock pin.
 *
 * @param diPin The SD card's data in pin.
 *
 * @param csPin The SD card's chip select pin.
 *
 * @returns status 0 if successful, or an error code.
 */
int sd_mount(int doPin, int clkPin, int diPin, int csPin);



/**
 * @}
 *
 * @name Multicore
 * @{
 */





/**
 * @brief Run a function's code in the next available cog (processor).
 *
 * @details cog_run is designed to make launching application level
 * functions (typically from the main file) quick and easy. All you have
 * to do is pass a pointer to a function with no return value or parameters
 * along with the number for extra memory to reserve. The value returned 
 * can be used to shut down the process and free up memory and a cog later
 * by passing it to cog_end. 
 *
 * @param *function pointer to a function with no parameters 
 * or return value. Example, if your function is void myFunction(), then
 * pass &myFunction. 
 *
 * @param stacksize Number of extra int variables for local variable declarations
 * and call/return stack. This also needs to cover any local variable declarations
 * in functions that your function calls, including library functions. Be liberal 
 * with extra stack space for prototyping, and if in doubt, 40 to whatever value 
 * you calculate.
 *
 * @returns *coginfo Address of memory set aside for the cog. Make sure to save this value
 * in a variable if you intend to stop the process later with cog_end or check which cog
 * the process was launched into with cog_num.
 */
int *cog_run(void (*function)(void *par), int stacksize);


/**
 * @brief Get the cog ID.
 *
 * @param *coginfo the address returned by cog_run.
 *
 * @returns The cog ID number.
 */
int cog_num(int *coginfo);


/**
 * @brief End function code running in another cog that was launched with cog_run.
 *
 * @details This function uses the value returned by cog_run to stop a function
 * running in another cog and free the stack space cog_run allocated with its
 * stacksize parameter.
 *
 * @param *coginfo the address returned by cog_run.
 */
void cog_end(int *coginfo);



/**
 * @}
 *
 * @name Terminal Control
 * @{
 */



/**
  @brief Send a command to SimpleIDE Terminal.  Examples of commands
  include HOME, CLS, BKSP, CRSRXY, and others.  All sixteen are listed
  in the SimpleIDE Terminal Constants section above.  Click the term_cmd
  link to go to the details section and see parameter descriptions and
  code examples.  
  
  @code
    // Examples
    term_cmd(HOME);          // Cursor -> home (0, 0) position
    term_cmd(CLS);           // Clear screen and send cursor HOME
    term_cmd(BKSP);          // Backspace one character
    // Position cursor 4 spaces from left and 2 rows down from top.
    term_cmd(CRSRXY, 4, 2);  
    // Position cursor 4 spaces from left, but do not change row.
    term_cmd(CRSRX, 4);  
    // Position cursor 2 rows from top, but do not change spaces
    // from left.
    term_cmd(CRSRY, 2);  
  @endcode
  
  @param termConst One of the sixteen terminal control 
  constants listed in the SimpleIDE Terminal Constants 
  part of the Macros section above.
  
  @param ... No additional parameters are required for
  CLS, HOME, and most of the others.  Only CRSRXY requires
  two additional parameters, and CRSRX and CRSRY require
  a single additional parameter.  If CRSRXY is used, 
  arguments for  x (spaces from left) and y (linefeeds from 
  top) are required.  If CRSRX is used, only the x value is 
  required, and if CRSRY is used, only the y value is required.
*/
void term_cmd(int termConst, ...); 



/**
* @}
*
* @name Calculation Extras
* @{
*/



/**
* @brief Constrains a floating point value to a range from a minimum value to a
* maximum value. If the value is above the max constraint, this function returns
* the maximum constraint value. If the value is below the min constraint, it returns 
* the minimum constraint value. If value falls between the max and min constraints, 
* it returns the same value that was received. 
*
* @param value Value to constrain.
*
* @param min Minimum constraint.
*
* @param max Maximum constraint.
*
* @returns Constrained result.
*/
float constrainFloat(float value, float min, float max); 


/**
* @brief Constrains an integer value to a range from a minimum value to a
* maximum value. If the value is above the max constraint, this function returns
* the maximum constraint value. If the value is below the min constraint, it returns 
* the minimum constraint value. If value falls between the max and min constraints, 
* it returns the same value that was received. 
*
* @param value Value to constrain.
*
* @param min Minimum constraint.
*
* @param max Maximum constraint.
*
* @returns Constrained result.
*/
int constrainInt(int value, int min, int max);


/**
* @brief Take bytes in one variable at varAddr, swap their order, and store them 
* in another variable at resultAddr. This is useful for communication with peripherals
* that transmit/receive bytes in multi-byte values in reverse order from how the 
* Propeller stores it in RAM. 
*
* @param *resultAddr Address of variable to store result. Make sure it's the
* same type as the varAddr parameter.
*
* @param *varAddr Address of source variable. Accepts any variable type.
*
* @param *byteCount Number of bytes in the variable.
*/
void endianSwap(void *resultAddr, void *varAddr, int byteCount);


/**
* @brief Maps a floating point value from its position in one range to its corresponding. 
* position in a different range. For example, 3.0 in a range of 0.0 to 10.0 would map to
* 30.0 in a range of 0.0 to 100.0. Note: In some cases, 32 bit floating point values will 
* round slightly. For example 2.0/3.0 = 0.666667. 
*
* @param value The value to map.
*
* @param fromMin Minimum in value's range.
*
* @param fromMax Maxiumum in value's range.
*
* @param toMin New range's minimum.
*
* @param toMax New ranges maximum.
*
* @returns A result with a position in the new range that's equivalent to value's
* position in its range.
*/
float mapFloat(float value, float fromMin, float fromMax, float toMin, float toMax);


/**
* @brief Maps an integer value from its position in one range to its corresponding. 
* position in a different range. For example, 3 in a range of 0 to 10 would map to
* 30 in a range of 0 to 100. 
*
* @param value The value to map.
*
* @param fromMin Minimum in value's range.
*
* @param fromMax Maximum in value's range.
*
* @param toMin New range's minimum.
*
* @param toMax New ranges maximum.
*
* @returns A result with a position in the new range that's equivalent to value's
* position in its range.
*/
int mapInt(int value, int fromMin, int fromMax, int toMin, int toMax);


/**
* @brief Generates a pseudo-random integer value that falls in a range from 
* limitLow to limitHigh. This function uses the system clock and I/O registers
* to create a new seed with each call, so it is very unlikely to generate the 
* same sequence twice in a row. 
*
* @param limitLow Minimum limit in the random number's range.
*
* @param limitHigh Maximum limit in the random number's range.
*
* @returns A pseudo-random number within the defined range.
*/
int random(int limitLow, int limitHigh);




/**
* @}
*
* @name Deprecated
* @{
*/



/**
 * @brief Mark the current time (deprecated).
 *
 * @details The timeout function uses the marked time to determine if a timeout
 * has occurred.  
 * 
 * @note This function has been deprecated because it doesn't support use in 
 * more than one cog.  Use this code instead:
 * 
 * @code
 * // CNT stores current number of system clock ticks elapsed.
 * int t = CNT;           // Mark current time by storing in variable
 * @endcode
 */
void mark(void);


/**
 * @brief Compares the time against the time elapsed since mark (deprecated).
 *
 * @details The default time increment is 1 us, so timeout(2000) will return 1
 * if 2 ms or more has elapsed since mark, or 0 if it has not.
 * 
 * @note This function has been deprecated because it doesn't support use in 
 * more than one cog.  Use this code instead:
 * 
 * @code
 * // CLKFREQ stores number of system clock ticks in 1 second.
 * // CNT stores current number of system clock ticks elapsed.
 * int dt = CLKFREQ/2;    // Pick a timeout, 1/2 a second in this case
 * int t = CNT;           // Mark current time by storing in variable
 * while(CNT - t < dt)    // Repeat until timeout
 * {
 *   // Add code repeated until time elapsed is larger than dt here.
 * }
 * @endcode
 *
 * @param time Number of time increments.
 */
int timeout(int time);

/**
 * @brief Waits a certain number of time increments from the last call to
 * mark or wait functions (deprecated).
 *
 * @details The default time increment is 1 us, so wait(2000) will return wait
 * until 2 us after the last call to mark or wait.  This function automatically 
 * updates the marked time; you can call it repeatedly without having to call mark.
 * 
 * @note This function has been deprecated because it doesn't support use in 
 * more than one cog.  Use this code instead:
 * 
 * @code
 * // CLKFREQ stores number of system clock ticks in 1 second.
 * // CNT stores current number of system clock ticks elapsed.
 * int t = CNT;           // Mark current time by storing in variable
 * int dt = CLKFREQ/10;   // Pick time increment, 1/10 second in this case
 * while(1)               // Repeat indefinitely
 * {
 *   // Variable timed code here.  Must last less than dt.
 *   waitcnt(t += dt);
 *   // Code that must start at precise intervals here.
 * }
 * @endcode
 *
 * @param time Number of time increments.
 */
void wait(int time);



/**
 * @}
 */
 
 

#if defined(__cplusplus)
}
#endif
/* __cplusplus */  
#endif
/* SIMPLETOOLS_H */  

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
