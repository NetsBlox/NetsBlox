#include "simpletools.h"
#include "badgetools.h"

volatile int32_t 	cpcog;
int i2cLock = 0;

i2c *st_eeprom;
int st_eeInitFlag;
volatile int bt_accelInitFlag;
volatile int eei2cLock;
volatile int eei2cLockFlag;

unsigned char TPCount = 7;
unsigned char TPPins[] = {BTN_OS, BTN_5, BTN_4, BTN_3, BTN_2, BTN_1, BTN_0};
unsigned char TPDischarge = 15;

volatile int eeHome = 32768;
volatile int eeRecCount, eeNextAddr, eeBadgeOk = 0, 
             eeNext, eeRecsAddr, eeRecs, 
             eeRecHome, eeRecOffice;

volatile int inbox = 0;

//info my;

int cogIRcom;

//__attribute__((constructor))
int32_t badge_setup(void)
{
  touch_start(TPCount, TPPins, TPDischarge);
  if(!eei2cLockFlag)
  {
    eei2cLock = locknew();
    lockclr(eei2cLock);
    eei2cLockFlag = 1;
  }
  init_MMA7660FC();
  if(!st_eeInitFlag) ee_init();
  cpcog = light_start();
  cogIRcom = ircom_start(IR_IN, IR_OUT, 2400, 38500);
  screen_init(OLED_CS, OLED_DC, OLED_DAT, OLED_CLK, OLED_RST, SSD1306_SWITCHCAPVCC, TYPE_128X64);
  screen_auto(ON);
  clear();
  text_size(LARGE);
  return 0;
}

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

