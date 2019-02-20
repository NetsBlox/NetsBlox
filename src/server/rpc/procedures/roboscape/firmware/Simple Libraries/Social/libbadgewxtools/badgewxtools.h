/**
 * @file badgewxtools.h
 *
 * @author Parallax Inc.
 *
 * @copyright
 * Copyright (C) Parallax, Inc. 2015. All Rights MIT Licensed.
 *
 * @brief This library provides convenient functions 
 * for a variety of Parallax eBadge operations.  
 *
 * @version 0.5 
 *
 * Note: This is the early adopter version of a library that 
 * is fairly new and still a work-in-progress.  If you find what you 
 * feel are errors or omissions that should be addressed in an upcoming 
 * revision, please email editor@parallax.com.
 *
 * To-do: 
 * @li Shape black to white pixels
 * @li Shape white to black pixels
 * @li Shape invert pixels
 * @li Retest multicore i2c collisions fix
 * @li Test with fdserial
 * @li Test for global variable name conflicts
 * @li Change spin2cpp generated functions that should be void but return 0
 * @li Update retrieve return value
 * @li Prune stack sizes
 * @li Prune unused functions
 * @li Organize private functions in .h file
 * @li Fix contact clearing (not same as erasing)
 * @li Add ending EEPROM address configuration
 * @li Add individual setup options
 * @li Add IR TV remote example
 * @li Add timekeeping example to package
 * @li Add audio example to package
 * @li Add dash to x, y, and z axis in docs
 * @li Change L & R constants to 1 and 0
 * @li Change ssize to strlen
 * @li Add full info to all library files
 * @li Replace spin2cpp generated with hand code
 */
 
#include "simpletools.h"
#include <stdint.h>

#ifndef BADGETOOLS_H
#define BADGETOOLS_H

#if defined(__cplusplus)
extern "C" {
#endif

/**
 * @name LEDs
 * @{
 */

#ifndef ON
/**
 * @brief For turning blue LEDs on.  Example: led(0, ON) would turn the 
 * LED by the P27 label on.  
 */
#define ON 1
#endif

#ifndef OFF
/**
 * @brief For turning off blue or RGB LEDs.  Examples: led(1, OFF), would 
 * turn the LED by the P26 label off.  rgb(L, OFF) would turn off the left
 * rgb LED, and rgbs(OFF, OFF) would turn off the left and right RGB LEDs.
 */
#define OFF 0
#endif


/**
 * @}
 *
 * @name Accelerometer
 * @{
 */

#ifndef SCR_BLACK
/**
 * @brief Sets an oLED screen pixel to black.  Example: point(27, 35, SCR_BLACK)
 * sets a pixel 27 from the right and 35 down to black.
 */
#define SCR_BLACK (0)
#endif

#ifndef SCR_WHITE
/**
 * @brief Sets an oLED screen pixel to white.  Example: point(100, 50, SCR_WHITE)
 * sets a pixel 100 from the right and 50 down to white.
 */
#define SCR_WHITE (1)
#endif

#ifndef SCR_XOR
/**
 * @brief Applies XOR operation to pixels in a shape.  Example: shape(frog,
 * XOR, 36, 12, 30, 40) would invert the pixels in the frog shape array.  
 * the black pixels would be made white and vice-versa.
 */
#define SCR_XOR (3)
#endif

#ifndef LARGE
/**
 * @brief For setting oLED character size to 32x16 pixels.  Example: 
 * text_size(LARGE).
 */
#define LARGE 1
#endif

#ifndef SMALL
/**
 * @brief For setting oLED character size to 7x5 pixels.  Example: 
 * text_size(SMALL).
 */
#define SMALL 0
#endif

/**
 * @}
 *
 * @name Accelerometer
 * @{
 */

#ifndef AY
/**
 * @brief For choosing the accelerometer's y-axis.  Example accel(AY) returns the component
 * of the earth's gravitational field acting on the accelerometer's y-axis.
 */
#define AY 0
#endif

#ifndef AX
/**
 * @brief For choosing the accelerometer's x-axis.  Example accel(AX) returns the component
 * of the earth's gravitational field acting on the accelerometer's x-axis.
 */
#define AX 1
#endif

#ifndef AZ
/**
 * @brief For choosing the accelerometer's z-axis.  Example accel(AZ) returns the component
 * of the earth's gravitational field acting on the accelerometer's z-axis.
 */
#define AZ 2
#endif

/**
 * @}
 */

/**
 * @brief Set up all available badge drivers.  Call this function at the 
 * start of any given program to allow access to ensure that the rest of 
 * this library's functions work properly.
 *
 * @details A call to this function sets up these badge subsystems: oLED 
 * display, LED, RGB LED, touch buttons, accelerometer, infrared 
 * communication, and EEPROM storage. Example badge_setup().
 *
 * @returns 0.
 */
int badge_setup( void );

/**
 * @name Individual setup calls
 * @{
 */


/**
 * @}
 *
 * @name Touch Buttons
 * @{
 */

/**
 * @brief Gets the state of a touch button/ nav slider (1) pressed, (0) not pressed.
 * Numbering {7, 6, 5, 4, 3, 2, 1} maps the pads/positions by 
 * [L touch][L NAV left][L NAV ctr][L NAV right][R NAV left][R NAV ctr][R NAV right][R touch].  
 * Example: int state = button(3);  If state stores 1, it means the right nav slider is pressed
 * down.  If it instead stores 0, the slider is 
 * not pressed/slid.
 *
 * @returns Binary 1 if pressed; 0 if not pressed.
 *
 */
char button( char b );

/**
 * @brief Gets the states of all eight touch buttons and nav sliders, and returns them in
 * a value with 1s and 0s that correspond to each pad/position.  Example:
 * int states = buttons();  If states stores 0b10000010, it means: 
 * {left touchpad (B) pressed, left nav slider not in any position, right nav slider held right,
 * right touchpad (A) not pressed}.
 *
 * @returns An 8-bit value with binary 1/0 digits indicating the on/off 
 * state of the 7 touch buttons.  The rightmost binary digit indicates the
 * state of the upper-right button by the P27 label.  The second from the right
 * indicates the state of the button by the P26 label, and so on, up through
 * the 5th from the right, 
 */
unsigned char buttons( void );

/**
 * @brief Used to set the RC time threshold used to detect a button press on the
 * A and B touchpads on the back of the BadgeWX's PCB.  Range is from 
 * 0 (low sensitivity) to 15 (high sensitivity).  Default is 7.
 */
void touch_sensitivity_set( char sens );


/**
 * @}
 *
 * @name Accelerometer
 * @{
 */

/**
 * @brief Measures acceleration and tilt on one of 3 axes (AX, AY, or AZ) 
 * in terms of centigravity (cg) units, which is 100ths of 1 gravity (1 g).
 * With the badge laying flat on a table, the AX is left/right, AY is 
 * forward/backward, and AZ is up/down.  Example: int x = accel(AX) copies
 * the accelerometer measurement into the x variable.  The result will be 0 
 * if held flat, and could go as high as +100 if held on its left edge, 
 * or -100 if held on its right edge.  Note, the accelerometer's 
 * actual resolution is in 64ths of a 1 g.
 *
 * @param axis The AX, AY, or AZ sensing axis.
 */
int accel(int axis);

/**
 * @brief Measures acceleration and tilt on all 3 axes (x, y, and z) 
 * in terms of centigravity (cg) units, which is 100ths of 1 gravity (1 g).
 *
 * @param *x Address of the variable for storing the x-axis measurement.
 *
 * @param *y Address of the variable for storing the y-axis measurement.
 *
 * @param *z Address of the variable for storing the z-axis measurement.
 */
void accels(int *x, int *y, int *z);

/**
 * @brief Check if accelerometer was shaken recently, within the last
 * half second.
 *
 * @returns 1 if shaken, 0 if not.
 */
int accel_shaken(void);

/**
 * @}
 *
 * @name Contact Storage
 * @{
 */

/**
 * @brief Store a character string of up to 128 characters to EEPROM.
 * Example: char s[] = "abcd"; store(s);
 *
 * @details String length can be 128 or less.
 *
 * @param contact Address of the string.
 *
 * @returns Index of the record in EEPROM.  The first record gets an 
 * index of 0, the second an index of 1, and so-on.
 */
int store(char *contact);

/**
 * @brief Check if a string has already been stored in EEPROM.  Example: 
 * if(!stored("abcd")) store("abcd"); 
 *
 * @details *s The address of the string that should be checked 
 * against strings stored in EEPROM.   String length can be 128 or 
 * less.
 *
 * @returns 1 if a matching record was found, or 0 if not.
 */
int stored(char * s);

/**
 * @brief Copy string with a certain index number from EEPROM to a 
 * character array.
 *
 * @details String length can be 128 or less.
 *
 * @param *contact Address of the array where the string should be
 * copied.
 *
 * @param recIdx Index number of the string.
 */
void retrieve(char *contact, int recIdx);

/**
 * @brief Use to store strings to EEPROM in a manner similar to displaying
 * combinations of strings and variables in the SimpleIDE terminal with the
 * print function.  Examples: eeprint("Hello EEPROM"); float f = PI; int
 * n = 4s; char s[] = "PI and answer to universe"; eeprint("%1.3f\n%03d\n
 * %30s\n", f, n, s); // Result to EEPROM: "Hello EEPROM"[0]"3.141"[10]"042"
 * [10]"PI and answer to universe"[10][0].  This information can be conveniently retrieved
 * back from EEPROM and placed in variables with the eescan function.
 *
 * @details String length can be 128 or less.
 *
 * @param *fmt a print compatible format string.
 *
 * @param ... a print compatible list of arguments.
 *
 * @returns Record index number in EEPROM.
 */
int eeprint(const char *fmt, ...);

/**
 * @brief Can be called before storing a record with eeprint.  Example:
 * if(!eeprinted("Hello EEPROM") eeprint("Hello EEPROM");
 *
 * @details String length can be 128 or less.
 *
 * @param *fmt a print compatible format string.
 *
 * @param ... a print compatible list of arguments.
 *
 * @returns 0 if not in EEPROM, or the record number if it is.
 */
int eeprinted(const char *fmt, ...);

/**
 * @brief Use to retrieve strings to EEPROM in a manner similar to retrieving
 * strings that represent combinations of strings and variables from the 
 * SimpleIDE terminal with the scan function.  Examples: This example will
 * retrieve the what the eeprint examples stored in EEPROM: char s1[14]; 
 * eescan(1, "%s", s1); float f; int n; char s2[30]; eescan("%f%d%s", f, 
 * n, s2); // Result: s1 = "Hello EEPROM", f = 3.141, n = 42, s2 = "PI and 
 * answer to universe".  
 *
 * @details String length can be 128 or less.
 *
 * @param recIdx An integer record index value.
 *
 * @param *fmt a print compatible format string.
 *
 * @param ... a print compatible list of arguments.
 *
 * @returns The number of blocks successfully scanned.
 */
int eescan(int recIdx, const char *fmt, ...);

/**
 * @brief Find out how many contacts are currently stored in EEPROM.
 * This is useful for setting up a loop to fetch all contacts.
 *
 * @returns Number of contacts.
 */
int contacts_count();

/**
 * @brief Erases user portion of EEPROM by placing 255 in each cell.  
 * This erasure affects addresses 32768 through 65535.
 */
void contacts_eraseAll();

/**
 * @brief Display all contacts in SimpleIDE Terminal.
 */
void contacts_displayAll();

/**
 * @brief Set the start address of the contacts.  This can be used to
 * reserve some user EEPROM space for other purposes before the start of
 * the contacts.
 *
 * @param address EEPROM starting address for contact storage.
 */
void contacts_setStartAddr(int address);

/**
 * @brief Store a byte value at a certain address in the Propeller Chip's
 * dedicated EEPROM.
 *
 * @param value The byte value to store in EEPROM.
 *
 * @param addr The EEPROM address where the value is to be stored.
 * 
 */
void ee_writeByte(unsigned char value, int addr);

/**
 * @brief Get a byte value from a certain address in the Propeller Chip's
 * dedicated EEPROM.
 *
 * @param addr The EEPROM address that with the byte value that should be fetched.
 *
 * @returns value The byte value stored by the EEPROM at the address specified
 * by the addr parameter.
 */
char ee_readByte(int addr);

/**
 * @brief Store a short value at a certain address in the Propeller Chip's
 * dedicated EEPROM.  A short value occupies two bytes, so the next value
 * should be stored at an address value that's two bytes higher.
 *
 * @param value The int value to store in EEPROM.
 *
 * @param addr The EEPROM address where the value is to be stored.
 */
void ee_writeShort(short value, int addr);

/**
 * @brief Get a short value from a certain address in the Propeller Chip's
 * dedicated EEPROM.  If you are fetching several short values, make sure to 
 * add 2 to the addr value with each successive call.
 *
 * @param addr The EEPROM address with the int value that should be fetched.
 *
 * @returns value The int value stored by the EEPROM at the specified address.
 */
short ee_readShort(int addr);

/**
 * @brief Store an int value at a certain address in the Propeller Chip's
 * dedicated EEPROM.  An int value occupies four bytes, so the next value
 * should be stored at an address value that's four bytes higher.
 *
 * @param value The int value to store in EEPROM.
 *
 * @param addr The EEPROM address where the value is to be stored.
 */
void ee_writeInt(int value, int addr);

/**
 * @brief Get an int value from a certain address in the Propeller Chip's
 * dedicated EEPROM.  If you are fetching several int values, make sure to 
 * add 4 to the addr value with each successive call.
 *
 * @param addr The EEPROM address with the int value that should be fetched.
 *
 * @returns value The int value stored by the EEPROM at the specified address.
 */
int ee_readInt(int addr);

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
 * @param fpVal The 32-bit floating point float value to store in EEPROM.
 *
 * @param addr The EEPROM address where the value is to be stored.
 */
void ee_writeFloat32(float fpVal, int addr);


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
float ee_readFloat32(int addr);

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
void ee_writeStr(char *s, int n, int addr);

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
char* ee_readStr(unsigned char *s, int n, int addr);


/**
 * @brief Start the PWM driver for the discrete LEDs. Uses a cog. 
 */
void led_pwm_start( void );

/**
 * @brief Stop the PWM driver for the discrete LEDs.  Frees the cog used by the driver.  
 */
void led_pwm_stop( void );

/**
 * @brief Set the brightness of the two discrete LEDs.  
 *
 * @param side Which discrete LED to change (0-left or 1-right).
 *
 * @param led_right The brightness of the specified discrete LED, ranges from 0 (off) to 15 (full brightness).
 */
void led_pwm_set( char side, char level );



//void contacts_clear(void);
//void contacts_setEndAddr(int address);

/**
 * @}
 *
 * @name Infrared Communication
 * @{
 */

/**
 * @brief Send a character string to another badge.  Example:
 * char s[] = "Hello other badge"; send(s);
 *
 * @param *s Address of a string to send.
 * 
 * @returns Length of the string that was sent.
 */
int send(char *s);

/**
 * @brief Receive a character string from another badge.
 * 
 * @details String length can be 128 or less.
 *
 * @param *s Address of the character array to store the string that was
 * received.
 *
 * @returns The length of the string.
 */
int receive(char *s);

/**
 * @brief Clear the infrared send/receive buffers.  The most common use of
 * this function is to clear any stray messages that my have arrived before
 * receiving a contact from another badge.
 */
void irclear(void);

/**
 * @brief Use to store transmit strings to another badge in a manner similar 
 * to displaying combinations of strings and variables in the SimpleIDE 
 * terminal with the print function.  Examples: irprint("Hello eBadge"); 
 * float f = PI; int n = 4s; char s[] = "PI and answer to universe"; 
 * irprint("%1.3f\n%03d\n %30s\n", f, n, s); // Result to other badge: 
 * "Hello EEPROM"[0]"3.141"[10]"042"[10]"PI and answer to universe"[10][0]. 
 * This information can be conveniently received by the other badge using 
 * the irscan function. 
 *
 * @details String length can be 128 or less.
 *
 * @param *fmt a print compatible format string.
 *
 * @param ... a print compatible list of arguments.
 *
 * @returns Record index number in EEPROM.
 */
int irprint(const char *fmt, ...);

/**
 * @brief Use to receive strings over IR from another badge in a manner 
 * similar to retrieving strings that represent combinations of strings 
 * and variables from the  SimpleIDE terminal with the scan function.  
 * Examples: This example will retrieve what the irprint examples 
 * transmitted to the other badge: char s1[14]; eescan(1, "%s", s1); 
 * float f; int n; char s2[30]; eescan("%f%d%s", f, n, s2); // 
 * Result: s1 = "Hello EEPROM", f = 3.141, n = 42, s2 = "PI and 
 * answer to universe".  
 *
 * @details Total string length can be 128 or less.
 *
 * @param *fmt a print compatible format string.
 *
 * @param ... a print compatible list of arguments.
 *
 * @returns The number of blocks successfully scanned.
 */
int irscan(const char *fmt, ...);

/**
 * @brief Transmits a string with a specified number of characters over IR.
 *
 * @details ssize can be 128 or less.
 *
 * @param *s Address of a string to send.
 *
 * @param ssize Maximmum size of the string.
 *
 */
void ir_send(char *s, int ssize);

/**
 * @brief Receive a string with a specified maxiumum number of characters over
 * IR.
 *
 * @details ssize can be 128 or less.
 *
 * @param *s Address of the character array to store the string that was
 * received.
 *
 * @param ssize Maximmum size of the string.
 *
 * @returns The length of the sting.
 */
int ir_receive(char *s, int ssize);

/**
 * @}
 *
 * @name oLED Screen Display (Basics)
 * @{
 */

/**
 * @brief Use to display strings on the oLED display in a manner similar 
 * to displaying combinations of strings and variables in the SimpleIDE 
 * terminal with the print function.  Example: oledprint("Hello!!!"); 
 * text_size(SMALL); cursor(0, 4); float f = PI; int n = 4s; char s[] = 
 * "PI and Universe"; oledprint("%1.3f, %03d\n%30s", f, n, s); 
 * // Result to oLED display: Upper half large print by default - Hello!!!
 * Small print line 4: 1.414, 042 Line 5 "PI and Universe"
 *
 * @details String length can be 128 or less.  Word wrap is automatic if
 * line width is exceeded.
 *
 * @param *fmt a print compatible format string.
 *
 * @param ... a print compatible list of arguments.
 *
 * @returns Record index number in EEPROM.
 */
int oledprint(const char *fmt, ...);

/**
 * @brief Set the text size to either 32x16 pixel (LARGE) or 7x5 (SMALL)
 * characters.  Examples: text_size(LARGE);...text_size(SMALL)...text_size(LARGE).
 *
 * @param size Size of characters, either LARGE (32x16 pixels) or SMALL (7x5
 * pixels).
 */
void text_size(int size);

/**
 * @brief Position the cursor to a certain column and row for printing text on 
 * the oLED display.  Column can be 0 to 7 and row can be 0 or 1 in default 
 * LARGE text mode.  In SMALL text mode, column can be 0 to 31, and row can be
 * 0 to 7.
 *
 * @param col the column (character position) from left.
 *
 * @param row the row (line number) from top.
 */
void cursor(int col, int row);

/**
 * @brief Display a character string on the oLED display.
 *
 * @details String length can be 128 or less.  Word wrap is automatic if
 * line width is exceeded.
 *
 * @param *str Address of string to be displayed.
 */
void string(char *str);

/**
 * @brief Clear the display.
 *
 * @details Returns cursor to top-left 0, 0.
 */
int clear( void );

/**
 * @brief Invert (or not) the pixel colors in the display.  Use invert(0) for 
 * white pixels on a black background, or invert(1) for black pixels on a white
 * background. 
 */
void invert(int i);

/**
 * @brief Plot a point on the oLED screen.  
 *
 * @param x Number of pixels from left side of screen.  The value increases 
 * from 0 (left) to 127 (right).  
 *
 * @param y the number of pixels from the top of the screen.  The value 
 * increases from 0 (top)to 63 (bottom).  Color is 1 for white, 0 for black.
 * 
 * @param color The pixel color 1 for white, 0 for black.
 */
void point( int x, int y, int color);

/**
 * @brief Plot a line on the oLED screen.  
 *
 * @param x0 The x coordinate of the first point in the line.  Measured as a 
 * number of pixels from left side of screen.  The value increases 
 * from 0 (left) to 127 (right).  
 *
 * @param y0 The y coordinate of the first point in the line.  Measured as a 
 * number of pixels from the top of the screen.  The value increases 
 * from 0 (top) to 63 (bottom).  
 *
 * @param x1 The x coordinate of the second point in the line.
 *
 * @param y1 The y coordinate of the second point in the line.
 * 
 * @param c The pixel color 1 for white, 0 for black.
 */
void line( int x0, int y0, int x1, int y1, int c);

/**
 * @brief Plot a box on the oLED screen.  
 *
 * @param x0 The x coordinate of one corner of the box.  Measured as a 
 * number of pixels from left side of screen.  The value increases 
 * from 0 (left) to 127 (right).  
 *
 * @param y0 The y coordinate of one corner of the box.  Measured as a 
 * number of pixels from the top of the screen.  The value increases 
 * from 0 (top) to 63 (bottom).  
 *
 * @param x1 The x coordinate of a corner diagonal from the first corner.  
 *
 * @param y1 The y coordinate of the corner diagonal from the first corner.  
 * 
 * @param c The pixel color 1 for white, 0 for black.
 */
void box( int x0, int y0, int x1, int y1, int c);

/**
 * @brief Plot a filled box on the oLED screen.  
 *
 * @param x0 The x coordinate of one corner of the box.  Measured as a 
 * number of pixels from left side of screen.  The value increases 
 * from 0 (left) to 127 (right).  
 *
 * @param y0 The y coordinate of one corner of the box.  Measured as a 
 * number of pixels from the top of the screen.  The value increases 
 * from 0 (top) to 63 (bottom).  
 *
 * @param x1 The x coordinate of a corner diagonal from the first corner.  
 *
 * @param y1 The y coordinate of the corner diagonal from the first corner.  
 * 
 * @param c The pixel color 1 for white, 0 for black.
 */
void boxFilled( int x0, int y0, int x1, int y1, int c);

/**
 * @brief Plot a triangle on the oLED screen.  
 *
 * @param x0 The x coordinate of one corner of the triangle.  Measured as a 
 * number of pixels from left side of screen.  The value increases 
 * from 0 (left) to 127 (right).  
 *
 * @param y0 The y coordinate of one corner of the triangle.  Measured as a 
 * number of pixels from the top of the screen.  The value increases 
 * from 0 (top) to 63 (bottom).  
 *
 * @param x1 The x coordinate of the second corner.  
 *
 * @param y1 The y coordinate of the second corner.  
 * 
 * @param x2 The x coordinate of the third corner.  
 *
 * @param y2 The y coordinate of the third corner.  
 * 
 * @param c The pixel color 1 for white, 0 for black.
 */
void triangle( int x0, int y0, int x1, int y1, int x2, int y2, int c);

/**
 * @brief Plot a filled triangle on the oLED screen.  
 *
 * @param x0 The x coordinate of one corner of the triangle.  Measured as a 
 * number of pixels from left side of screen.  The value increases 
 * from 0 (left) to 127 (right).  
 *
 * @param y0 The y coordinate of one corner of the triangle.  Measured as a 
 * number of pixels from the top of the screen.  The value increases 
 * from 0 (top) to 63 (bottom).  
 *
 * @param x1 The x coordinate of the second corner.  
 *
 * @param y1 The y coordinate of the second corner.  
 * 
 * @param x2 The x coordinate of the third corner.  
 *
 * @param y2 The y coordinate of the third corner.  
 * 
 * @param c The pixel color 1 for white, 0 for black.
 */
void triangleFilled( int x0, int y0, int x1, int y1, int x2, int y2, int c);

/**
 * @brief Plot a circle on the oLED screen.  
 *
 * @param x0 The x coordinate of the center of the circle.  Measured as a 
 * number of pixels from left side of screen.  The value increases 
 * from 0 (left) to 127 (right).  
 *
 * @param y0 The y coordinate of the center of the circle.  Measured as a 
 * number of pixels from the top of the screen.  The value increases 
 * from 0 (top) to 63 (bottom).  
 *
 * @param r The radius of the circle.  
 * 
 * @param c The pixel color 1 for white, 0 for black.
 */
void circle( int x0, int y0, int r, int c);

/**
 * @brief Plot a filled circle on the oLED screen.  
 *
 * @param x0 The x coordinate of the center of the circle.  Measured as a 
 * number of pixels from left side of screen.  The value increases 
 * from 0 (left) to 127 (right).  
 *
 * @param y0 The y coordinate of the center of the circle.  Measured as a 
 * number of pixels from the top of the screen.  The value increases 
 * from 0 (top) to 63 (bottom).  
 *
 * @param r The radius of the circle.  
 * 
 * @param c The pixel color 1 for white, 0 for black.
 */
void circleFilled( int x0, int y0, int r, int c);

/**
 * @brief Place a shape defined by a char array of pixels on the oLED
 * display.  See 11 Shapes to Display.side for example.
 *
 * @param *img array's address (its name without the square brackets).
 *
 * @param bw Can be SCR_WHITE for 1s drawing white pixels, SCR_BLACK for 
 * 1s drawing black pixels, or SCR_XOR for inverting.
 *
 * @param xtl The shape's x top-left coordinate.
 *
 * @param ytl The shape's y top-left coordinate.
 *
 * @param xpics The shape's width in pixels.
 *
 * @param ypics The shape's height in pixels.
 */
void shape(char *img, int bw, int xtl, int ytl, int xpics, int ypics);

/**
 * @brief Rotate the screen image 180 degrees.  See 05 Display Upside-
 * Down.side for example.
 */
void rotate180();

/**
 * @brief Cause function calls like oledprint, point, and others to appear 
 * immediately after the function is called with screen_auto(1).  To make
 * multiple changes before manually updating with a call to screen_update, 
 * use screen_auto(0).  See 04 Screen Auto ON OFF.side for example.
 *
 * @param state 1 enables auto-update, 0 disables it.
 */
void screen_auto(int state);

/**
 * @brief Check if function calls like oledprint, point, and others are 
 * set to appear (1) immediately after the function is called or (0) if 
 * multiple changes are made before manually updating with a call to 
 * screen_update. 
 *
 * @returns 1 if auto-update is enabled, or 0 if it is not.
 */
int screen_getAuto();

/**
 * @brief Manually update the screen image after.  Typically used after 
 * multiple oLED function calls after screen_auto(0).  See 04 Screen Auto 
 * ON OFF.side for example.
 *
 * @returns 0
 */
int screen_update( void );

/**
 * @}
 *
 * @name oLED Screen Display (Intermediate)
 * @{
 */

/**
 * @brief Cause the screen to scroll to the right with screen_scrollRight(0, 15).
 *
 * @returns 0
 */
int screen_scrollRight( int scrollStart, int scrollStop);

/**
 * @brief Cause the screen to scroll to the left with screen_scrollLeft(0, 15).
 *
 * @returns 0
 */
int screen_scrollLeft( int scrollStart, int scrollStop);

/**
 * @brief Cause the screen to scroll diagonally to the right with 
 * screen_scrollRightDiag(0, 15).
 *
 * @returns 0
 */
int screen_scrollRightDiag( int scrollStart, int scrollStop);

/**
 * @brief Cause the screen to scroll diagonally to the left with 
 * screen_scrollLeftDiag(0, 15).
 *
 * @returns 0
 */
int screen_scrollLeftDiag( int scrollStart, int scrollStop);

/**
 * @brief Stop screen scrolling action.
 *
 * @returns 0
 */
int screen_scrollStop( void );

/**
 * @brief Display an image using an array holding an image generated by 
 * software that is compatible with the screen's scanning.  See 12 Image 
 * to Display.side for an example.
 *
 * @details Although scanning starts at the top-left, each pixel in the 
 * byte advances downward.  After displaying the 8 vertical pixels, it 
 * steps to the right a pixel for the next byte.   The next byte starts
 * one pixel to the right.
 * 
 * @param *imgaddr Address of the byte array with the 128x64 pixel image 
 * to be displayed..
 *
 * @returns .
 */
void screen_image(char *imgaddr);

/**
 * @}
 *
 * @name Misc
 * @{
 */

// Handy tools

/**
 * @brief Display EEPROM contents as a combination of printable characters and 
 * numeric values (when not printable) in square brackets [],  See 02 View First 
 * and Last 64 Bytes with Terminal.side for example.
 *
 * @param byteCount Number of bytes to display.
 *
 * @param address Starting EEPROM address.
 */
void dev_ee_show(int byteCount, int address);


/**
 * @}
 */

 
#ifndef DOXYGEN_SHOULD_SKIP_THIS

/* =========================================================================== */
//                        PRIVATE FUNCTIONS/MACROS
/* =========================================================================== */

/**
 * @name Private (used by badgetools library)
 * @{
 */


int32_t ircom_start(int32_t rxd, int32_t txd, int32_t baud, int32_t freq);
void ircom_stop(void);
int32_t ircom_rx(void);
int32_t ircom_rxcheck(void);
int32_t ircom_rxtime(int32_t mslim);
int32_t ircom_rxflush(void);
int32_t ircom_tx(int32_t c);
int32_t ircom_str(char *p_zstr);
int32_t ircom_dec(int32_t value);
int32_t ircom_rjdec(int32_t val, int32_t width, int32_t pchar);
int32_t ircom_hex(int32_t value, int32_t digits);
int32_t ircom_tx_bin(int32_t value, int32_t digits);
int32_t ircom_txflush(void);
void led_pwm(void);


//extern char beanie[LCD_BUFFER_SIZE_BOTH_TYPES];

// LED pins
#ifndef  RGB_PIN
#define  RGB_PIN (10)
#endif

#ifndef  LED_PIN
#define  LED_PIN (9)
#endif



// touch buttons and nav sliders
#ifndef  NAV_L
#define  NAV_L  (13)
#endif

#ifndef  NAV_C
#define  NAV_C  (12)
#endif

#ifndef  NAV_R
#define  NAV_R  (11)
#endif

#ifndef  NAV_COM_L
#define  NAV_COM_L  (14)
#endif

#ifndef  NAV_COM_R
#define  NAV_COM_R  (15)
#endif

#ifndef  NAV_TOUCH_L
#define  NAV_TOUCH_L  (4)
#endif

#ifndef  NAV_TOUCH_R
#define  NAV_TOUCH_R  (2)
#endif


/*  max supported using IR connection  */
#ifndef IR_BAUD
#define IR_BAUD (2400)
#endif

/*  matches receiver on DC22 badge  */
#ifndef IR_FREQ
#define IR_FREQ (36000)
#endif

// IR coms
#ifndef IR_OUT
#define IR_OUT (3)
#endif

#ifndef IR_IN
#define IR_IN (23)
#endif

// OLED connections 
#ifndef OLED_DAT
#define OLED_DAT (21)
#endif

#ifndef OLED_CLK
#define OLED_CLK (20)
#endif

#ifndef OLED_DC
#define OLED_DC (22)
#endif

#ifndef OLED_RST
#define OLED_RST (19)
#endif

#ifndef OLED_CS
#define OLED_CS (18)
#endif

// composite video (J503)  
#ifndef TV_DAC2
#define TV_DAC2 (26)
#endif

#ifndef TV_DAC1
#define TV_DAC1 (25)
#endif

#ifndef TV_DAC0
#define TV_DAC0 (24)
#endif
// audio (J503)
#ifndef AUD_RT
#define AUD_RT (1)
#endif

#ifndef AUD_LF
#define AUD_LF (0)
#endif

#ifndef STX
#define STX 2                                                      //serial framing bytes
#endif

#ifndef ETX
#define ETX 3
#endif

#ifndef LCD_BUFFER_SIZE_BOTH_TYPES
#define LCD_BUFFER_SIZE_BOTH_TYPES (1024)
#endif

#ifndef SSD1306_SWITCHCAPVCC
#define SSD1306_SWITCHCAPVCC (2)
#endif

#ifndef TYPE_128X32
#define TYPE_128X32 (32)
#endif

#ifndef TYPE_128X64
#define TYPE_128X64 (64)
#endif

#ifndef EE_BADGE_DATA_START
#define EE_BADGE_DATA_START 32768
#endif

#ifndef EE_BADGE_DATA_END
#define EE_BADGE_DATA_END 65536 - 4
#endif

void init_MMA7660FC(void);
void ee_init(void);



// accelerometer interrupt in
//#ifndef ACC_INT
//#define ACC_INT (4)    // Unused in Badge WX
//#endif

#ifndef XOUT
#define XOUT  0
#endif

#ifndef YOUT
#define YOUT  1
#endif

#ifndef ZOUT
#define ZOUT  2
#endif

#ifndef TILT
#define TILT  3
#endif

#ifndef SRST
#define SRST  4
#endif

#ifndef SPCNT
#define SPCNT 5
#endif

#ifndef INTSU
#define INTSU 6
#endif

#ifndef MODE
#define MODE  7
#endif

#ifndef SR
#define SR    8
#endif

#ifndef PDET
#define PDET  9
#endif

#ifndef PD
#define PD    10
#endif
  
#ifndef MMA7660_I2C
#define MMA7660_I2C 0b1001100     
#endif
                                
#ifndef ALERT_BIT
#define ALERT_BIT  0b01000000      //0x40 
#endif

#ifndef ALERT_XYZT   
#define ALERT_XYZT 0x40404040     
#endif

#ifndef BUF_SIZE
#define BUF_SIZE (128)
#endif

#ifndef BUF_MASK
#define BUF_MASK ((BUF_SIZE - 1))
#endif

typedef struct jm_ir_hdserial {
// cog flag/id
  volatile int32_t	cog;
// rx head index
  volatile int32_t	rxhead;
// rx tail index
  volatile int32_t	rxtail;
// hub address of rxbuf
  volatile int32_t	rxhub;
// tx head index
  volatile int32_t	txhead;
// tx tail index
  volatile int32_t	txtail;
// hub address of txbuf
  volatile int32_t	txhub;
// rx pin (in)
  volatile int32_t	rxpin;
// tx pin (out)
  volatile int32_t	txpin;
// bit timing (ticks)
  volatile int32_t	bitticks;
// ctrx setup for freq
  volatile int32_t	frsetup;
// rx and tx buffers
  volatile uint8_t	rxbuf[BUF_SIZE];
  volatile uint8_t	txbuf[BUF_SIZE];
} jm_ir_hdserial;



//define TYPE_128X32 (32)
//define TYPE_128X64 (64)
#ifndef SSD1306_LCDWIDTH
#define SSD1306_LCDWIDTH (128)
#endif

#ifndef SSD1306_LCDHEIGHT32
#define SSD1306_LCDHEIGHT32 (32)
#endif

#ifndef SSD1306_LCDHEIGHT64
#define SSD1306_LCDHEIGHT64 (64)
#endif

#ifndef SSD1306_LCDCHARMAX
#define SSD1306_LCDCHARMAX (8)
#endif

#ifndef SSD1306_SETCONTRAST
#define SSD1306_SETCONTRAST (129)
#endif

#ifndef SSD1306_DISPLAYALLON_RESUME
#define SSD1306_DISPLAYALLON_RESUME (164)
#endif

#ifndef SSD1306_DISPLAYALLON
#define SSD1306_DISPLAYALLON (165)
#endif

#ifndef SSD1306_NORMALDISPLAY
#define SSD1306_NORMALDISPLAY (166)
#endif

#ifndef SSD1306_INVERTDISPLAY
#define SSD1306_INVERTDISPLAY (167)
#endif

#ifndef SSD1306_DISPLAYOFF
#define SSD1306_DISPLAYOFF (174)
#endif

#ifndef SSD1306_DISPLAYON
#define SSD1306_DISPLAYON (175)
#endif

#ifndef SSD1306_SETDISPLAYOFFSET
#define SSD1306_SETDISPLAYOFFSET (211)
#endif

#ifndef SSD1306_SETCOMPINS
#define SSD1306_SETCOMPINS (218)
#endif

#ifndef SSD1306_SETVCOMDETECT
#define SSD1306_SETVCOMDETECT (219)
#endif

#ifndef SSD1306_SETDISPLAYCLOCKDIV
#define SSD1306_SETDISPLAYCLOCKDIV (213)
#endif

#ifndef SSD1306_SETPRECHARGE
#define SSD1306_SETPRECHARGE (217)
#endif

#ifndef SSD1306_SETMULTIPLEX
#define SSD1306_SETMULTIPLEX (168)
#endif

#ifndef SSD1306_SETLOWCOLUMN
#define SSD1306_SETLOWCOLUMN (0)
#endif

#ifndef SSD1306_SETHIGHCOLUMN
#define SSD1306_SETHIGHCOLUMN (16)
#endif

#ifndef SSD1306_SETSTARTLINE
#define SSD1306_SETSTARTLINE (64)
#endif

#ifndef SSD1306_MEMORYMODE
#define SSD1306_MEMORYMODE (32)
#endif

#ifndef SSD1306_COMSCANINC
#define SSD1306_COMSCANINC (192)
#endif

#ifndef SSD1306_COMSCANDEC
#define SSD1306_COMSCANDEC (200)
#endif

#ifndef SSD1306_SEGREMAP
#define SSD1306_SEGREMAP (160)
#endif

#ifndef SSD1306_CHARGEPUMP
#define SSD1306_CHARGEPUMP (141)
#endif

#ifndef SSD1306_EXTERNALVCC
#define SSD1306_EXTERNALVCC (1)
#endif


// Scrolling #defines
#ifndef SSD1306_ACTIVATE_SCROLL
#define SSD1306_ACTIVATE_SCROLL (47)
#endif

#ifndef SSD1306_DEACTIVATE_SCROLL
#define SSD1306_DEACTIVATE_SCROLL (46)
#endif

#ifndef SSD1306_SET_VERT_SCROLL_AREA
#define SSD1306_SET_VERT_SCROLL_AREA (163)
#endif

#ifndef SSD1306_RIGHT_HORIZ_SCROLL
#define SSD1306_RIGHT_HORIZ_SCROLL (38)
#endif

#ifndef SSD1306_LEFT_HORIZ_SCROLL
#define SSD1306_LEFT_HORIZ_SCROLL (39)
#endif

#ifndef SSD1306_VERTRIGHTHORIZSCROLL
#define SSD1306_VERTRIGHTHORIZSCROLL (41)
#endif

#ifndef SSD1306_VERTLEFTHORIZSCROLL
#define SSD1306_VERTLEFTHORIZSCROLL (42)
#endif

#ifndef LCD_BUFFER_SIZE_BOTH_TYPES
#define LCD_BUFFER_SIZE_BOTH_TYPES (1024)
#endif

#ifndef SSD1306_SWITCHCAPVCC
#define SSD1306_SWITCHCAPVCC (2)
#endif

#ifndef TYPE_128X32
#define TYPE_128X32 (32)
#endif

#ifndef TYPE_128X64
#define TYPE_128X64 (64)
#endif


typedef volatile struct screen {
  volatile int	cog;
  volatile int	command;
  volatile int	CS;
  volatile int	DC;
  volatile int	DATA;
  volatile int	CLK;
  volatile int	RST;
  volatile int	vccstate;
  volatile int	displayWidth;
  volatile int	displayHeight;
  volatile int	displayType;
  volatile int	AutoUpdate;
  volatile uint8_t	buffer[LCD_BUFFER_SIZE_BOTH_TYPES];
  volatile int charSize;
  volatile int crsrX;
  volatile int	crsrY;
} screen;


extern uint8_t oleddat[];

void screen_string8x2(char *str, int32_t len, int32_t row, int32_t col);
void screen_string16x4( char *str, int len, int row, int col);
void screen_char32x16( int ch, int row, int col);
void screen_char7x5( int ch, int row, int col);

int screen_HIGH( int Pin);
int screen_LOW( int Pin);
int32_t screen_swap( int32_t a, int32_t b);
int screen_AutoUpdateOn( void );
int screen_AutoUpdateOff( void );

void ee_displayIndex(int start, int end, int increment);
void stringView(char *s, int ssize);
int sscan_ct(const char *str, const char *fmt, ...); 
int _doscanf_ct(const char* str, const char *fmt, va_list args); 
int ir_receive(char *s, int ssize);
void ir_start(void);
void ir_stop(void);
void ee_badgeCheck(void);
int light_start( void );
int touch_start(int count, unsigned char *p_pins, int dms);

int screen_GetDisplayHeight( void );
int screen_GetDisplayWidth( void );
int screen_GetDisplayType( void );
int screen_ssd1306_Command( int thecmd);
int screen_ssd1306_Data( int thedata);
int screen_getSplash( void );
int screen_SHIFTOUT( int Dpin, int Cpin, int CSpin, int Bits, int Value);
int screen_WRITEBUFF( int Dpin, int Cpin, int CSpin, int Bits, int Addr);
int screen_init( int ChipSelect, int DataCommand, int TheData, int TheClock, int Reset, int VCC_state, int Type);
void screen_string8x2(char *str, int32_t len, int32_t row, int32_t col);
void screen_string16x4( char *str, int len, int row, int col);

int screen_getBuffer( void );
int screen_start( void );
int screen_stop( void );

void screen_char32x16( int ch, int row, int col);
void screen_char7x5( int ch, int row, int col);


int get_bit(int bitNum, int val);
void set_bit(int bitNum, int *val);
void clear_bit(int bitNum, int *val);


#ifdef __GNUC__
#define INLINE__ static inline
#define Yield__() __asm__ volatile( "" ::: "memory" )
#define PostEffect__(X, Y) __extension__({ int32_t tmp__ = (X); (X) = (Y); tmp__; })
#else
#define INLINE__ static
static int32_t tmp__;
#define PostEffect__(X, Y) (tmp__ = (X), (X) = (Y), tmp__)
#define Yield__()
#define waitcnt(n) _waitcnt(n)
#define coginit(id, code, par) _coginit((unsigned)(par)>>2, (unsigned)(code)>>2, id)
#define cognew(code, par) coginit(0x8, (code), (par))
#define cogstop(i) _cogstop(i)
#endif

INLINE__ int32_t Min__(int32_t a, int32_t b) { return a < b ? a : b; }
INLINE__ int32_t Max__(int32_t a, int32_t b) { return a > b ? a : b; }
INLINE__ int32_t Shr__(uint32_t a, uint32_t b) { return (a>>b); }
INLINE__ int32_t Rotl__(uint32_t a, uint32_t b) { return (a<<b) | (a>>(32-b)); }
INLINE__ int32_t Rotr__(uint32_t a, uint32_t b) { return (a>>b) | (a<<(32-b)); }
INLINE__ int32_t Lookup__(int32_t x, int32_t b, int32_t a[], int32_t n) { int32_t i = (x)-(b); return ((unsigned)i >= n) ? 0 : (a)[i]; }


/**
 * @}  // /Private
 */

#endif // DOXYGEN_SHOULD_SKIP_THIS


#if defined(__cplusplus)
}
#endif
/* __cplusplus */  
#endif
/* SIMPLETOOLS_H */  


/*
#ifdef __GNUC__
#define INLINE__ static inline
#define PostEffect__(X, Y) __extension__({ int tmp__ = (X); (X) = (Y); tmp__; })
#else
#define INLINE__ static
static int tmp__;
#define PostEffect__(X, Y) (tmp__ = (X), (X) = (Y), tmp__)
#define waitcnt(n) _waitcnt(n)
#define coginit(id, code, par) _coginit((unsigned)(par)>>2, (unsigned)(code)>>2, id)
#define cognew(code, par) coginit(0x8, (code), (par))
#define cogstop(i) _cogstop(i)
#endif

__asm__ volatile( "    .global __clkfreqval\n" );
__asm__ volatile( "    __clkfreqval = 0x4c4b400\n" );
__asm__ volatile( "    .global __clkmodeval\n" );
__asm__ volatile( "    __clkmodeval = 0x6f\n" );
*/


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


