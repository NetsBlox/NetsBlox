/**
 * @file fingerprint.h
 *
 * @author Matthew Matz
 *
 * @version 0.50
 *
 * @copyright
 * Copyright (C) Parallax, Inc. 2017. All Rights MIT Licensed.
 *
 * @brief Simplifies reading the WaveShare fingerprint scanner module.
 */

#include "simpletools.h"                      // Include simple tools
#include "fdserial.h"

#ifndef FINGERPRINT_H
#define FINGERPRINT_H


#define ACK_SUCCESS                       0x00 // Operation successfully
#define ACK_FAIL                          0x01 // Operation failed
#define ACK_FULL                          0x04 // Fingerprint database is full
#define ACK_NOUSER                        0x05 // No such user
#define ACK_USER_EXISTS                   0x07 // already exists
#define ACK_TIMEOUT                       0x08 // Acquisition timeout

#define CMD_SLEEP                         0x2C // Sleeps the device
#define CMD_SET_MODE                      0x2D
#define CMD_ADD_FINGERPRINT_1             0x01
#define CMD_ADD_FINGERPRINT_2             0x02
#define CMD_ADD_FINGERPRINT_3             0x03
#define CMD_DELETE_USER                   0x04
#define CMD_DELETE_ALL_USERS              0x05
#define CMD_GET_USERS_COUNT               0x09
#define CMD_SCAN_COMPARE_1_TO_1           0x0B
#define CMD_SCAN_COMPARE_1_TO_N           0x0C
#define CMD_READ_USER_PRIVLAGE            0x0A
#define CMD_SENSITIVITY                   0x28
#define CMD_SCAN_GET_IMAGE                0x24
#define CMD_SCAN_GET_EIGENVALS            0x23
#define CMD_SCAN_PUT_EIGENVALS            0x44
#define CMD_PUT_EIGENVALS_COMPARE_1_TO_1  0x42
#define CMD_PUT_EIGENVALS_COMPARE_1_TO_N  0x43
#define CMD_GET_USER_EIGENVALS            0x31
#define CMD_PUT_USER_EIGENVALS            0x41
#define CMD_GET_USERS_INFO                0x2B
#define CMD_SET_SCAN_TIMEOUT              0x2E // How long to try scanning - multiples of ~0.25s


#if defined(__cplusplus)
extern "C" {
#endif


/**
 * @cond
 * Defines fpScanner interface struct
 * 9 contiguous ints + buffers
 */
typedef struct fpScanner_st
{
    int  rx_head;   /* receive queue head */
    int  rx_tail;   /* receive queue tail */
    int  tx_head;   /* transmit queue head */
    int  tx_tail;   /* transmit queue tail */
    int  rx_pin;    /* recieve pin */
    int  tx_pin;    /* transmit pin */
    int  mode;      /* interface mode */
    int  ticks;     /* clkfreq / baud */
    char *buffptr;  /* pointer to rx buffer */
    //char *idstr;
    //int  en;
} fpScanner_t;


/**
 * Defines instance of fpScanner for use with simpletext functions that 
 * accept text_t parameters.
 */
typedef text_t fpScanner;


/**
 * @endcond
 */


/**
 * @brief Open a connection to a WaveShare fingerprint scanner module.
 *
 * @param pin_rx Propeller I/O pin connected to fingerprint scanner's
 * RX pin.
 *
 * @param pin_tx Propeller I/O pin connected to fingerprint scanner's
 * TX pin.
 *
 * @returns Fingerprint Scanner device identifier for use with functions in fingerprint 
 * scanner library and functions with text_t parameter in simpletext library. 
 */
fpScanner *fingerprint_open(int pin_rx, int pin_tx);

/**
 * @brief Close a connection and recover all memory set aside for the fingerprint 
 * scanner instance.
 *
 * @param *device device identifier returned by fingerprint_open function.
 */
void fingerprint_close(fpScanner *device);


/**
 * @brief Low-level function used to send a command to the Fingerprint Scanner.
 *
 * @param *device device identifier returned by fingerprint_open function.
 *
 * @param __fpCmd the command to be sent.
 *
 * @param __fpParam1 the first parameter of the command.
 *
 * @param __fpParam2 the second parameter of the command.
 *
 * @param __fpParam3 the third parameter of the command.
 *
 * @note Must be immediately followed by the fingerprint_readResponse() function.
 */
void fingerprint_sendCommand(fpScanner *device, char __fpCmd, char __fpParam1, char __fpParam2, char __fpParam3);


/**
 * @brief Low-level function used to read a response from the Fingerprint Scanner.
 *
 * @param *device device identifier returned by fingerprint_open function.
 *
 * @param __fpResponse char array to store the response from the fingerprint scanner.
 *
 * @note Must follow the fingerprint_sendCommand() function.
 */
void fingerprint_readResponse(fpScanner *device, char *__fpResponse);


//ACK_SUCCESS, ACK_FAIL, ACK_FULL, ACK_NOUSER, ACK_FIN_EXIST, or ACK_TIMEOUT


/**
 * @brief Allow overwriting of fingerprints already stored in the memory of the Fingerprint Scanner.
 *
 * @param *device device identifier returned by fingerprint_open function.
 *
 * @param b A (1) allows overwiting, a (0) prevents overwriting stored fingerprints.
 *
 * @returns ACK_SUCCESS or ACK_FAIL.
 */
int fingerprint_allowOverwrite(fpScanner *device, char b);


/**
 * @brief Add a user's fingerprint and info to the fingerprint scanner's memory.
 *
 * @param *device device identifier returned by fingerprint_open function.
 *
 * @param userId a User Id number to assign to the user.  May be any positive integer from 1
 * to 65535.
 *
 * @param userLevel an abitrary level that can be attached to each user.  Must be a (1),
 * (2) or (3).
 *
 * @param scanNumber To record a fingerprint, the scanner must read it three times.  Passing
 * a (1), (2), or (3) tells the scanner to record the first, second, or third scans needed to
 * record the fingerprint.  Passing any integer other than (1), (2), or (3) will cause the
 * fingerprint scanner to take all three scans in succession.
 *
 * @returns ACK_SUCCESS, ACK_FAIL, ACK_FULL, ACK_TIMEOUT, or ACK_USER_EXISTS.
*/
int fingerprint_add(fpScanner *device, int userId, char userLevel, int scanNumber);


/**
 * @brief Deletes a user (or all users if no user is specified) from the fingerprint
 * module's memory.
 *
 * @param *device device identifier returned by fingerprint_open function.
 *
 * @param userId a User Id of the user to delete.  Passing an integer (0) or less than (0)
 * will delete all users from the fingerprint module.
 *
 * @returns ACK_SUCCESS or ACK_FAIL.
*/
int fingerprint_deleteUser(fpScanner *device, int userId);


/**
 * @brief Returns the number or users stored in the fingerprint scanner's memory.
 *
 * @param *device device identifier returned by fingerprint_open function.
 *
 * @returns ACK_SUCCESS or ACK_FAIL.
*/
int fingerprint_countUsers(fpScanner *device);


/**
 * @brief Scans a user fingerprint and compares it to the provided User ID.  If
 * no User ID is provided, it finds and stores the User ID in the specified variable.
 *
 * @param *device device identifier returned by fingerprint_open function.
 *
 * @param userId the User ID to match the fingerprint being scanned to.  If this is
 * set to (0), it will check the scan against all of the stored user fingerprints.
 * 
 * @param *uid a variable to store the matched User Id of the scanned fingerprint
 * into.  Stores (0) into the variable if no matching user was found.
 *
 * @returns User Privalage (1, 2, or 3) or ACK_FAIL.
*/
int fingerprint_scan(fpScanner *device, int userId, int *uid);


/**
 * @brief Looks up the stored user privalage for the provided User ID.  
 *
 * @param *device device identifier returned by fingerprint_open function.
 *
 * @param userId The User ID to look up.
 *
 * @returns User privalage (1, 2, or 3) or ACK_FAIL.
*/
int fingerprint_lookupUserPrivlage(fpScanner *device, int userId); 

/**
 * @brief Sets the timeout for a scan.  
 *
 * @param *device device identifier returned by fingerprint_open function.
 *
 * @param timeout how long to keep trying before timing out.  Number represents how
 * many attempts the module keeps trying to make.
 *
 * @returns ACK_SUCCESS or ACK_FAIL.
*/
int fingerprint_setTimeout(fpScanner *device, int timeout);

/**
 * @brief Sets the comparison strictness.  
 *
 * @param *device device identifier returned by fingerprint_open function.
 *
 * @param s_level A positive integer to set the comparison level to: (0) 
 * [not very strict] to (9) [very strict].
 *
 * @returns ACK_SUCCESS or ACK_FAIL.
*/
int fingerprint_setStrictness(fpScanner *device, char s_level);



#if defined(__cplusplus)
}
#endif
/* __cplusplus */ 
#endif
/* FINGERPRINT_H */ 


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



