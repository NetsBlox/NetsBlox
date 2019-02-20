/**
 * @file stacktest.h
 *
 * @author Andy Lindsay
 *
 * @version 0.50
 *
 * @copyright
 * Copyright (C) Parallax, Inc. 2014. All Rights MIT Licensed.
 *
 * @brief Provides a tool for testing how much of a cog's stack has been used.
 */

#ifndef STACKTEST_H
#define STACKTEST_H

#if defined(__cplusplus)
extern "C" {
#endif


#include "simpletools.h"


/**
 * @brief Runs a function's code in the next available cog (processor) and tracks
 * how much of the call stack the cog actually utilizes. After exercising the
 * code running in another cog to its fullest extent with a liberal stack
 * size, call cog_endStackTest to find out how much stack was actually used.
 * Then reduce the stack accordingly to reduce the application's or library's
 * overall memory footprint.
 *
 * @details Propeller applications launch in cog 0, and that cog reads from
 * and writes to unused Main RAM for call stack operations.  These
 * operations include setting aside memory for local variables, passing
 * parameters, and function call/return addresses.  
 *
 * When the application launches another cog, that cog has to have some stack
 * space set aside for those same operations to rule out possible memory
 * contentions.  It's crucial to always set aside enough stack space for
 * functions running in another cog; otherwise, the cog might inadvertently
 * overwrite other portions of the Main RAM that contain the program, global
 * variables, or other critical components.  Too much stack space is also 
 * problematic because it takes more memory than it needs to, which can prevent
 * a library from being successfully incorporated into an application.  
 *
 * The best way to avoid using too much or too little stack is to test stack usage
 * with an excessively large stack, and measure how much of it was actually used
 * with test code that exercises all its features to be sure the cog has used as
 * much stack space as it possibly can.  
 *
 * The cog_runStackTest  function behaves almost identically to cog_run, but under
 * the hood, it writes a series of pseudo-random values to the stack before starting
 * the next available cog.  After test code has exercised the code to its
 * fullest extent, the cog_endStackTest function checks to find out how many
 * memory elements were used by finding the address furthest from the stack
 * base that does not match the sequence.
 *
 * @param *function pointer to a function with no parameters 
 * or return value. Example, if your function is void myFunction(), then
 * pass myFunction. 
 *
 * @param stacksize Number of extra int variables for local variable
 * declarations and call/return stack. This also needs to cover any local
 * variable declarations in functions that your function calls, including
 * library functions. Be VERY liberal with extra stack space for this test to help
 * ensure that some library isn't using a large buffer that you haven't accounted
 * for.  If your application has an extra 4 kB, consider using 1024 even for small
 * and simple functions that run in other cogs. 
 *
 * @returns *coginfo Address of memory set aside for the cog. Make sure to
 * save this value in a variable because it is a required parameter for
 * cog_endStackTest to find out how much stack space was used.
 */
int *cog_runStackTest(void (*function)(void *par), int stacksize);

/**
 * @brief Ends function code running in another cog that was launched by 
 * cog_runStackTest and returns the number of int variables that were actually used
 * in the stack.  Provided the test code exercised ALL of the function's features in
 * that other cog, you can reduce the stack space to some value slightly above the
 * one cog_endStackTest reports.  
 *
 * @details This function uses the value returned by cog_runStackTest to stop a
 * function running in another and capture and report the number of int variables
 * that were actually used by the stack.  It also frees free the stack space 
 * cog_runStackTest allocated with its stacksize parameter.
 *
 * @param *coginfo the address returned by cog_runStackTest.
 *
 * @returns stackUsed The minimum number of int variables that should be reserved
 * with the cog_run function's stacksize parameter for the function that was
 * run with cog_runStackTest.
 */
int cog_endStackTest(int *coginfo);

/**
 * @brief Starts a function's code in the next available cog (processor) and tracks
 * how much of the call stack the cog actually utilizes. After exercising the
 * code running in another cog to its fullest extent with a liberal stack
 * size, call cogstop_stackTest to find out how much stack was actually used.
 * Then reduce the stack accordingly to reduce the application's or library's
 * overall memory footprint.
 *
 * @details Propeller applications launch in cog 0, and that cog reads from
 * and writes to unused Main RAM for call stack operations.  These
 * operations include setting aside memory for local variables, passing
 * parameters, and function call/return addresses.  
 *
 * When the application launches another cog, that cog has to have some stack
 * space set aside for those same operations to rule out possible memory
 * contentions.  It's crucial to always set aside enough stack space for
 * functions running in another cog; otherwise, the cog might inadvertently
 * overwrite other portions of the Main RAM that contain the program, global
 * variables, or other critical components.  Too much stack space is also 
 * problematic because it takes more memory than it needs to, which can prevent
 * a library from being successfully incorporated into an application.  
 *
 * The best way to avoid using too much or too little stack is to test stack usage
 * with an excessively large stack, and measure how much of it was actually used
 * with test code that exercises all its features to be sure the cog has used as
 * much stack space as it possibly can.  
 *
 * The cogstart_stackTest function behaves almost identically to cogstart, but under
 * the hood, it writes a series of pseudo-random values to the stack before starting
 * the next available cog.  After test code has exercised the code to its
 * fullest extent, the cogstop_stackTest function checks to find out how many
 * memory elements were used by finding the address furthest from the stack
 * base that does not match the sequence.
 *
 * @param *func pointer to a function with void *parameter, and void return
 * value. Example, if your function is void myFunction(void *par), then pass
 * myFunction. 
 *
 * @param *par Optional parameter that points to a memory location with data
 * to define the function's behavior.  This data typically takes the form of a 
 * structure.  
 *
 * @param *stack The stack array to set aside for the function(s) executed by the
 * other cog.  The stack array has to take the form of int stack[46 + stackTestSize],
 * where 46 is a base value required by the application, and stackTestSize is the
 * number of int values that will be tested for stack usage. Be VERY liberal with
 * the value of stackTestSize to help ensure that some library isn't using a large
 * buffer that you haven't accounted for.  If your application has an extra 4 kB,
 * consider using 1024 even for small and simple functions that run in other cogs. 
 *
 * @param stacksize Total number of bytes in the stack array. Assuming the stack
 * array was declared with int stack[46 + stackTestSize], use sizeof(stack). 
 *
 * @returns cog The number of the cog the process was launched into, or -1 if no
 * cogs were available.
 */
int cogstart_stackTest(void (*func)(void *), void *par, void *stack, size_t stacksize);

/**
 * @brief Stops function code running in another cog that was launched by 
 * cogstart_stackTest and returns the number of int variables that were actually used
 * in the stack.  Provided enough stack space was set aside and the test code
 * exercised ALL of the function's features in that other cog, you can reduce the
 * stack space to some value slightly above the one cogstop_stackTest reports.  
 *
 * @details This function uses the address of the array passed to 
 * cogstop_stackTest along with the cog number it retuned to stop the function it 
 * started and capture and report the number of int variables that were actually
 * used by the stack.  
 *
 * @param cog The cog number returned by cogstart_stackTest.
 *
 * @param *stack Address of stack array passed to cogstart_stackTest.
 *
 * @returns stackUsed The minimum number of int variables that should be declared
 * in the array passed to cogstart.  This value does not include the 44 elements
 * that are required, so make sure to add 44 to the number of elements.  Example: 
 * if cogstop_stackTest returns 64, the int stack array that gets passed to cogstart
 * should be declared with at least 44 + 64 elements.
 */
 int cogstop_stackTest(int cog, void *stack);


#if defined(__cplusplus)
}
#endif
/* __cplusplus */ 
#endif
/* STACKTEST_H */ 


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



