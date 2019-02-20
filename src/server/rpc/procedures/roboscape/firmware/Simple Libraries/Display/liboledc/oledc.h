/*
 * @file oledc_.h
 *
 * @author Matthew Matz
 *
 * @version 0.9
 *
 * @copyright Copyright (C) Parallax, Inc. 2016.  See end of file for
 * terms of use (MIT License).
 *
 * @brief This is a driver that allows the Propeller Multicore Microcontroller to 
 * draw text, shapes, and bitmap files on the 0.96-inch RGB OLED (Parallax Part #28087).
 *
 * @detail This high-speed driver allows the Propeller Multicore Microcontroller to 
 * draw pixels, lines, circles, recatngles, rounded rectagles, triangles, formatted text 
 * in multiple fonts, bitmap images stored on an SD card on a 0.95-inch OLED screen. 
 * At Parallax, we would like to thank Adafruit Industries as parts of this library 
 * were dervied from the Adafruit GFX library for Arduino.  Please submit bug reports, 
 * suggestions, and improvements to this code to editor@parallax.com.
 * 
 * @note This library uses one cog.  If fonts are installed, they occupy EEPROM addresses
 * 40576 to 63359.
 */

#ifndef OLEDC_H                               // Prevents duplicate
#define OLEDC_H                               // declarations

#if defined(__cplusplus)                      // If compiling for C++
extern "C" {                                  // Compile for C
#endif


#include <propeller.h>
#include <stdlib.h>

// Named Colors
#define WHITE                     0xFFFF
#define PINK                      0xFD59
#define MAGENTA                   0xC9D4
#define RED                       0xC082
#define DARKRED                   0xA000
#define REDORANGE                 0xD261
#define LIGHTORANGE               0xDDB2
#define ORANGE                    0xFC00
#define YELLOWORANGE              0xFCE0
#define GOLD                      0xF704
#define YELLOW                    0xF744
#define LEMON                     0xD6CF
#define YELLOWGREEN               0x5600
#define GREEN                     0x1C62
#define DARKGREEN                 0x02C0
#define GREENBLUE                 0x0C75
#define CYAN                      0x5E97
#define LIGHTBLUE                 0x857B
#define SKYBLUE                   0x0E3E
#define BLUE                      0x2B16
#define NAVYBLUE                  0x0009
#define VIOLET                    0x7817
#define PURPLE                    0xA017
#define RASPBERRY                 0x902A
#define TAN                       0xCC2A
#define LIGHTBROWN                0xBB44
#define BRONZE                    0xA440
#define BROWN                     0x9201
#define DARKBROWN                 0x51E7
#define LIGHTGRAY                 0xBDD7
#define GRAY                      0x8410
#define DARKGRAY                  0x3186
#define BLACK                     0x0000

// Font size and face
#define SMALL           1
#define MEDIUM          2
#define LARGE           3

#define FONT_SANS       0
#define FONT_SERIF      1
#define FONT_SCRIPT     2
#define FONT_BUBBLE     3




/**
 * @brief Initializes the OLED screen by setting up it's SPI and control pins.
 *
 * @param SID which pin is connected to the Serial Data In pin, marked "DIN".
 * 
 * @param SCLK which pin is connected to the Serial Clock pin, marked "CLK".
 *
 * @param CS which pin is connected to the Chip Select pin, marked "CS".
 *
 * @param RS which pin is connected to the Read Status pin, marked "D/C".
 *
 * @param RST which pin is connected to the Reset pin, marked "RST".
 *
 * @param screen_rotation Sets up the OLED screen and establishes its orientation. (0) means the pins are pointed upwards, 
 * (1) means the pins are pointed to the left, (2) means the pins are pointed down and
 * (3) means the pins are pointed to the right.
 */
void oledc_init(char SID, char SCLK, char CS, char RS, char RST, char screen_rotation);

/**
 * @brief Generates a 2-byte (16-bit) color code (RRRRRGGGGGGBBBBB format) for use with the OLED screen.
 * 
 * @param r Amount of Red in the color, range is from 0-255.
 * 
 * @param g Amount of Green in the color, range is from 0-255.
 * 
 * @param b Amount of Blue in the color, range is from 0-255.
 */
unsigned int oledc_color565(char r, char g, char b);

//
// @name Individual setup calls
// @{
//

//
// @}
//
// @name Drawing Functions
// @{

/**
 * @brief Draws a single pixel on the screen in the specified color.
 * 
 * @param x Horizontal coordinate of the pixel, counted from the left side of the screen.
 * 
 * @param y Vertical coordinate of the pixel, counted down from the top of the screen.
 * 
 * @param color Color of the pixel, in r5g6b5 format.
 */
void oledc_drawPixel(int x, int y, unsigned int color);

/**
 * @brief Draws a line on the screen in the specified color.
 * 
 * @param x0 Starting horizontal coordinate of the line, counted from the left side of the screen.
 * 
 * @param y0 Starting vertical coordinate of the line, counted down from the top of the screen.
 *
 * @param x1 Ending horizontal coordinate of the line.
 *
 * @param y1 Ending vertical coordinate of the line.
 * 
 * @param color Color of the pixel, in r5g6b5 format.
 */
void oledc_drawLine(int x0, int y0, int x1, int y1, unsigned int color);

/**
 * @brief Draws a vertical line on the screen in the specified color.
 * 
 * @param x Starting horizontal coordinate of the line, counted from the left side of the screen.
 * 
 * @param y Starting vertical coordinate of the line, counted down from the top of the screen.
 *
 * @param h Length of the line.
 * 
 * @param color Color of the line, in r5g6b5 format.
 */
void oledc_drawFastVLine(int x, int y, int h, unsigned int color);

/**
 * @brief Draws a horizontal line on the screen in the specified color.
 * 
 * @param x Starting horizontal coordinate of the line, counted from the left side of the screen.
 * 
 * @param y Starting vertical coordinate of the line, counted down from the top of the screen.
 *
 * @param w Length of the line.
 * 
 * @param color Color of the line, in r5g6b5 format.
 */
void oledc_drawFastHLine(int x, int y, int w, unsigned int color);

/**
 * @brief Draws a circle on the screen in the specified color.
 * 
 * @param x0 Horizontal coordinate of the center of the circle, counted from the left side of the screen.
 * 
 * @param y0 Vertical coordinate of the center of the circle, counted down from the top of the screen.
 *
 * @param r Radius of the circle.
 * 
 * @param color Color of the pixel, in r5g6b5 format.
 */
void oledc_drawCircle(int x0, int y0, int r, unsigned int color);

/**
 * @brief Draws a filled circle on the screen in the specified color.
 * 
 * @param x0 Horizontal coordinate of the center of the circle, counted from the left side of the screen.
 * 
 * @param y0 Vertical coordinate of the center of the circle, counted down from the top of the screen.
 *
 * @param r Radius of the circle.
 * 
 * @param color Color of the pixel, in r5g6b5 format.
 */
void oledc_fillCircle(int x0, int y0, int r, unsigned int color);

/**
 * @brief Draws a rectangle on the screen in the specified color.
 *
 * @param x Starting horizontal coordinate of the rectangle, counted from the left side of the screen.
 * 
 * @param y Starting vertical coordinate of the rectangle, counted down from the top of the screen.
 *
 * @param w Width of the rectangle.
 *
 * @param h Height of the rectangle.
 * 
 * @param color Color of the rectangle, in r5g6b5 format.
 */
void oledc_drawRect(int x, int y, int w, int h, unsigned int color);

/**
 * @brief Draws a filled rectangle on the screen in the specified color.
 *
 * @param x Starting horizontal coordinate of the rectangle, counted from the left side of the screen.
 * 
 * @param y Starting vertical coordinate of the rectangle, counted down from the top of the screen.
 *
 * @param w Width of the rectangle.
 *
 * @param h Height of the rectangle.
 * 
 * @param color Color of the rectangle, in r5g6b5 format.
 */
void oledc_fillRect(int x, int y, int w, int h, unsigned int color);

/**
 * @brief Draws a rectangle with rounded corners on the screen in the specified color.
 *
 * @param x Starting horizontal coordinate of the rectangle, counted from the left side of the screen.
 * 
 * @param y Starting vertical coordinate of the rectangle, counted down from the top of the screen.
 *
 * @param w Width of the rectangle.
 *
 * @param h Height of the rectangle.
 *
 * @param r Radius of the rounded corners.
 * 
 * @param color Color of the rectangle, in r5g6b5 format.
 */
void oledc_drawRoundRect(int x, int y, int w, int h, int r, unsigned int color);

/**
 * @brief Draws a filled rectangle with rounded corners on the screen in the specified color.
 *
 * @param x Starting horizontal coordinate of the rectangle, counted from the left side of the screen.
 * 
 * @param y Starting vertical coordinate of the rectangle, counted down from the top of the screen.
 *
 * @param w Width of the rectangle.
 *
 * @param h Height of the rectangle.
 *
 * @param r Radius of the rounded corners.
 * 
 * @param color Color of the rectangle, in r5g6b5 format.
 */
void oledc_fillRoundRect(int x, int y, int w, int h, int r, unsigned int color);

/**
 * @brief Draws a triangle with on the screen in the specified color.
 *
 * @param x0 Horizontal coordinate of the first vertex (corner) of the triangle, counted from the left side of the screen.
 * 
 * @param y0 Vertical coordinate of the first vertex (corner) of the triangle, counted down from the top of the screen.
 *
 * @param x1 Horizontal coordinate of the second vertex of the triangle.
 * 
 * @param y1 Vertical coordinate of the first vertex of the triangle.
 *
 * @param x2 Horizontal coordinate of the third vertex of the triangle.
 * 
 * @param y2 Vertical coordinate of the third vertex of the triangle.
 *
 * @param color Color of the triangle, in r5g6b5 format.
 */
void oledc_drawTriangle(int x0, int y0, int x1, int y1, int x2, int y2, unsigned int color);

/**
 * @brief Draws a filled triangle with on the screen in the specified color.
 *
 * @param x0 Horizontal coordinate of the first vertex (corner) of the triangle, counted from the left side of the screen.
 * 
 * @param y0 Vertical coordinate of the first vertex (corner) of the triangle, counted down from the top of the screen.
 *
 * @param x1 Horizontal coordinate of the second vertex of the triangle.
 * 
 * @param y1 Vertical coordinate of the first vertex of the triangle.
 *
 * @param x2 Horizontal coordinate of the third vertex of the triangle.
 * 
 * @param y2 Vertical coordinate of the third vertex of the triangle.
 *
 * @param color Color of the triangle, in r5g6b5 format.
 */
void oledc_fillTriangle(int x0, int y0, int x1, int y1, int x2, int y2, unsigned int color);

/**
 * @brief Displays a properly formatted bitmap (.BMP) image on the screen.  The image must be saved as a 
 * Device Independant Bitmap with r5g6b5 (16-bit), normal row-order encoding.  
 * 
 * @note The SD card must be properly mounted before using this function.
 *
 * @param *imgdir Filename of the image saved to the SD card to be displayed.
 * 
 * @param x0 Horizontal position of the top-left corner of the bitmap image to be displayed, counted from the left side of the screen.
 * 
 * @param y0 Vertical position of the top-left corner of the bitmap image to be displayed, counted down from the top of the screen.
 */
void oledc_bitmap(char *imgdir, int x0, int y0);

// @}
//
// @name Text Functions
// @{

/**
 * @brief Sets the size of the font to be used. Range is from 1 to 3.  
 * Size (1) is 5x7 (6x8 spacing) pixels, size (2) is 11x15 (12x16 spacing) 
 * pixels and size (3) is 15x23 (16x24 spacing) pixels.
 */
void oledc_setTextSize(char s);

/**
 * @brief Sets the font face to be used. Range is from 0 to 3.  
 * Font face (0) is a sans-serif (console) font, face (1) is serif (typewriter) 
 * font, face (2) is a script (handwriting) font and face (3) is a
 * bubble (outline/cartoon) font.
 */
void oledc_setTextFont(char f);

/**
 * @brief Sets the color of the font and the color of the background 
 * (highlighting) to be used. Setting the text color and text 
 * background to the same color will make the background color transparent.
 *
 * @param c Color of the font, in r5g6b5 format.
 *
 * @param b Color of the font's background, in r5g6b5 format.  To make the background transparent, set to the same color as the font itself.
 */
void oledc_setTextColor(unsigned int c, unsigned int b);

/**
 * @brief Toggles automatic wrapping of text printed to the screen.  (0) turns wrapping off, (1) turning wrapping on.
 */
void oledc_setTextWrap(char w);

/**
 * @brief Sets the cursor position based on the size parameter.
 *
 * @param x Horizontal position of the cursor, counted from the left side of the screen.
 * 
 * @param y Vertical position of the cursor, counted down from the top of the screen.
 *
 * @param size The size of the cursor.  Correlated to font size: 
 * (0) moves the cursor in 1 pixel increments, (1) moves the cursor in font 
 * size 1 character increments, (2) moves the cursor in font size 2 
 * increments and (3) moves the cursor in font size 3 increments
 */
void oledc_setCursor(int x, int y, char size);

/**
 *@brief Print format "..." args to the screen. The output is limited to 128 bytes. 
 */
int  oledc_print(const char *fmt, ...);

/**
 * @brief Prints a number to the screen starting at the cursor position. Output is limited to 64 bytes.
 *
 * @param d Number to be printed to the screen.  The number can be either a floating point decimal or an integer.
 * 
 * @param r The number base to display the number in (for integers); HEX, BIN, OCT, and DEC are acceptable values. 
 * or the number of decimals to display following the decimal point (for floating point numbers).
 * Negative numbers in bases other than DEC (10) will display "Err".
 */
void oledc_drawNumber(float d, int r);

/**
 * @brief Prints a string of text to the screen starting at the cursor position. Output is limited to 64 bytes.
 *
 * @param *myString Text to display on the screen.
 */
void oledc_drawText(char *myString);
                    
/**
 *@brief Returns the current horizontal position of the cursor, measured from the left side of the screen in pixels.
 */
int  oledc_getCursorX();

/**
 *@brief Returns the current vertical position of the cursor, measured from the top of the screen in pixels.
 */
int  oledc_getCursorY();

// @}
//
// @name Screen Manipulation Functions
// @{

/**
 * @brief Clears (sets to black) a rectangular area of the screen
 *
 * @param x0 Starting horizontal coordinate of the box to be cleared, counted from the left side of the screen.
 * 
 * @param y0 Starting vertical coordinate of the box to be cleared, counted down from the top of the screen.
 *
 * @param w Width of the box to be cleared.
 *
 * @param h height of the box to be cleared.
 */
void oledc_clear(int x0, int y0, int w, int h);

/**
 * @brief Creates a copy a rectangular area of the screen at another position on the screen.
 *
 * @param x0 Starting horizontal coordinate of the box to be copied, counted from the left side of the screen.
 * 
 * @param y0 Starting vertical coordinate of the box to be copied, counted down from the top of the screen.
 *
 * @param w Width of the box to be copied.
 *
 * @param h height of the box to be copied.
 *
 * @param x2 Horizontal coordinate where the copied box is to be pasted.
 *
 * @param y2 Vertical coordinate where the copied box is to be pasted.
 */
void oledc_copy(int x0, int y0, int w, int h, int x2, int y2);

/**
 * @brief Turn the display off without changing it's contents (make it sleep).
 */
void oledc_sleep();

/**
 * @brief Turn the display back on if it was put to sleep.  Whatever the screen was 
 * displaying on the screen before it was put to sleep will return.
 */
void oledc_wake();

/**
 * @brief Returns the screen's orientation. (0) means the pins are pointed upwards, 
 * (1) means the pins are pointed to the left, (2) means the pins are pointed down and
 * (3) means the pins are pointed to the right.
 */
char oledc_getRotation();

/**
 * @brief Low-level function used by the begin function to set up the screen's orientation.
 */
void oledc_setRotation(char x);

/**
 * @brief Returns the width of the screen per the screen's current orientation.
 */
int  oledc_getWidth();

/**
 * @brief Returns the height of the screen per the screen's current orientation.
 */
int  oledc_getHeight();

/**
 * @brief Inverts the screen.
 */
void oledc_invertDisplay();

/**
 * @brief Starts scrolling the entire image on the screen horizontally, vertically, or both.
 *
 * @note the screen's horizontal displacement will persist after scrolling has stopped, but its vertical displacement will not.
 *
 * @param h Horizontal scrolling in rows per interval.  
 * (0) turns off horizontal scrolling, negative integers scroll 
 * to the left and positive integers scroll to the right.
 * 
 * @param v Vertical scrolling columns per interval.  
 * (0) turns off vertical scrolling, negative integers scroll 
 * down and positive integers scroll up.
 */
void oledc_scrollStart(char h, char v); 

/**
 * @brief Stops scrolling the screen.
 */
void oledc_scrollStop(); 

/**
 * @brief Returns (1) if the screen is currently scrolling and (0) if it is not.
 */
int  oledc_isScrolling();

// @}
  


#ifndef DOXYGEN_SHOULD_SKIP_THIS

/* =========================================================================== */
//                        PRIVATE FUNCTIONS/MACROS
/* =========================================================================== */

/**
 * @name Private (used by oledc library)
 * @{
 */

#define gfx_swap(a, b) { unsigned int t = a; a = b; b = t; }
#define absv(x) ((x)<0 ? -(x) : (x))

// Timing Delays
//#define SSD1331_DELAYS_HWFILL         25
//#define SSD1331_DELAYS_HWLINE         10
//#define SSD1331_DELAYS_HWPIXEL        10

// Radix Constants
#define HEX            -16
#define OCT            -8
#define BIN            -2
#define DEC            -10

// SSD1331 Commands
#define SSD1331_CMD_DRAWLINE        0x21
#define SSD1331_CMD_DRAWRECT        0x22
#define SSD1331_CMD_COPY            0x23
#define SSD1331_CMD_CLEAR           0x25
#define SSD1331_CMD_FILL            0x26
#define SSD1331_CMD_SCROLLSETUP     0x27
#define SSD1331_CMD_SCROLLSTOP      0x2E
#define SSD1331_CMD_SCROLLSTART     0x2F
#define SSD1331_CMD_SETCOLUMN       0x15
#define SSD1331_CMD_SETROW          0x75
#define SSD1331_CMD_CONTRASTA       0x81
#define SSD1331_CMD_CONTRASTB       0x82
#define SSD1331_CMD_CONTRASTC       0x83
#define SSD1331_CMD_MASTERCURRENT   0x87
#define SSD1331_CMD_SETREMAP        0xA0
#define SSD1331_CMD_STARTLINE       0xA1
#define SSD1331_CMD_DISPLAYOFFSET   0xA2
#define SSD1331_CMD_NORMALDISPLAY   0xA4
#define SSD1331_CMD_DISPLAYALLON    0xA5
#define SSD1331_CMD_DISPLAYALLOFF   0xA6
#define SSD1331_CMD_INVERTDISPLAY   0xA7
#define SSD1331_CMD_SETMULTIPLEX    0xA8
#define SSD1331_CMD_SETMASTER       0xAD
#define SSD1331_CMD_DISPLAYOFF      0xAE
#define SSD1331_CMD_DISPLAYON       0xAF
#define SSD1331_CMD_POWERMODE       0xB0
#define SSD1331_CMD_PRECHARGE       0xB1
#define SSD1331_CMD_CLOCKDIV        0xB3
#define SSD1331_CMD_PRECHARGEA      0x8A
#define SSD1331_CMD_PRECHARGEB      0x8B
#define SSD1331_CMD_PRECHARGEC      0x8C
#define SSD1331_CMD_PRECHARGELEVEL  0xBB
#define SSD1331_CMD_VCOMH           0xBE

#define TFTWIDTH  96
#define TFTHEIGHT 64

//extern char font_lg_index[95];
//extern char font_lg_zeroMap[658];
//extern char oled_font_lg[3000];
//extern char oled_font_med[2090];

/**
 * @brief Low-level driver for sending a byte to the OLED screen.
 */
void oledc_spiWrite(char c, char dc);

/**
 * @brief Launched into a cog to handle the pin-level interface with the screen.
 */
void oledc_startup();

/**
 * @brief Sets up the screen to recieve commands
 * 
 * @param c Byte of data to shift out
 * 
 * @param dc Pin state for the D/C pin on the OLED screen (0 = Command, 1 = Data).
 */
void oledc_writeCommand(char c, char dc);

/**
 * @brief Returns the status of the SPI communication lockout so multiple cogs don't try to write to it at the same time
 */
char oledc_screenLock();

/**
 * @brief Sets the SPI communication lockout
 */
void oledc_screenLockSet();

/**
 * @brief Clears the SPI communication lockout
 */
void oledc_screenLockClr();

/**
 *@brief Prints single ASCII-encoded characters to the screen. Characters 32 (space) to 126 (~) are rendered.  All other characters are rendered as a box. 
 */
void oledc_write(char c);

/**
 * @brief Low-level driver for printing single characters to the screen in the small (5x7) font.
 *
 * @param x Horizontal position of the character, counted from the left side of the screen.
 * 
 * @param y Vertical position of the character, counted down from the top of the screen.
 *
 * @param c ASCII-encoded character to be printed.
 * 
 * @param color Font color, in r5g6b5 format, to be used.
 *
 * @param bg Background (highlight) color, in r5g6b5 format, to be used.  If set the same as the Font color, the background will be transparent.
 * 
 */
void oledc_drawCharSmall(int x, int y, unsigned char c, unsigned int color, unsigned int bg);

/**
 * @brief Low-level driver for printing single characters to the screen in the medium (11x15) font.
 *
 * @param x Horizontal position of the character, counted from the left side of the screen.
 * 
 * @param y Vertical position of the character, counted down from the top of the screen.
 *
 * @param c ASCII-encoded character to be printed.
 * 
 * @param color Font color to be used.
 *
 * @param bg Background (highlight) color to be used.  If set the same as the Font color, the background will be transparent.
 * 
 */
void oledc_drawCharMedium(int x, int y, unsigned char c, unsigned int color, unsigned int bg);

/**
 * @brief Low-level driver for printing single characters to the screen in the large (17x23) font.
 *
 * @param x Horizontal position of the character, counted from the left side of the screen.
 * 
 * @param y Vertical position of the character, counted down from the top of the screen.
 *
 * @param c ASCII-encoded character to be printed.
 * 
 * @param color Font color to be used.
 *
 * @param bg Background (highlight) color to be used.  If set the same as the Font color, the background will be transparent.
 * 
 */
void oledc_drawCharLarge(int x, int y, unsigned char c, unsigned int color, unsigned int bg);

/**
 * @brief Low-level function for setting the pixel to be changed.
 * 
 * @details Sets the pixel according to the absolute (raw) position - it does not account for the rotation setting. 
 */
char oledc_goTo(int x, int y);

/**
 * @brief Helper function used to draw circles and rectangles with rounded corners
 returns
 */
void oledc_drawCircleHelper( int x0, int y0, int r, char cornername, unsigned int color);

/**
 * @brief Helper function used to draw filled circles and rectangles with rounded corners
 */
void oledc_fillCircleHelper(int x0, int y0, int r, char cornername, int delta, unsigned int color);

/**
 * @brief Draws a single pixel on the screen in the specified color.
 * 
 * @param x Horizontal coordinate of the pixel, counted from the left side of the screen.
 * 
 * @param y Vertical coordinate of the pixel, counted down from the top of the screen.
 * 
 * @param color Color of the pixel, in r5g6b5 format.
 */
void oledc_drawPixelPrimative(int x, int y, unsigned int color);

/**
 * @brief Draws a line on the screen in the specified color.
 * 
 * @param x0 Starting horizontal coordinate of the line, counted from the left side of the screen.
 * 
 * @param y0 Starting vertical coordinate of the line, counted down from the top of the screen.
 *
 * @param x1 Ending horizontal coordinate of the line.
 *
 * @param y1 Ending vertical coordinate of the line.
 * 
 * @param color Color of the pixel, in r5g6b5 format.
 */
void oledc_drawLinePrimative(int x0, int y0, int x1, int y1, unsigned int color);

/**
 * @brief Draws a filled rectangle on the screen in the specified color.
 *
 * @param x Starting horizontal coordinate of the rectangle, counted from the left side of the screen.
 * 
 * @param y Starting vertical coordinate of the rectangle, counted down from the top of the screen.
 *
 * @param w Width of the rectangle.
 *
 * @param h Height of the rectangle.
 * 
 * @param color Color of the rectangle, in r5g6b5 format.
 */
void oledc_fillRectPrimative(int x, int y, int w, int h, unsigned int color);

/**
 * @}  // /Private
 */

#endif // DOXYGEN_SHOULD_SKIP_THIS


#if defined(__cplusplus)                     
}                                             // End compile for C block
#endif
/* __cplusplus */

#endif                                        // End prevent duplicate forward
/* OLEDC_H */                                 // declarations block    



// Parts of this file are from the Adafruit GFX arduino library

/***************************************************
  This is a library for the 0.96" 16-bit Color OLED with SSD1331 driver chip
  Pick one up today in the adafruit shop!
  ------> http://www.adafruit.com/products/684
  These displays use SPI to communicate, 4 or 5 pins are required to
  interface
  Adafruit invests time and resources providing this open source code,
  please support Adafruit and open-source hardware by purchasing
  products from Adafruit!
  Written by Limor Fried/Ladyada for Adafruit Industries.
  BSD license, all text above must be included in any redistribution
 ****************************************************/
