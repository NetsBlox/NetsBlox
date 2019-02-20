/*
  wifi Library Test Harness
*/

#include "simpletools.h"
#include "wifi.h"

#define Empty_Main_Function
//#define ActivityBot_Buttons_Host
//#define ActivityBot_Buttons_IR_Speed_Host 
//#define IFTTT_Send_Email
//#define Light_Controls_Canvas_Host
//#define Page_Controls_light_Host
//#define Page_Controls_Servo_Host
//#define Page_Displays_Buttons_Host
//#define Pot_Controls_Canvas_Host
//#define Test_Join_Leave
//#define Test_Serial_Commands
//#define Temperature_From_OpenWeatherMap
//#define Text_from_www_page_with_TCP
//#define Text_Page_to_Micro_Host
//#define Val_from_Micro_Host
//#define Ws_ActivityBot_Btns_Ir_Speed_Host
//#define Ws_Disconnect_Test

// Notes

  // All communication through WX Wi-Fi module on Activity Board WX.
  // SEL must be pulled high, and leave Activity Board DO and DI floating.
  // wifi_start(31, 30, 115200, WX_ALL_COM);     

  // The compatibility modes below work with all Activity Boards (WX & non-WX).

  // I/O pin controlled switching between USB terminal and WX Wi-Fi app 
  // communication.  SEL should be connected to an I/O pin, and also pulled low 
  // if programmed through USB, or high if programmed through WX Wi-Fi.  Leave 
  // Activity Board DO and DI floating.  
  // NOTE: Programming over Wi-Fi is only for Activity Board WX.  If your 
  // Activity Board is not WX, only load programs through USB with SEL pulled
  // down.
  //wifi_start(31, 30, 115200, 8);

  // Programming and terminal through USB and Wi-Fi app communication through the
  // WX Wi-Fi Module using the DO and DI sockets.  Pull SEL low, and connect I/O 
  // to DO and DI.
  //wifi_start(10, 9, 115200, USB_PGM_TERM);

  // Programming through USB but terminal and Wi-Fi app communication through the
  // WX Wi-Fi Module using the Activity Board's DO and DI sockets.  Pull SEL low, 
  // during programming only.
  //wifi_start(10, 9, 115200, USB_PGM);


#ifdef Empty_Main_Function

#include "simpletools.h"
#include "wifi.h"
int main()
{
  return 0;
}

#endif // Empty_Main_Function
  

#ifdef ActivityBot_Buttons_Host

/*
  Mechanical Assembly
  http://learn.parallax.com/tutorials/robot/activitybot/
  activitybot/mechanical-assembly

  Electrical Connections
  http://learn.parallax.com/tutorials/robot/activitybot/
  activitybot/electrical-connections
  
  Programming and Wi-Fi selection circuits at:
  http://learn.parallax.com/propeller-c-wx-wi-fi 
  Make sure to change the wifi_start call in the code to match
  the COM control circuit you choose.
  
  Application page should be loaded into the Wi-Fi module
  and then accessed through: 
  http://wi-fi-module's-ip/files/activitybot-btns.html
  
  Note: This example relies on the 0.8 version of the wifi library.  
  Updates may change some function behaviors in later releases.
*/

#include "simpletools.h"
#include "wifi.h"
#include "abdrive.h"

int event, id, handle;
int navId;
char buttonCmd;
int speedLeft = 0, speedRight = 0;

int main()
{  
  wifi_start(31, 30, 115200, WX_ALL_COM);     

  navId = wifi_listen(HTTP, "/bot"); 
  print("navId = %d\n", navId);
  
  drive_speed(10, 10);

  while(1)
  {
    wifi_poll(&event, &id, &handle); 
    print("event: %c, id: %d, handle: %d\r", 
               event,     id,     handle);
    
    if(event == 'P')
    {
      if(id == navId)
      {
        print("Incoming POST request\r");
        pause(500);
        wifi_scan(POST, handle, "go%c", &buttonCmd);
        print("go=%c\n", buttonCmd);
      }        
    }
    
    if(buttonCmd != 0)
    {
      switch(buttonCmd)
      {
        case 'F': 
          if(speedLeft > speedRight) speedRight = speedLeft;
          else if(speedRight > speedLeft) speedLeft = speedRight;
          else
          {
            speedLeft += 16;
            speedRight += 16;
          }            
          break;
        case 'L':
          speedLeft -= 16;
          speedRight += 16;
          break;
        case 'R':
          speedLeft += 16;
          speedRight -= 16;
          break;
        case 'B':
          if(speedLeft < speedRight) speedRight = speedLeft;
          else if(speedRight < speedLeft) speedLeft = speedRight;
          else
          {
            speedLeft -= 16;
            speedRight -= 16;
          }            
          break;
        case 'S':
          speedLeft = 0;
          speedRight = 0;
          break;
      } 
      if(speedLeft  >= 128)  speedLeft  = 128;
      if(speedLeft  <= -128) speedLeft  = -128;
      if(speedRight >= 128)  speedRight = 128;
      if(speedRight <= -128) speedRight = -128;         

      drive_speed(speedLeft, speedRight);
      print("speedLeft = %d, speedRight = %d\r", speedLeft, speedRight);
      buttonCmd = 0;
    }            
    pause(200);
  }    
}

#endif  // ActivityBot_Buttons_Host


#ifdef ActivityBot_Buttons_IR_Speed_Host

/*
  Mechanical Assembly
  http://learn.parallax.com/tutorials/robot/activitybot/
  activitybot/mechanical-assembly

  Electrical Connections
  http://learn.parallax.com/tutorials/robot/activitybot/
  activitybot/electrical-connections
  
  Application Circuit
  http://learn.parallax.com/tutorials/robot/activitybot/activitybot/
  navigate-infrared-flashlights/build-ir-sensor-circuits

  Programming and Wi-Fi selection circuits at:
  http://learn.parallax.com/propeller-c-wx-wi-fi 
  Make sure to change the wifi_start call in the code to match
  the COM control circuit you choose.
  
  Application page should be loaded into the Wi-Fi module
  and then accessed through: 
  http://wi-fi-module's-ip/files/activitybot-btns-ir-speed.html
  
  Note: This example relies on the 0.8 version of the wifi library.  
  Updates may change some function behaviors in later releases.
*/

#include "simpletools.h"
#include "wifi.h"
#include "abdrive.h"

int event, id, handle;
int navId, spdId, irId;
char buttonCmd, buttonCmdPrev;
int speedLeft = 0, speedRight = 0, speedVal = 50;
int irLeft, irRight;

int main()
{  
  wifi_start(31, 30, 115200, WX_ALL_COM);     

  navId = wifi_listen(HTTP, "/bot"); 
  print("navId: %d\r", navId);
  
  spdId = wifi_listen(HTTP, "/spd");
  print("spdId: %d\r", spdId);
  
  irId = wifi_listen(HTTP, "/ir");
  print("irId: %d\r", irId);

  drive_speed(0, 0);

  while(1)
  {
    wifi_poll(&event, &id, &handle); 
    print("event: %c, id: %d, handle: %d\r", 
               event,     id,     handle);
    
    if(event == 'P')
    {
      print("Incoming POST request\r");
      if(id == navId)
      {
        wifi_scan(POST, handle, "go%c", &buttonCmd);
        print("go=%c\r", buttonCmd);
        buttonCmdPrev = buttonCmd;
      }
      else if(id == spdId)
      {
        wifi_scan(POST, handle, "v%d", &speedVal);
        print("v=%d\r", speedVal);
        buttonCmd = buttonCmdPrev;
      }
    }
    else if(event == 'G')
    {
      print("Incoming GET request\r");
      
      if(id == irId)
      {
        freqout(11, 1, 38000);
        irLeft = input(10);
    
        freqout(1, 1, 38000);
        irRight = input(2);
    
        print("Reply: %01b%01b\r", irLeft, irRight);
        wifi_print(GET, handle, "%01b%01b\r", irRight, irLeft);
      }        
    }
  
    if(buttonCmd != 0)
    {
      switch(buttonCmd)
      {
        case 'F': 
          speedLeft  =  speedVal;
          speedRight =  speedVal;
          break;
        case 'L':
          speedLeft  = -speedVal;
          speedRight =  speedVal;
          break;
        case 'R':
          speedLeft  =  speedVal;
          speedRight = -speedVal;
          break;
        case 'B':
          speedLeft  = -speedVal;
          speedRight = -speedVal;
          break;
        case 'S':
          speedLeft = 0;
          speedRight = 0;
          break;
      } 
      print("speedLeft: %d, speedRight: %d\r", speedLeft, speedRight);
      drive_speed(speedLeft, speedRight);
      buttonCmd = 0;
    }            
    pause(200);
  }    
}

#endif // ActivityBot_Buttons-IR_Speed_Host


#ifdef IFTTT_Send_Email

/*
  Once you have configured your ifttt.com account and created 
  an applet that triggers an email based ona Maker Event, this
  program sends the post request that triggers the email.

  Important: Your Wi-Fi module has to be connected to a
  Wi-Fi network that allows it Internet access for this 
  to work.  
    
  Application circuit:
  None.
    
  Programming and Wi-Fi selection circuits at:
  http://learn.parallax.com/propeller-c-wx-wi-fi 
  Make sure to change the wifi_start call in the code to 
  match the COM control circuit you choose.
  
  This application makes a post to the If This Then That site
  ifttt.com, which triggers an email to be sent.
  
  Note: This example relies on the 0.8 version of the wifi library.  
  Updates may change some function behaviors in later releases.
*/

#include "simpletools.h"
#include "wifi.h"

int event, id, handle;
int getFromPageId;
int val;
char str[512];
char wifi_event;

int main()
{
  wifi_start(31, 30, 115200, WX_ALL_COM);
  wifi_setBuffer(str, sizeof(str));
  
  int tcpHandle = wifi_connect("maker.ifttt.com", 80);
                                                                                
  char request[] = 
  "POST /trigger/MicrocontrollerEvent/with/key/"\
  "YourKeyYourKeyYourKeyYourKeyYourKeyYourKeyY"\
  " HTTP/1.1\r\n"\
  "Host: maker.ifttt.com\r\n"\
  "Connection: keep-alive\r\n"\
  "Accept: *" "/" "*\r\n\r\n";

  int size = strlen(request);

  wifi_print(TCP, tcpHandle, "%s", request);
  event = wifi_event;
  
  pause(1000);

  wifi_scan(TCP, tcpHandle, "%s", str); 
  
  print("str = %s\r", str); 
}

#endif // IFTTT_Email



#ifdef Light_Controls_Canvas_Host

/*
  Application circuit:
  http://learn.parallax.com/tutorials/language/propeller-c
  /propeller-c-simple-circuits/sense-light
  
  Programming and Wi-Fi selection circuits at:
  http://learn.parallax.com/propeller-c-wx-wi-fi 
  Make sure to change the wifi_start call in the code to match
  the COM control circuit you choose.
  
  Application page should be loaded into the Wi-Fi module
  and then accessed through: 
  http://wi-fi-module's-ip/files/light-controls-canvas.html
  
  Note: This example relies on the 0.8 version of the wifi library.  
  Updates may change some function behaviors in later releases.
*/

#include "simpletools.h"
#include "wifi.h"

int event, id, handle;
int lightId;
int lightVal;

int main()
{
  wifi_start(31, 30, 115200, WX_ALL_COM);

  lightId = wifi_listen(HTTP, "/light");
  print("getFromPageId = %d\n", lightId);

  while(1)
  {
    wifi_poll(&event, &id, &handle); 
    print("event = %c, id = %d, handle = %d\r", 
                event,      id,      handle);

    if(event == 'G')
    {
      if(id == lightId)
      {
        high(5);
        pause(1);
        lightVal = rc_time(5, 1);
        
        wifi_print(GET, handle, "%d\n", lightVal);
        print("Reqply to GET request:%d\n", lightVal);
      }        
    }
    pause(500);
  }    
}

#endif // Light_Controls_Canvas_Host



#ifdef Page_Controls_light_Host

/*
  Application circuit:
  http://learn.parallax.com/tutorials/language/propeller-c/
  propeller-c-simple-circuits/blink-light  

  Programming and Wi-Fi selection circuits at:
  http://learn.parallax.com/propeller-c-wx-wi-fi 
  Make sure to change the wifi_start call in the code to 
  match the COM control circuit you choose.
  
  Application page should be loaded into the Wi-Fi module
  and then accessed through: 
  http://wi-fi-module's-ip/files/page-controls-light.html
  
  Note: This example relies on the 0.8 version of the wifi library.  
  Updates may change some function behaviors in later releases.
*/

#include "simpletools.h"
#include "wifi.h"

int event, id, handle;
int ledId, pin, state;

int main()
{
  wifi_start(31, 30, 115200, WX_ALL_COM);
  ledId = wifi_listen(HTTP, "/leds");
  print("ledId = %d\n", ledId);
  
  set_direction(26, 1);
  set_direction(27, 1);

  while(1)
  {
    wifi_poll(&event, &id, &handle); 
    print("event = %c, id = %d, handle = %d\r", event, id, handle);
    if(event == 'P')
    {
      if(id == ledId)
      {
        print("Incoming POST request\r");
        wifi_scan(POST, handle, "io%d%d", &pin, &state);
        print("pin=%d, state=%d\n", pin, state);
        set_output(pin, state);
      }        
    }
    pause(500);
  }    
}

#endif // Page_Controls_light_Host


#ifdef Page_Controls_Servo_Host

/*
  Application circuit:
  http://learn.parallax.com/tutorials/language/propeller-c/
  propeller-c-simple-devices/standard-servo  

  Programming and Wi-Fi selection circuits at:
  http://learn.parallax.com/propeller-c-wx-wi-fi 
  Make sure to change the wifi_start call in the code to 
  match the COM control circuit you choose.
  
  Application page should be loaded into the Wi-Fi module
  and then accessed through: 
  http://wi-fi-module's-ip/files/page-controls-servo.html
  
  Note: This example relies on the 0.8 version of the wifi library.  
  Updates may change some function behaviors in later releases.
*/

#include "simpletools.h"
#include "servo.h"
#include "wifi.h"

int event, id, handle;
int servoId, angle;

int main()
{
  wifi_start(31, 30, 115200, WX_ALL_COM);
  servoId = wifi_listen(HTTP, "/servo");
  print("ledId = %d\n", servoId);
  
  set_direction(26, 1);
  set_direction(27, 1);

  while(1)
  {
    wifi_poll(&event, &id, &handle); 
    print("event = %c, id = %d, handle = %d\r", event, id, handle);
    
    if(event == 'P')
    {
      if(id == servoId)
      {
        print("Incoming POST request\r");
        wifi_scan(POST, handle, "angle%d\r", &angle);
        print("servoAngle: %d\n", angle);
        servo_angle(16, angle * 10);
      }        
    }
    pause(500);
  }    
}

#endif // Page_Controls_Servo_Host


#ifdef Page_Displays_Buttons_Host

/*
  Application circuit:
  http://learn.parallax.com/tutorials/language/propeller-c/
  propeller-c-simple-circuits/check-pushbuttons  

  Programming and Wi-Fi selection circuits at:
  http://learn.parallax.com/propeller-c-wx-wi-fi 
  Make sure to change the wifi_start call in the code to 
  match the COM control circuit you choose.
  
  Application page should be loaded into the Wi-Fi module
  and then accessed through: 
  http://wi-fi-module's-ip/files/page-displays-buttons.html
  
  Note: This example relies on the 0.8 version of the wifi library.  
  Updates may change some function behaviors in later releases.
*/

#include "simpletools.h"
#include "wifi.h"

int event, id, handle;
int buttonId;
int buttonP3, buttonP4;

int main()
{
  low(8);
  pause(2000);
  high(8);
  wifi_start(31, 30, 115200, WX_ALL_COM);

  buttonId = wifi_listen(HTTP, "/btns");
  print("getFromPageId = %d\n", buttonId);

  while(1)
  {
    wifi_poll(&event, &id, &handle); 
    print("event = %c, id = %d, handle = %d\r", event, id, handle);
    if(event == 'G')
    {
      if(id == buttonId)
      {
        buttonP4 = input(4);
        buttonP3 = input(3);
        wifi_print(GET, handle, "%d%d\r", buttonP3, buttonP4);
        print("Incoming GET request, sending %d%d\r", buttonP3, buttonP4);
      }        
    }
    pause(500);
  }    
}

#endif // Page_Displays_Buttons_Host


#ifdef Pot_Controls_Canvas_Host

/*
  Application circuit:
  http://learn.parallax.com/tutorials/language/propeller-c/
  propeller-c-simple-circuits/measure-volts
  (Don't worry about the A/D2 connection, just A/D3.
  
  Programming and Wi-Fi selection circuits at:
  http://learn.parallax.com/propeller-c-wx-wi-fi 
  Make sure to change the wifi_start call in the code to 
  match the COM control circuit you choose.
  
  Application page should be loaded into the Wi-Fi module
  and then accessed through: 
  http://wi-fi-module's-ip/files/pot-controls-canvas.html
  
  Note: This example relies on the 0.8 version of the wifi library.  
  Updates may change some function behaviors in later releases.
*/

#include "simpletools.h"
#include "wifi.h"
#include "abvolts.h"

int event, id, handle;
int dialId;
int dialAngle;

int main()
{
  wifi_start(31, 30, 115200, WX_ALL_COM);

  dialId = wifi_listen(HTTP, "/dial");
  print("dialId = %d\n", dialId);
  
  ad_init(21, 20, 19, 18);

  while(1)
  {
    wifi_poll(&event, &id, &handle); 
    print("event: %c, id: %d, handle: %d\r", 
               event,     id,     handle);
               
    if(event == 'G')
    {
      if(id == dialId)
      {
        dialAngle  = ad_in(3);
        dialAngle *= 270;
        dialAngle /= 2703;
        
        print("Incoming GET request, sending %d\r", dialAngle);
        wifi_print(GET, handle, "%d", dialAngle);
      }        
    }
    pause(500);
  }    
}

#endif // Pot_Controls_Canvas_Host



#ifdef Test_Join_Leave

/*
  Application circuit:
  DO -> P9, DI <- P8, SEL - GND.  Use USB cable and the 
  USB COM port for loading code and debugging. 
  
  Note: This example relies on the 0.8 version of the wifi library.  
  Updates may change some function behaviors in later releases.
*/

#include "simpletools.h"
#include "wifi.h"

int main()
{
  wifi_start(9, 8, 115200, USB_PGM_TERM);

  print("test join\r");
  wifi_join("WiFiApSSID", "passphrase");

  int ip[] = {0, 0, 0, 0};
  memset(ip, 0, 16);
  do
  {
    wifi_ip(STA, ip);
  }while(ip[0] == 0 && ip[1] == 0 && ip[2] == 0 && ip[3] == 0);
  print("\rip=%d.%d.%d.%d\r", ip[0], ip[1], ip[2], ip[3]);
    
    
  int mode = wifi_mode(CHECK);
  print("mode=%d\r", mode);
  
  
  wifi_leave(STA_AP);
  mode = wifi_mode(CHECK);
  print("mode=%d\r", mode);

  
  print("test join\r");
  wifi_join("WiFiApSSID", "passphrase");
  //pause(5000);
  memset(ip, 0, 16);
  do
  {
    wifi_ip(STA, ip);
  }while(ip[0] == 0 && ip[1] == 0 && ip[2] == 0 && ip[3] == 0);
  print("\rip=%d.%d.%d.%d\r", ip[0], ip[1], ip[2], ip[3]);
    
   mode = wifi_mode(CHECK);
  print("mode=%d\r", mode);
}

#endif // Test_Join_Leave



#ifdef Test_Serial_Commands

/*
  Application circuit:
  Any if you leave the More Network Tests section commented.
  If you un-comment it, use:
    DO -> P9, DI <- P8, SEL - GND.  Use USB cable and the 
    USB COM port for loading code and debugging. 
  
  Note: This example relies on the 0.8 version of the wifi library.  
  Updates may change some function behaviors in later releases.
*/

#include "simpletools.h"
#include "wifi.h"

char status;
char s[64];
int pinState = 0;

int main()
{
  wifi_start(31, 30, 115200, WX_ALL_COM);
  //wifi_start(9, 8, 115200, USB_PGM_TERM);

  print("=======================================\r");
  print("wifi_print/scan tests\r");
  print("=======================================\r\r");

  // TEST I/O CONTROL WITH wifi_print/scan //
  print("Test controlling Wi-Fi module I/O\r");
  print("Set /CTS ouput-high\r");
  wifi_print(CMD, NULL, "%cSET:pin-gpio%d,%d\r", CMD, GPIO_CTS, 1);
  wifi_scan(CMD, NULL, "%c", &status);
  print("status: %c\r", status);

  print("Check /CTS\r");
  wifi_print(CMD, NULL, "%cCHECK:pin-gpio%d\r", CMD, GPIO_CTS);
  wifi_scan(CMD, NULL, "%c%d", &status, &pinState);
  print("status: %c, pinState: %d\r", status, pinState);

  print("Set /CTS ouput-low\r");
  wifi_print(CMD, NULL, "%cSET:pin-gpio%d,%d\r", 
                     CMD, GPIO_CTS, 0);
  wifi_scan(CMD, NULL, "%c", &status);
  print("status: %c\r", status);

  print("Check /CTS\r");
  wifi_print(CMD, NULL, "%cCHECK:pin-gpio%d\r", CMD, GPIO_CTS);
  wifi_scan(CMD, NULL, "%c%d", &status, &pinState);
  print("status: %c, pinState: %d\r", status, pinState);
                  
  print("Check /CTS for pull-up when \rinput should return high\r");
  wifi_print(CMD, NULL, "%cCHECK:pin-gpio%d\r", CMD, GPIO_CTS);
  wifi_scan(CMD, NULL, "%c%d", &status, &pinState);
  print("status: %c, pinState: %d\r\r", status, pinState);
  
  // Check IP Address
  print("Check station IP address\r");
  int ip[4] = {0, 0, 0, 0};
  wifi_print(CMD, NULL, "%cCHECK:station-ipaddr\r", CMD);
  wifi_scan(CMD, NULL, "%c%d%d%d%d", &status, &ip[0], &ip[1], &ip[2], &ip[3]);
  print("Station IP: %d.%d.%d.%d\r\r", ip[0], ip[1], ip[2], ip[3]);
  
  // Check Firmwre Version //
  //"\xfe=S,v1.0 (2016-11-02 18:04:30)\r";
  char temp[64];
  memset(temp, 0, 64);
  float version = 0.0;
  print("Check firmware version\r");
  wifi_print(CMD, NULL, "%cCHECK:version\r", CMD);
  wifi_scan(CMD, NULL, "%2s%f", s, &version);
  print("Truncated reply: %4.2f\r", version);
  int charcount = wifi_replyStringCopy(temp);
  print("charcount: %d\rfull reply: %s\r", charcount, temp);
  

  print("=======================================\r");
  print("wifi_command tests\r");
  print("=======================================\r\r");


  // Test I/O control
  char *reply;
  print("Test controlling Wi-Fi module I/O\r");
  print("Set /CTS ouput-high\r");
  reply = wifi_command("SET:pin-gpio13,1\r");
  print("reply: %s", reply);

  print("Check /CTS\r");
  reply = wifi_command("CHECK:pin-gpio13\r");
  print("reply: %s", reply);

  print("Set /CTS ouput-low\r");
  reply = wifi_command("SET:pin-gpio13,0\r");
  print("reply: %s", reply);

  print("Check /CTS\r");
  reply = wifi_command("CHECK:pin-gpio13\r");
  print("reply: %s", reply);
                  
  print("Check /CTS for pull-up when \rinput should return high\r");
  reply = wifi_command("CHECK:pin-gpio13\r");
  print("reply: %s\r", reply);
  
  
  // Check Firmwre Version //
  //"\xfe=S,v1.0 (2016-11-02 18:04:30)\r";
  print("Check firmware version\r");
  reply = wifi_command("CHECK:version\r");
  print("reply: %s\r", reply);
  
  // Check Module Name //
  print("Check module name\r");
  wifi_print(CMD, NULL, "%cCHECK:module-name\r", CMD);
  wifi_scan(CMD, NULL, "%1s%s", s, s);
  print("Module name: %s\r\r", &s[1]);


  // Check network mode
  print("Check network mode\r");
  reply = wifi_command("CHECK:wifi-mode\r");
  print("reply: %s\r", reply);


  // Check network mode
  print("Check network mode\r");
  reply = wifi_command("CHECK:wifi-mode\r");
  print("reply: %s\r", reply);
  
  // Check IP Address //
  print("Check station IP address\r");
  reply = wifi_command("CHECK:station-ipaddr\r");
  print("reply: %s\r", reply);
  /* 
  

  print("=======================================\r");
  print("More Network Command Tests\r");
  print("=======================================\r\r");



  // Disconnect from a network
  print("Disconnect from the host network\r");
  reply = wifi_command("SET:wifi-mode,AP\r");
  print("reply: %s\r", reply);

  //pause(5000);

  // Check network mode
  print("Check network mode\r");
  reply = wifi_command("CHECK:wifi-mode\r");
  print("reply: %s\r", reply);

  //pause(5000);

  // Set Mode to Station + AP //
  //
  print("Set mode to STA+AP\r");
  reply = wifi_command("SET:wifi-mode,STA+AP\r");
  print("reply: %s\r", reply);

  //pause(5000);

  // Check network mode //
  print("Check network mode\r");
  reply = wifi_command("CHECK:wifi-mode\r");
  print("reply: %s\r", reply);
  //

  //pause(5000);


  // Join a network //
  //
  print("Join a Network\r");
  reply = wifi_command("JOIN:"WiFiApSSID", "passphrase"\r");
  print("reply: %s\r", reply);
  
  pause(5000);
  
  //wifi_stop();
  //wifi_start(31, 30, 115200, WX_ALL_COM);

  //pause(5000);

  // Check IP Address //
  print("Check station IP address\r");
  reply = wifi_command("CHECK:station-ipaddr\r");
  print("reply: %s\r", reply);

  //pause(5000);

  // Set Mode to Station + AP //
  print("Set mode to STA\r");
  reply = wifi_command("SET:wifi-mode,STA\r");
  print("reply: %s\r", reply);

  //pause(5000);

  // Check network mode
  print("Check network mode\r");
  reply = wifi_command("CHECK:wifi-mode\r");
  print("reply: %s\r", reply);

  //pause(5000);
  print("Check station ip\r");
  int ipaddr[] = {0, 0, 0, 0};
  status = wifi_ip(STA, ipaddr);
  print("ip=%d.%d.%d.%d\r", ipaddr[0], ipaddr[1], ipaddr[2], ipaddr[3]);
  
  */
  
}

#endif // Test_Join_Leave


#ifdef Text_from_www_page_with_TCP

/*
  Application circuit:
  None.
    
  Important: Your Wi-Fi module has to be connected to a
  Wi-Fi network that allows it Internet access for this 
  to work.  
    
  Programming and Wi-Fi selection circuits at:
  http://learn.parallax.com/propeller-c-wx-wi-fi 
  Make sure to change the wifi_start call in the code to 
  match the COM control circuit you choose.
  
  This application does not make the Wi-Fi module serve
  and monitor a page.  Instead, it grabs text from this
  page on the Internet: 
    www-eng-x.llnl.gov//documents/a_document.txt
  
  Note: This example relies on the 0.8 version of the wifi library.  
  Updates may change some function behaviors in later releases.
*/

#include "simpletools.h"
#include "wifi.h"

int event, id, handle;
int getFromPageId;
int val;
char str[512];
char wifi_event;

int main()
{
  wifi_start(31, 30, 115200, WX_ALL_COM);
  wifi_setBuffer(str, sizeof(str));

  int tcpHandle = wifi_connect("www-eng-x.llnl.gov", 80);

  char request[] = "GET /documents/a_document.txt "\
                   "HTTP/1.1\r\n"\
                   "Host: www-eng-x.llnl.gov\r\n\r\n\0";

  int size = strlen(request);

  wifi_print(TCP, tcpHandle, "%s", request);
  event = wifi_event;
  
  pause(1000);

  wifi_scan(TCP, tcpHandle, "%s", str); 
  
  print("str = %s\r", str); 
}

#endif // Text_from_www_page_with_TCP


#ifdef Temperature_From_OpenWeatherMap

/*
  This uses the OpenWeatherMap's API to form a GET request
  that requests weather by zip code.  See 
  https://openweathermap.org/current#zip for more info.
  
  You will need to create a free accountand and get an 
  API key.  That key becomes part of the GET request.
  
  Important: Your Wi-Fi module has to be connected to a
  Wi-Fi network that allows it Internet access for this 
  to work.  
    
  Application circuit:
  None.
  
  Programming and Wi-Fi selection circuits at:
  http://learn.parallax.com/propeller-c-wx-wi-fi 
  Make sure to change the wifi_start call in the code to 
  match the COM control circuit you choose.
  
  This application does not make the Wi-Fi module serve
  and monitor a page.  Instead, it grabs text from this
  page on the Internet: 
    www-eng-x.llnl.gov//documents/a_document.txt
  
  Note: This example relies on the 0.8 version of the wifi library.  
  Updates may change some function behaviors in later releases.
*/

#include "simpletools.h"
#include "wifi.h"

int event, id, handle;
char str[1024];
char wifi_event;

int main()
{
  wifi_start(31, 30, 115200, WX_ALL_COM);
  wifi_setBuffer(str, sizeof(str));

  int tcpHandle = wifi_connect("api.openweathermap.org", 80);
  
  print("tcpHandle = %d\r", tcpHandle);
  
  pause(2000);
  
  // IMPORTANT: Replace YourKeyYourKey... with the API key you 
  // obtain from openweathermap.com when you create a free 
  // account. 

  char request[] = 
  "GET /data/2.5/weather?zip=95677,us"\
  "&appid=YourKeyYourKeyYourKeyYourKeyYour"\
  " HTTP/1.1\r\n"\
  "Host: api.openweathermap.org\r\n"\
  "Connection: keep-alive\r\n"\
  "Accept: *" "/" "*\r\n\r\n";

  int size = strlen(request);
  
  print("GET req size: %d\r", size);
  
  pause(2000);

  wifi_print(TCP, tcpHandle, "%s", request);
  event = wifi_event;
  
  pause(2000);
  size = strlen(str);
  print("size = %d", size);
  
  pause(2000);
  wifi_scan(TCP, tcpHandle, "%s", str); 
  for(int n = 0; n < sizeof(str); n++)
  {
    if(str[n] <= 'z' && str[n] >= ' ')
    {
      print("%c", str[n]);
    }      
    else if(str[n] == 0)
    {
      print("[%d]", str[n]);
      break;
    }      
    else if(str[n] == '\n')
    {
      print("\r", str[n]);
    }      
    else
    {
      print("[%d]", str[n]);
    }      
  }
  char *loc = strstr(str, "temp");
  print("\rloc = %d\r", loc);
  float temp = 0;
  sscan(loc+5, "%f", &temp);
  float degC = temp -273.15;
  print("temp = %6.2f deg C\r", degC); 
  float degF = degC * 9.0 / 5.0 + 32.0;
  print("temp = %6.2f deg C\r", degF); 
}

#endif // Temperature_from_OpenWeatherMap


#ifdef Text_Page_to_Micro_Host

/*
  Application circuit:
  None.
    
  Programming and Wi-Fi selection circuits at:
  http://learn.parallax.com/propeller-c-wx-wi-fi 
  Make sure to change the wifi_start call in the code to 
  match the COM control circuit you choose.
  
  Application page should be loaded into the Wi-Fi module
  and then accessed through: 
  http://wi-fi-module's-ip/files/text-page-to-micro.html
  
  Note: This example relies on the 0.8 version of the wifi library.  
  Updates may change some function behaviors in later releases.
*/

#include "simpletools.h"
#include "wifi.h"

int event, id, handle;
int postFromPageId;

int main()
{
  wifi_start(31, 30, 115200, WX_ALL_COM);

  postFromPageId = wifi_listen(HTTP, "/fptm");
  print("postFromPageId = %d\n", postFromPageId);

  while(1)
  {
    wifi_poll(&event, &id, &handle); 
    print("event = %c, id = %d, handle = %d\r", event, id, handle);
    if(event == 'P')
    {
      if(id == postFromPageId)
      {
        print("Incoming POST request\r");
        char s[6];
        int n = wifi_scan(POST, handle, "txt%s", &s);
        print("text = %s n = %d\n", s, n);
      }        
    }
    pause(500);
  }    
}

#endif // Text_Page_to_Micro_Host


#ifdef Val_from_Micro_Host

/*
  Application circuit:
  None.
    
  Programming and Wi-Fi selection circuits at:
  http://learn.parallax.com/propeller-c-wx-wi-fi 
  Make sure to change the wifi_start call in the code to 
  match the COM control circuit you choose.
  
  Application page should be loaded into the Wi-Fi module
  and then accessed through: 
  http://wi-fi-module's-ip/files/val-from-micro.html
  
  Note: This example relies on the 0.8 version of the wifi library.  
  Updates may change some function behaviors in later releases.
*/

#include "simpletools.h"
#include "wifi.h"

int event, id, handle;
int getFromPageId;
int val;

int main()
{
  wifi_start(31, 30, 115200, WX_ALL_COM);

  getFromPageId = wifi_listen(HTTP, "/tpfm");
  print("getFromPageId = %d\n", getFromPageId);

  while(1)
  {
    val++;
    wifi_poll(&event, &id, &handle); 
    print("event = %c, id = %d, handle = %d\r", event, id, handle);
    if(event == 'G')
    {
      if(id == getFromPageId)
      {
        print("Incoming GET request, sending %d\r", val);
        wifi_print(GET, handle, "%d", val);
      }        
    }
    pause(500);
  }    
}

#endif // Val_from_Micro_Host


#ifdef Ws_ActivityBot_Btns_Ir_Speed_Host

/*
  Mechanical Assembly
  http://learn.parallax.com/tutorials/robot/activitybot/
  activitybot/mechanical-assembly

  Electrical Connections
  http://learn.parallax.com/tutorials/robot/activitybot/
  activitybot/electrical-connections
  
  Application Circuit
  http://learn.parallax.com/tutorials/robot/activitybot/activitybot/
  navigate-infrared-flashlights/build-ir-sensor-circuits

  Programming and Wi-Fi selection circuits at:
  http://learn.parallax.com/propeller-c-wx-wi-fi 
  Make sure to change the wifi_start call in the code to match
  the COM control circuit you choose.
  
  Application page should be loaded into the Wi-Fi module
  and then accessed through: 
  http://wi-fi-module's-ip/files/ws-activitybot-btns-ir-speed.html
  
  Note: This example relies on the 0.8 version of the wifi library.  
  Updates may change some function behaviors in later releases.
*/

#include "simpletools.h"
#include "abdrive.h"
#include "wifi.h"

int event, id, handle;
int wsId, wsHandle = 0;
int navChar, buttonCmd, buttonCmdPrev; 
int val, speedVal, speedLeft, speedRight;
int irLeft, irRight; 

int main()
{
  wifi_start(31, 30, 115200, WX_ALL_COM);

  wsId = wifi_listen(WS, "/ws/a");
  print("wsId = %d\n", wsId);
  
  while(1)
  {
    wifi_poll(&event, &id, &handle); 
    //print("event = %c, id = %d, handle = %d\r", event, id, handle);

    if(event == 'W')
    {
      if(id == wsId)
      {
        wsHandle = handle;
        print("wsHandle = %d\n\n", wsHandle);
      }        
    }
    else if(event == 'D')
    {
      //print("Incoming websocket data\r");
      wifi_scan(WS, handle, "%c%d", &buttonCmd, &val);
      //print("direction: %c, speed: %d\n", buttonCmd, val);
      if(buttonCmd == 'v')
      {
        buttonCmd = buttonCmdPrev;
        speedVal = val;
      }        
      else 
      {
        buttonCmdPrev = buttonCmd;
      }        
    }
    if(wsHandle != 0)
    {
      freqout(11, 1, 38000);
      irLeft = input(10);
  
      freqout(1, 1, 38000);
      irRight = input(2);

      wifi_print(WS, wsHandle, "%01b%01b", irLeft, irRight);
    }       

    if(buttonCmd != 0)
    {
      switch(buttonCmd)
      {
        case 'F': 
          speedLeft = speedVal;
          speedRight = speedVal;
          break;
        case 'L':
          speedLeft = -speedVal;
          speedRight = speedVal;
          break;
        case 'R':
          speedLeft = speedVal;
          speedRight = -speedVal;
          break;
        case 'B':
          speedLeft = -speedVal;
          speedRight = -speedVal;
          break;
        case 'S':
          speedLeft = 0;
          speedRight = 0;
          break;
      } 

      //print("speedLeft: %d, speedRight: %d\r", speedLeft, speedRight);
      drive_speed(speedLeft, speedRight);
      buttonCmd = 0;
    }            

    pause(50);
  }    
}

#endif // Ws_ActivityBot_Btns_Ir_Speed_Host




// !!!!!!! Leave Out !!!!!!!

#ifdef Ws_Disconnect_Test
/*
  Here, click Reverse to disconnect the websocket.

  Mechanical Assembly
  http://learn.parallax.com/tutorials/robot/activitybot/
  activitybot/mechanical-assembly

  Electrical Connections
  http://learn.parallax.com/tutorials/robot/activitybot/
  activitybot/electrical-connections
  
  Application Circuit
  http://learn.parallax.com/tutorials/robot/activitybot/activitybot/
  navigate-infrared-flashlights/build-ir-sensor-circuits

  Programming and Wi-Fi selection circuits at:
  http://learn.parallax.com/propeller-c-wx-wi-fi 
  Make sure to change the wifi_start call in the code to match
  the COM control circuit you choose.
  
  Application page should be loaded into the Wi-Fi module
  and then accessed through: 
  http://wi-fi-module's-ip/files/ws-activitybot-btns-ir-speed.html
  
  Note: This example relies on the 0.8 version of the wifi library.  
  Updates may change some function behaviors in later releases.
*/

#include "simpletools.h"
#include "abdrive.h"
#include "wifi.h"

int event, id, handle;
int wsId, wsHandle = 0;
int navChar, buttonCmd, buttonCmdPrev; 
int val, speedVal, speedLeft, speedRight;
int irLeft, irRight; 

int main()
{
  wifi_start(31, 30, 115200, WX_ALL_COM);

  wsId = wifi_listen(WS, "/ws/a");
  print("wsId = %d\n", wsId);
  
  while(1)
  {
    wifi_poll(&event, &id, &handle); 
    //print("event = %c, id = %d, handle = %d\r", event, id, handle);

    if(event == 'W')
    {
      if(id == wsId)
      {
        wsHandle = handle;
        print("wsHandle = %d\n\n", wsHandle);
      }        
    }
    else if(event == 'D')
    {
      //print("Incoming websocket data\r");
      wifi_scan(WS, handle, "%c%d", &buttonCmd, &val);
      //print("direction: %c, speed: %d\n", buttonCmd, val);
      if(buttonCmd == 'v')
      {
        buttonCmd = buttonCmdPrev;
        speedVal = val;
      }        
      else 
      {
        buttonCmdPrev = buttonCmd;
      }        
    }
    if(wsHandle != 0)
    {
      freqout(11, 1, 38000);
      irLeft = input(10);
  
      freqout(1, 1, 38000);
      irRight = input(2);

      wifi_print(WS, wsHandle, "%01b%01b", irLeft, irRight);
    }       

    if(buttonCmd != 0)
    {
      switch(buttonCmd)
      {
        case 'F': 
          speedLeft = speedVal;
          speedRight = speedVal;
          break;
        case 'L':
          speedLeft = -speedVal;
          speedRight = speedVal;
          break;
        case 'R':
          speedLeft = speedVal;
          speedRight = -speedVal;
          break;
        case 'B':
          speedLeft = -speedVal;
          speedRight = -speedVal;
          int discon = wifi_disconnect(handle);
          print("discon = %d\r");
          break;
        case 'S':
          speedLeft = 0;
          speedRight = 0;
          break;
      } 

      //print("speedLeft: %d, speedRight: %d\r", speedLeft, speedRight);
      drive_speed(speedLeft, speedRight);
      buttonCmd = 0;
    }            

    pause(50);
  }    
}
#endif // Ws_ActivityBot_Btns_Ir_Speed_Host





