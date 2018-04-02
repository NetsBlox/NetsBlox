#ifndef __XBEE_H__
#define __XBEE_H__

#include "fdserial.h"

/**
 * Opens the serial line, forces the chip into 115200 baud and 
 * (transparent=0 or api=1) mode. This function uses a sequence
 * of "+++", "ATBD", "ATAP" and "ATCN" commands.
 */
fdserial* xbee_open(int rxpin, int txpin, int mode);

/**
 * Closes the serial line.
 */
void xbee_close(fdserial* xbee);

/**
 * Reads all characters untill no character is received within the
 * given timeout in milliseconds.
 */
void xbee_flush(fdserial* xbee, int timeout);

/**
 * Sends the characters to the given serial interface.
 */
void xbee_send_str(fdserial* xbee, const char* data);

/**
 * Compares characters read from the terminal to the specified 
 * string, returns the number of matched characters (not including 
 * the terminating zero) or -1 if timeout in ms is reached.
 */
int xbee_recv_str(fdserial* xbee, const char* data, int timeout);

/**
 * Sends the given API frame over the serial.
 */
void xbee_send_api(fdserial* xbee, const void* data, int len);

/**
 * Receives an API frame from the serial and stores it in the given
 * buffer. If the frame is longer than the buffer length, then the
 * frame is truncated. Returns the length of the (non-truncated)
 * frame or -1 if the timeout in ms is reached, or -2 if the packet 
 * had crc error.
 */
int xbee_recv_api(fdserial* xbee, void* data, int len, int timeout);

#endif //__XBEE_H__
