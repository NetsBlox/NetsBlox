
//#define ARLO_DEBUG
//#define XBEE_TERMINAL 
//#define HALF_DUPLEX

#ifndef ARLODRIVE_H
#define ARLODRIVE_H

#if defined(__cplusplus)
extern "C" { 
#endif

#include "fdserial.h"
extern fdserial *arlo;

#define DHB10_LEN 64
#define SIDE_TERM 0

#define ARD_DEFAULT_SERVO_L 12
#define ARD_DEFAULT_SERVO_R 13
#define ARD_DEFAULT_SPEEDLIMIT 200
#define ARD_DEFAULT_ACCEL_LIMIT 512
#define ARD_DEFAULT_DONE_REPS 16
#define ARD_DEFAULT_RAMPSTEP 25            //
#define ARD_DEFAULT_INCREMENT 1
#define ARD_DEFAULT_FEEDBACK 1

#define ARD_DEFAULT_DEADZONE 1

#define ARD_DEFAULT_GOTOBLOCK 1
#define ARD_DEFAULT_RAMP_INTERVAL 20

#define ARD_DEFAULT_OFFSET 0
#define ARD_DEFAULT_CYCLES 0
#define ARD_DEFAULT_TRAMPSTEPPREV 0
#define ARD_DEFAULT_INITSPEED 0
#define ARD_DEFAULT_MODE 0
#define ARD_DEFAULT_OPENED 0
#define ARD_DEFAULT_RAMPMODE 0
#define ARD_DEFAULT_BLOCKSPEED 0
#define ARD_DEFAULT_BLOCKSPEEDPREV 0

#define ARD_MODE_VERBOSE 1
#define ARD_MODE_CONCISE 0
#define ARD_DEFAULT_REPLYMODE ARD_MODE_VERBOSE

char *drive_open();
void drive_close(void);

char *drive_speed(int left, int right);
char *drive_goto(int distLeft, int distRight);
void drive_rampStep(int left, int right);
void drive_ramp(int left, int right);

char *drive_getTicks(int *left, int *right);
char *drive_getSpeed(int *left, int *right);

char *drive_clearTicks(void);
void drive_setRampStep(int stepsize);
void drive_setMaxSpeed(int speed);
void drive_servoPins(int servoPinLeft, int servoPinRight);
void drive_feedback(int enabled);                      
void drive_gotoDoneDelay(int msTillDoneApprox);
void drive_speedBlocking(int enabled);

void dhb10_terminal(fdserial *fdterm);
char *dhb10_com(char *configStr);

//void drive_getTicksCalc(int *left, int *right);
//void drive_getSpeedCalc(int *left, int *right);
//int ard_comAck(int verbose);

#if defined(__cplusplus)                     
}
#endif /* __cplusplus */

#endif /* AWESOME_H */