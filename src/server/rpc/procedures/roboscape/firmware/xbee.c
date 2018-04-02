#include "xbee.h"
#include "simpletools.h"

enum {
    CONNECT_TIMEOUT = 1500,
    RESPONSE_TIMEOUT = 10,
    NEXTCHAR_TIMEOUT = 1,
};

static const int bauds[2] = { 115200, 9600 };

fdserial* xbee_open(int rxpin, int txpin, int mode)
{
    fdserial* xbee;

    int b = 0;
    for (;;) {
        low(26);
        xbee = fdserial_open(rxpin, txpin, 0, bauds[b]);
        high(26);
        xbee_send_str(xbee, "+++");
        if (xbee_recv_str(xbee, "OK\r", CONNECT_TIMEOUT) == 3)
            break;

        if (++b >= 2)
            b = 0;
        fdserial_close(xbee);
    }

    xbee_send_str(xbee, mode == 0 ? "ATBD7,AP0,CN\r" : "ATBD7,AP1,CN\r");
    xbee_flush(xbee, RESPONSE_TIMEOUT);

    if (b != 0) {
        fdserial_close(xbee);
        xbee = fdserial_open(rxpin, txpin, 0, bauds[0]);
    }

    low(26);
    return xbee;
}

void xbee_close(fdserial* xbee)
{
    fdserial_close(xbee);
}

void xbee_flush(fdserial* xbee, int ms)
{
    while (fdserial_rxTime(xbee, ms) >= 0)
        ;
}

void xbee_send_str(fdserial* xbee, const char* data)
{
    while (*data != 0)
        fdserial_txChar(xbee, *(data++));
}

int xbee_recv_str(fdserial* xbee, const char* data, int timeout)
{
    int n = 0;
    while (*data != 0) {
        int c = fdserial_rxTime(xbee, timeout);
        if (c < 0)
            return -1;
        else if (c != *(data++))
            break;
        else
            n += 1;
    }
    return n;
}

void xbee_send_api(fdserial* xbee, const void* data, int len)
{
    fdserial_txChar(xbee, 0x7E);
    fdserial_txChar(xbee, (len >> 8) & 0xFF);
    fdserial_txChar(xbee, len & 0xFF);
    char crc = 0;
    while (len-- > 0) {
        char c = *(const char*)(data++);
        crc += c;
        fdserial_txChar(xbee, c);
    }
    fdserial_txChar(xbee, 0xff - crc);
}

int xbee_recv_api(fdserial* xbee, void* data, int len, int timeout)
{
    int c;
    do {
        c = fdserial_rxTime(xbee, timeout);
        if (c < 0)
            return -1;
        timeout = NEXTCHAR_TIMEOUT;
    } while (c != 0x7E);

    c = fdserial_rxTime(xbee, timeout);
    if (c < 0)
        return -1;
    int frame_len = c << 8;

    c = fdserial_rxTime(xbee, timeout);
    if (c < 0)
        return -1;
    frame_len |= c;

    int crc = 0xff;
    for (int i = 0; i < frame_len; i++) {
        c = fdserial_rxTime(xbee, timeout);
        if (c < 0)
            return -1;
        crc -= c;
        if (i < len)
            *(char*)(data++) = c;
    }

    c = fdserial_rxTime(xbee, timeout);
    if (c != (crc & 0xff))
        return -2;

    return frame_len;
}
