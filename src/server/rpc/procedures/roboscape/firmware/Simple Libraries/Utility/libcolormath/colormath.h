/*
 * @file colorMath.h
 *
 * @author Matthew Matz
 *
 * @version 0.9
 *
 * @copyright Copyright (C) Parallax, Inc. 2016.  See end of file for
 * terms of use (MIT License).
 *
 * @brief This library contains a set of functions to make color space manipulation and math easier.
 * 
 * @detail Please submit bug reports, suggestions, and improvements to
 * this code to editor@parallax.com.
 */

#ifndef COLORMATH_H                           // Prevents duplicate
#define COLORMATH_H                           // declarations

#if defined(__cplusplus)                      // If compiling for C++
extern "C" {                                  // Compile for C
#endif


#include <propeller.h>
#include <stdlib.h>

/**
 * @brief Compares two 24-bit (RRGGBB) colors and returns a value proportional to how
 * similar they are.
 *
 * @param c1 The first 24-bit color to be compared.
 *
 * @param c2 The second 24-bit color to be compared.
 *
 * @return A value ranging from 0 (not similar) to 255 (the same) indicating how similar the two colors are.
 */
int compareRRGGBB(int c1, int c2);


/**
 * @brief Generates a single 24-bit (RRGGBB) color integer from individual 8-bit red, green, and blue
 * componenets.
 *
 * @param r An 8-bit value (0-255) representing the red component of a color.
 *
 * @param g An 8-bit value (0-255) representing the green component of a color.
 *
 * @param b An 8-bit value (0-255) representing the blue component of a color.
 *
 * @return A single 24-bit (RRGGBB) color integer.
 */
int getColorRRGGBB(int r, int g, int b);


/**
 * @brief Retrives the specified 8-bit (red, green, or blue) color component from 
 * a 24-bit (RRGGBB) color integer.
 *
 * @param c A 24-bit (RRGGBB) color integer.
 *
 * @param *i A string indicating which color component should be returned: 
 * "RED", "GREEN", or "BLUE".  The strings "R", "G", or "B" are acceptable.
 *
 * @return An 8-bit value (0-255) representing the specified component of the color.
 */
int get8bitColor(int c, char *i);


/**
 * @brief Remaps a color stored as a simgle integer.
 *
 * @param c The color stored as an integer to be remapped.
 *
 * @param *f1 A string specifying the format of the color inputted.  For example,
 * a string indicating an 24-bit color integer with 8 red bits, 8 green bits, and 
 * 8 blue bits would be "8R8G8B".  A 16-bit color integer with 5 red bits, 6 green
 * bits, and 5 blue bits would be "5R6G5B".
 *
 * @param *f2 A string specifying the format of the color to be returned.  The
 * order of the color components does not have to be the same as the input order.
 * For example, this function can be used to simply re-order the color components.
 *  
 * @return A color stored as a single integer in the specified format.
 */
int remapColor(int c, char *f1, char *f2);




#if defined(__cplusplus)                     
}                                             // End compile for C block
#endif
/* __cplusplus */

#endif                                        // End prevent duplicate forward
/* COLORMATH_H */                             // declarations block    



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