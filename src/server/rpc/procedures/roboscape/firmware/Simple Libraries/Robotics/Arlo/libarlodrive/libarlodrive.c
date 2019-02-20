//#define ARLO_DEBUG  
//#define XBEE_TERMINAL 

/*

======================[ TO-DO ]======================
  (    ) Update defaults from DHB-10 docs 
  (    ) Handle no reply with power off to DHB10
  (    ) Compiler warning in drive_getTicks & getSpeed about 
         sscan(dhb10_reply, "%d%d", left, right) 
=====================================================
  
*/  

#include "simpletools.h" 
#include "fdserial.h"
#include "arlodrive.h"

fdserial *term;

int main()
{
  #ifdef ARLO_DEBUG
    simpleterm_close();
    pause(10);
    #ifdef XBEE_TERMINAL
      term = fdserial_open(9, 8, 0, 9600);
    #else
      term = fdserial_open(31, 30, 0, 115200);
    #endif  
  #endif
  
  dhb10_terminal(term);
}    

