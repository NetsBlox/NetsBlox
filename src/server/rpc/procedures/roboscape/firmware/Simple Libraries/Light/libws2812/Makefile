CFLAGS=-Wall -Os -mcmm

HDRS=\
ws2812.h

OBJS=\
ws2812_start.o \
ws2812b_start.o \
ws2812_set.o \
ws2812.o \
ws2812_open.o \
ws2812b_open.o \
ws2812_close.o \
ws2812_stop.o \
ws2812_wheel.o \
ws2812_wheel_dim.o \
ws2812_driver.o

#TARGET=libws2812
TARGET=ws2812-simple-test

all:	$(TARGET).elf

%.dat:	%.spin
	@openspin -c -o $@ $<
	@echo $@
	
%.o: %.dat
	@propeller-elf-objcopy -I binary -B propeller -O propeller-elf-gcc --rename-section .data=.text $< $@
	@echo $@
	
%.o: %.c $(HDRS)
	@propeller-elf-gcc $(CFLAGS) -c -o $@ $<
	@echo $@

$(TARGET).elf: $(TARGET).o $(OBJS)
	@propeller-elf-gcc $(CFLAGS) -o $@ $(TARGET).o $(OBJS)
	@echo $@

run:	$(TARGET).elf
	@propeller-load $(TARGET).elf -r -t
	
clean:
	@rm -rf *.o *.elf *.dat
