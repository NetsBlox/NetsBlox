/**
  @file wifi.h
                                                                               //
  @author Andy Lindsay

  @version 0.81 for firmware 1.0

  @copyright
  Copyright (C) Parallax, Inc. 2017. All Rights MIT Licensed.

  @brief API for the Parallax WX Wi-Fi Module ESP8266-WROOM-02 (Part #32420).
  This library has a preliminary API that provides a starting point for some 
  examples in the publication queue, and also for the Parallax open source 
  community to build and improve upon. 
  
  Examples that demonstrate a collection of applications that use this library 
  are in the 32420-Parallax-ESP-...zip archive's .../Examples/Propeller C 
  folder. It's available from the Downloads sections on the Parallax WX Wi-Fi 
  Module pages at www.parallax.com (search 32420).  Look for the "Parallax WX 
  Wi-Fi Module Firmware and Example Files" link.  Make sure to unzip to a 
  folder and open the programs from there, not from within the .zip itself!  
  
  Also, make sure to update the Wi-Fi module's firmware.  The Parallax ESP.ota
  file is in the top directory of the same .zip where you got the examples, 
  and update instructions are in learn.parallax.com/propeller-c-wx-wi-fi.  
  The code examples have web addresses to application circuits in the 
  comments, and tutorials will come online, one at a time in the 
  learn.parallax.com/propeller-c-wx-wi-fi pages.

  This library was designed to keep a variety of connection options open for 
  the Propeller Activity Board (WX and pre-WX) as well as other boards.  It was 
  also designed to coexist with the Simple Libraries that come with SimpleIDE.  
  The goal was to make sure that all the familiar features could be used with a
  minimum of caveats and memory penalties.  
  
  Parallax encourages the open source community to expand this library, 
  the pool of examples, and even the module firmware itself.  Here are the 
  project locations on the Parallax GitHub.  Make sure to branch, modify, 
  and then submit a pull request.  We'd also like to encourage you to visit 
  the Issues tab in these repositories if you run across something that looks 
  like a bug or misprint, or if you have suggestions for improvement.
   
  @li Community application contributions:
  https://github.com/parallaxinc/Parallax-Wi-Fi-Apps/tree/master/Community/Propeller-C

  @li Library updates:
  https://github.com/parallaxinc/Simple-Libraries/tree/master/Learn/Simple%20Libraries
  
  @li Module firmware:
  https://github.com/parallaxinc/Parallax-ESP
                                                                                
  The example programs make heavy use of the wifi_print and wifi_scan funcitons.
  They behave similarly to the print and scan functions for SimpleIDE 
  terminal and are intended to be helpful to folks who might just be "getting 
  their feet wet" with IoT.  
                                                                                
  There's also a wifi_command function that is somewhat less restrictive, 
  allowing programmers to form the command strings and parse all the module 
  responses.  For best results, use it in conjunction with the Wi-Fi module's 
  Serial API document.  (The Serial API is also in the Downloads section on the 
  Wi-Fi module product page, with a link named Parallax Wi-Fi Module Firmware 
  Guide and a filename of "32420-Parallax-Wi-Fi-Module-API-v...pdf".  We hope 
  that this will be helpful in prototyping new functions that supply a more 
  intermediate level of granularity or enhance the educational experience of 
  using these modules with the Propeller.
  
  To Do:
  @li Poll function allow focus on particular id/handle.
  @li Add formatting flags to make scan funcitons able to not exit 
      on spaces.
*/


#ifndef WIFI_H
#define WIFI_H

#if defined(__cplusplus)
extern "C" 
{
#endif

#include "simpletools.h"
#include "fdserial.h"
//#define WIFI_DEBUG



/**
 * @name wifi_start function constants
 * @{
 */



#ifndef WX_ALL_COM
/**
  Argument option for the wifi_start function's comSelect parameter.
  WX_ALL_COM makes the Propeller microcontroller send/receive 
  command and terminal data through the Wi-Fi
  module assuming that the WX Activity Board's SEL pin has been 
  pulled high. 
*/
#define WX_ALL_COM     -1
#endif


#ifndef USB_PGM_TERM
/**
  Argument option for the wifi_start function's comSelect parameter.
  USB_PGM_TERM runs programming and terminal data through USB.  Wi-
  Fi application communication is routed from selected I/O pins 
  through the Activity Board's DI and DO sockets.    
*/
#define USB_PGM_TERM   -2
#endif


#ifndef USB_PGM
/**
  Argument option for the wifi_start function's comSelect parameter.
  USB_PGM runs programming data through USB.  Terminal and Wi-Fi 
  application communication are routed from selected I/O pins 
  through the Activity Board's DI and DO sockets.
*/
#define USB_PGM        -3
#endif



/**
  @}
  @name Serial Command Tokens
  @{
*/


#ifndef ARG
/**
  @brief Command token for retrieving a GET or POST request's name
  argument.
*/
#define ARG         0xE6
#endif

#ifndef CONNECT
/**
  @brief Command token for attempting to establish a TCP 
  connection.
*/
#define CONNECT     0xE4
#endif


#ifndef CLOSE
/**
  @brief Command token for terminating a connection or listiner
  with either its ID or handle.
*/
#define CLOSE       0xE8
#endif


#ifndef CHECK
/**
  @brief Command token used to check a Wi-Fi module setting or I/O 
  pin state.
*/
#define CHECK       0xEE
#endif


#ifndef JOIN
/**
  @brief Command token for joining a network.
*/
#define JOIN        0xEF
#endif


#ifndef LISTEN 
/**
  @brief Command token for setting up a listener process that
  monitors HTTP or WebSocket activity.
*/
#define LISTEN      0xE7
#endif


#ifndef PATH
/**
  @brief Command token used to check the path that is associated with a 
  connection handle listener ID.
*/
#define PATH        0xEB
#endif


#ifndef POLL
/**
  @brief Command token used to poll for events on paths that have listeners
  or connections set up.
*/
#define POLL        0xEC
#endif

#ifndef RECV
/**
  @brief Command token for retrieving TCP/WebSocket data or HTTP 
  body.
*/
#define RECV        0xE9
#endif


#ifndef REPLY
/**
  @brief Command token for transmitting HTTP data in response to a
  GET or POST request.
*/
#define REPLY       0xE5
#endif


#ifndef SEND
/**
  @brief Command token used for SENDing TCP, WebSocket, or extended
  HTTP body data.
*/
#define SEND        0xEA
#endif


#ifndef SET
/**
  @brief Command token used to "set" a Wi-Fi module setting or I/O 
  pin state.  
*/
#define SET         0xED
#endif



/**
 * @}
 *
 * @name Serial Parameter Tokens
 * @{
 */



#ifndef AP
/**
  @brief Token that can be used for both setting up and checking 
  the Wi-Fi module's access point mode.  In this mode, the Wi-Fi 
  module is an access point that provides wireless (but not 
  Internet) access.  
*/
#define AP          0xF3
#endif


#ifndef CMD
/**
  @brief Begin marker token placed at the start of serial commands 
  to the Wi-Fi module.  Data that does not appear between CMD and
  '\\r' is passed through as transparent serial data.  CMD is also 
  used in wifi_print/scan's type parameter to tell it to treat the 
  formatted data to/from the Wi-Fi module as a command.
 */


#define CMD         0xFE
#endif


#ifndef GET
/**
  @brief A token returned by POLL to indicate that a GET request
  with a path that matched one on a listener has been received by 
  the Wi-Fi module.  
*/
#define GET          'G'
#endif


#ifndef HTTP 
/**
  @brief One of the argument option tokens that can be used with the
  LISTEN command token to set up an HTTP event listener.  
*/
#define HTTP        0xF7
#endif


#ifndef POST
/**
  @brief A token returned by POLL to indicate that a POST request
  with a path that matched one set up on a listener has been 
  received by the Wi-Fi module.  Also used in wifi_scan's type 
  parameter to tell it to treat the formatted data to/from the 
  Wi-Fi module as WebSocket data.
*/
#define POST         'P'
#endif


#ifndef STA
/**
  @brief Token used for both setting up and indicating station mode.
  In this mode, the Wi-Fi module is a station on a wireless network
  that is hosted by some other access point.
*/
#define STA         0xF4
#endif


 
#ifndef STA_AP
/**
  @brief Token used for both setting up and indicating station 
  plus access point mode.  This mode should only be used when 
  searching for networks and joining one.  After the Wi-Fi module 
  has joined another access point, it should be switched to STA 
  mode. 
*/
#define STA_AP      0xF2
#endif


#ifndef TCP
/**
  @brief Constant that can be passed to the wifi_print/scan's type 
  parameter to tell it to treat the formatted data to/from the Wi-Fi
  module as TCP data.
*/
#define TCP         0xF5
#endif


#ifndef WS
/**
  @brief One of the argument option tokens that can be used with the
  LISTEN command token to set up a WebSocket event listener.  This 
  token can also be returned by POLL to indicate that a WebSocket
  request matching a listener ID's path has been received.  Also used
  in wifi_print/scan's type parameter to tell it to treat the 
  formatted data to/from the Wi-Fi module as WebSocket data.
*/
#define WS          0xF6 
#endif



/**
 * @}
 *
 * @name Module I/O Constants
 * @{
 */



#ifndef GPIO_DI
/**
  @brief Token used with the CHECK command to
  check the 1/0 input state of the Wi-Fi module's DI pin.
*/
#define GPIO_DI        1     //  1                 // ->  DI
#endif


#ifndef GPIO_DO
/**
  @brief Token used with the SET command to
  set the 1/0 output state of the Wi-Fi module's DO pin.
*/
#define GPIO_DO        3     //  2                 // <-  DO
#endif


#ifndef GPIO_RTS
/**
  @brief Token used with the SET command to set the 1/0 output 
  state of the Wi-Fi module's //RTS pin.
*/
#define GPIO_RTS      15     //  3                 // <-  //rTS
#endif


#ifndef GPIO_CTS
/**
  @brief Token used in conjunction with the SET/CHECK command
  tokens to set/check the 1/0 output/input states of the Wi-Fi 
  module's /CTS pin.
*/
#define GPIO_CTS      13     //  4                 // <-> /CTS
#endif


#ifndef GPIO_ASC
/**
  @brief Token used with the SET command token to set the 1/0 
  output state of the Wi-Fi module's ASSOC pin.
*/
#define GPIO_ASC       5     //  5                 // <-  ASC
#endif


#ifndef GPIO_DBG
/**
  @brief Token used with the SET command token to set the 1/0 
  output state of the Wi-Fi module's DBG pin.
*/
#define GPIO_DBG        2     //  6                 // <-  DBG
#endif


#ifndef GPIO_PGM
/**
  @brief Token used with the CHECK command to check the 1/0 
  input state of the Wi-Fi module's PGM pin.
*/
#define GPIO_PGM        0     //  7                 // ->  PGM
#endif



/**
 * @}
 *
 * @name Error Codes
 * @{
 */



#ifndef INVALID_REQUEST
/**
  @brief Error Code for invalid request.
 */
#define INVALID_REQUEST 1
#endif


#ifndef INVALID_ARGUMENT
/**
  @brief Error code for invalid argument.
 */
#define INVALID_ARGUMENT 2
#endif


#ifndef WRONG_ARGUMENT_COUNT
/**
  @brief Error code for incorrect argument count.
 */
#define WRONG_ARGUMENT_COUNT 3
#endif


#ifndef NO_FREE_LISTENER
/**
  @brief Error code indicating all event listeners are in use.
 */
#define NO_FREE_LISTENER 4
#endif


#ifndef NO_FREE_CONNECTION
/**
  @brief Error code indicating all connections are in use.
 */
#define NO_FREE_CONNECTION 5
#endif


#ifndef LOOKUP_FAILED
/**
  @brief Error code indicating lookup failed.
 */
#define LOOKUP_FAILED 6
#endif


#ifndef CONNECTION_FAILED 
/**
  @brief Error code indicating that the connection failed.
 */
#define CONNECTION_FAILED 7
#endif


#ifndef SEND_FAILED
/**
  @brief Error code indicating that the send operation failed.
 */
#define SEND_FAILED 8
#endif


#ifndef INVALID_STATE
/**
  @brief Error code indicating the Wi-Fi module is in an
  invalid state.
 */
#define INVALID_STATE 9
#endif


#ifndef INVALID_SIZE 
/**
  @brief Error code indicating that an invalid size argument
  was received.
 */
#define INVALID_SIZE 10
#endif


#ifndef DISCONNECTED 
/**
  @brief Error code indicating that a disconnect occurred.
 */
#define DISCONNECTED 11
#endif


#ifndef NOT_IMPLEMENTED_ERROR_12 
/**
  @brief Error code not inplemented.
 */
#define NOT_IMPLEMENTED_ERROR_12 12
#endif


#ifndef BUSY 
/**
  @brief Error code indicating that the module is busy.
 */
#define BUSY 13
#endif


#ifndef INTERNAL_ERROR 
/**
  @brief Error indicating that an unspecified error 
  occurred in the Wi-Fi module.
 */
#define INTERNAL_ERROR 14
#endif



/**
 * @}
 *
 * @name Network Codes
 * @{
 */



#ifndef NO_ERROR 
/**
  @brief Accopanies the 'S' for success, example: [0xFE]S,0[0x0D]
 */
#define NO_ERROR 0
#endif


#ifndef OUT_OF_MEMORY 
/**
  @brief Network code indicating that the module is out of memory.
 */
#define OUT_OF_MEMORY -1
#endif


#ifndef UNDEFINED_NEG2
/**
  @brief Not yet defined
 */
#define UNDEFINED_NEG2 -2
#endif


#ifndef TIMEOUT 
/**
  @brief Network code for indicating that a timeout occurred.
 */
#define TIMEOUT -3
#endif


#ifndef ROUTING_PROBLEM 
/**
  @brief Network code indicating a routing problem occurred.
 */
#define ROUTING_PROBLEM -4
#endif


#ifndef OPERATION_IN_PROCESS 
/**
  @brief Network code indicating that an operatino is in proress.
 */
#define OPERATION_IN_PROCESS -5
#endif


#ifndef UNDEFINED_NEG6 
/**
  @brief Undefined.
 */
#define UNDEFINED_NEG6 -6
#endif


#ifndef NUMBER_TOO_LARGE 
/**
  @brief Network code indicating that a number was too large.
 */
#define NUMBER_TOO_LARGE -7
#endif


#ifndef CONNECTION_ABORTED 
/**
  @brief Nework code indicating that a connection was aborted.
 */
#define CONNECTION_ABORTED -8
#endif


#ifndef CONNECTION_RESET 
/**
  @brief Network code indicating that the connection was reset.
 */
#define CONNECTION_RESET -9
#endif


#ifndef CONNECTION_CLOSED 
/**
  @brief Network code indicating that the connection was closed.
 */
#define CONNECTION_CLOSED -10
#endif


#ifndef NOT_CONNECTED 
/**
  @brief Network code indicating that the module is not connected.
 */
#define NOT_CONNECTED -11
#endif


#ifndef ILLEGAL_ARGUUMENT 
/**
  @brief Network code indicating an illegal argument was received.
 */
#define ILLEGAL_ARGUUMENT -12
#endif


#ifndef UNDEFINED_NEG13 
/**
  @brief Undefined number 13.
 */
#define UNDEFINED_NEG13 -13
#endif


#ifndef UDP_SEND_ERROR 
/**
  @brief Network code indicating that a UDP send error occurred.
 */
#define UDP_SEND_ERROR -14
#endif


#ifndef ALREADY_CONNECTED 
/**
  @brief Network code allerting that an attempt was made to create
  a connection that has already been established.
 */
#define ALREADY_CONNECTED -15
#endif


#ifndef SSL_HANDSHAKE_FAILED
/**
  @brief Network code indicating that an SSL handshake failed.
 */
#define SSL_HANDSHAKE_FAILED -28 
#endif


#ifndef SSL_APPLICATION_INVALID
/**
  @brief Network code indicating that an SSL application is invalid.
 */
#define SSL_APPLICATION_INVALID -61 
#endif



/**
  @}
 */



/**
  @brief Sets the size (in bytes) of the Wi-Fi communication buffer.

  @param bytes Number of bytes the buffer should be.
 
  @returns *buffer A pointer to the buffer that was created.
*/
char *wifi_bufferSize(int bytes);


/**
  @brief Send a string command to the Wi-Fi module using its serial protocol,
  and get the Wi-Fi module's response.  For more information on the serial 
  protocol, consult the Serial Commands section in the Parallax 
  Wi-Fi Module Firmware Guide. It's in the Downloads section of the Wi-Fi
  module's product page (search for 32420) at www.parallax.com.  Example:
  reply = wifi_command("SET:pin-gpio13,1\\r"); // Set Wi-Fi module's 
  /CTS pin to output-high. 

  @param command A pointer to a string that contains a valid serial command, 
  that has been stripped of its command start character (the default is 254).
  The string terminates with a carriage return (\\r).    
 
  @returns &wifi_buf[1] The address of the first printable character in the
  Wi-Fi module's reply.
*/
char *wifi_command(char * command);


/**
  @brief Attempt a TCP connection to address on port.  

  @param *address The destination address of the target to connect to.
 
  @param port The destination address of the target to connect to.
 
  @returns A handle to the TCP connection (positive value), or a negative 
  error code.
*/
int  wifi_connect(char *address, int port);


/**
  @brief Terminate an established connection or listener via its handle or id 
  (respectively), freeing it to rejoin the available connection or listener 
  pools.

  @param idOrHandle The handle returned by wifi_connect or id returned by 
  wifi_listen.
 
  @returns 0 on success, or positive errir or a negative network code.
*/
int wifi_disconnect(int idOrHandle);


/**
  @brief Check the IP address for the Parallax Wi-Fi module.

  @param mode Determines which Wi-Fi mode is used, either STA (staion mode
  IP address) or AP (access point IP address).
 
  @param ipAddr A pointer to a four element int array.
 
  @returns status 'S' for success or 'E' for error.
*/
int wifi_ip(int mode, int *ipAddr);


/**
  @brief Attempt to join a network via the ssid access point using passphrase. 

  @param *network The desired access point’s SSID name.
 
  @param *password The desired access point’s passphrase.
 
  @returns 0 on success, or error code (a negative value). 
*/
int wifi_join(char *network, char *password);


/**
  @brief Leave an AP network and transition into a mode that's not pure STA.
  The wi-fi module will forget the current station IP address.

  @param newMode The new mode after leaving a network, either STA_AP 
  (station + access point) or AP (access point).
 
  @returns The new mode constant, either STA_AP (0xF2) or AP (0xF3).
*/
int wifi_leave(int newMode);


/**
  @brief Activate a listener process to monitor HTTP or WebSocket 
  protocol activity on port 80 with a specified path.  

  @param protocol Use HTTP (for HTTP), or WS (for WebSocket).  
  
  @param path The 'path' part of the URL that the remote client uses
  to access this module and its resources.  The path can end in an 
  asterisk '*' to match anything that begins with path. 
 
  @returns wifi_id (positive if success, negative if error code). 
*/
int  wifi_listen(char protocol, char *path);


/**
  @brief Set or check the Wi-Fi module's network mode.

  @param mode Use AP (access point), STA_AP (station + access point),
  or STA (station only).  To check use CHECK.
 
  @returns mode, either the new or the current mode.
*/
int wifi_mode(int mode);


/**
  @brief Check for activity like incoming HTTP GET/POST requests, 
  HTTP/WebSocket/TCP connections/disconnections, and incoming WebSocket/TCP 
  data.  Example: int event, id, handle;...wifi_poll(&event, &id, &handle);  

  @param event Address of the variable to receive the event poll reports.
  Values that wifi_poll might place in this variable include: 'G' (GET request),
  'P' (POST request), 'W' (WebSocket connection request), 'D' (data ready), 
  'S' (success of a reply or send operation), 'X' (disconnect occurred), 
  'N' (nothing to report), and 'E' (error).  For more information on these
  codes and their meanings, see the POLL command section in the Parallax 
  Wi-Fi Module Firmware Guide. You can find it in the Downloads section 
  of the Wi-Fi module's product page (search for 32420) at www.parallax.com.   
   
  @param id The identifier of the listener that matched the request.
 
  @param handle The connection identifier to use for this request.
*/
void wifi_poll(int *event, int *id, int *handle);


/**
  @brief The Wi-Fi module version of the simpletext library's print function.  
  It simplifies formatting data in strings that can be: Responses to GET 
  requests, WebSocket data transmitted, serial commands to the Wi-Fi module, 
  and outgoing TCP messages.  This function can be called to send unsolicited 
  data to a WebSocket, a serial command to a Wi-Fi module, or for transmitting 
  a TCP string.  It can also be called to reply to an HTTP GET request, which 
  is indicated by wifi_poll storing 'G' in the event variable.  

  This function has lots of usage examples in the /Examples/Propeller
  C subfolder of parallax-esp-2016-11-02-1804b and newer.  The zip file with 
  this folder is in the downloads section of the Parallax Wi-Fi Module 
  page at www.parallax.com (search 32420).  
  
  @param protocol GET (response to incoming HTTP GET request), WS (outgoing 
  WebSocket data), CMD (command string + data sent to module), or TCP, 
  (TCP data send). 
 
  @param handle The handle value from the most recent wifi_poll call.  
 
  @param *fmt A subset of format strings available in the print function.  
  Supported: "%b" (binary), "%c" (character), "%d" (integer), "%f" (32-bit 
  floating point), "%s" (string) and "%x" (hexadecimal).  Many of the length
  and precision modifiers are also supported, like "%6.2f", which will 
  result in six digits and two digits of precision.  Note, in v0.80, 
  if the protocol is TCP, only one "%s" is supported.  After updates to 
  the simpletext library, this will likely support more options.
  
  @param ... The argument list, typically pointers to the variables that 
  correspond to format string elements.  
 
  @returns blocks The number of blocks scanned. 
*/
int  wifi_print(int protocol, int handle, const char *fmt, ...);


/**
  @brief Retrieve incoming HTTP body or WebSocket/TCP data.

  @param handle An active connection handle; returned by CONNECT or POLL.
 
  @param *data Address of the character array to receive the response.
 
  @param size The maximum number of bytes to receive.
 
  @returns number of bytes received.
*/
int  wifi_recv(int handle, char *data, int size);


/**
  @brief Copy a reply from the libwifi response buffer to a character array.

  @param *targetStr The address of the array that will receive a copy of the
  response buffer.
 
  @returns 
*/
int  wifi_replyStringCopy(char *targetStr);


/**
  @brief The Wi-Fi module version of the simpletext library's scan function.  
  It simplifies extracting data contained in strings from incoming POST 
  requests, WebSocket data, responses to commands, and TCP messages.  This 
  Function can be called after the wifi_poll function has sent event information
  that an incoming request//response/message is ready for the Propeller to
  receive.  This command has a variety of usage examples in the 
  /Examples/Propeller C subfolder of parallax-esp-2016-11-02-1804b and newer.
  The zip file with this folder is in the downloads section of the Parallax 
  Wi-Fi Module page at www.parallax.com (search 32420).  
  
  @param protocol POST (incoming HTTP POST request), WS (incoming WebSocket data),
  CMD (incoming reply to a command that was issued with wifi_print), or TCP,
  incoming TCP data. 
 
  @param handle The handle value from the most recent wifi_poll call.  
 
  @param *fmt A subset of format strings available in the scan function.  
  Supported: "%b" (binary), "%c" (character), "%d" (integer), "%f" (32-bit 
  floating point), "%s" (string) and "%x" (hexadecimal).  For POST requests,
  the name in the name/value pair should be prepended.  For example, note the
  io in wifi_scan(POST, handle, "io%d%d", &pin, &state);  Note, in v0.80, 
  if the protocol is TCP, only one "%s" is supported.  After updates to 
  the simpletext library, this will likely support more options.
 
  @param ... The argument list, typically pointers to the variables that 
  correspond to format string elements.  Use "&variable" for char, int, 
  and float or arrayName (without the ampersand) for arrays.
 
  @returns blocks The number of blocks scanned. 
*/
int  wifi_scan(int protocol, int handle, const char *fmt, ...);


/**
  @brief Transmit WebSocket/TCP data, or extended HTTP body (after REPLY command).

  @param handle An active connection handle; returned by CONNECT or POLL.
  
  @param data A zero terminated string (character array or string constant)
  that contains the data.
 
  @param size The number of bytes of data in this transmission.
  
  @returns Number of bytes sent.
*/
char wifi_send(int handle, char *data, int size);


/**
  @brief Sets the Wi-Fi buffer to an user declared external character 
  array.

  @param buffer A pointer to the buffer that will store the 
  commands and data transmitted to the Wi-Fi module and its replies.

  @param size Number of bytes in the buffer.
*/
void wifi_setBuffer(char *buffer, int size);


/**
  @brief Set up Wi-Fi module serial connections for data
  command and transparent data communication.
  
  @param fromDO Number of Propeller I/O pin that will receive 
  signals from the Wi-Fi module's DO pin.

  @param toDI Number of Propeller I/O pin that will transmit 
  signals to the Wi-Fi module's DI pin.

  @param baud Communication baud rate (default 115200).

  @param comSelect Defines which lines transmit and receive terminal
  data.  Options:

  @li WX_ALL_COM - All programming, terminal and Wi-Fi application 
  communication is routed through the WX Wi-Fi module on a
  Propeller Activity Board WX.  SEL must be set high, and DO and 
  DI should be left floating.  IPMORTANT: 31 and 30 are the only
  toDI and fromDO arguments that should be used with this mode.
  Example: wifi_start(31, 30, 115200, WX_ALL_COM)

  @li USB_PGM_TERM - Programming and terminal data through USB.  Wi-
  Fi application communication is routed from selected I/O pins 
  through the Activity Board's DI and DO sockets.  SEL must be pulled
  low.  
  Example: wifi_start(10, 9, 115200, USB_PGM_TERM);

  @li USB_PGM - Programming through USB but terminal and Wi-Fi app 
  communication goes through the WX Wi-Fi Module using the Activity 
  Board's DO and DI sockets.  Pull SEL low, during programming only.
  Example: wifi_start(10, 9, 115200, USB_PGM); 

  @li Values 0..31 - I/O pin controlled switching between USB terminal
  and WX Wi-Fi app communication.  SEL should be connected to an I/O 
  pin, and also pulled low if programmed through USB, or high if 
  programmed through WX Wi-Fi.  Leave Activity Board DO and DI floating.  
  NOTE: Programming over Wi-Fi is only for Activity Board WX.  If your 
  Activity Board is not WX, only load programs through USB with SEL 
  pulled down.  Example: wifi_start(31, 30, 115200, 8);
  
  @returns *wifi_fds - The full duplex serial connection ID.  
*/
fdserial *wifi_start(int fromDO, int toDI, int baud, int comSelect);


/**
  @brief Stops the process started by wifi_start and recovers any
  memory that was allocated for command/reply storage and parsing.
*/
void wifi_stop(void);


#if defined(__cplusplus)
}
#endif
/* __cplusplus */ 
#endif
/* WIFI_H */ 

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

