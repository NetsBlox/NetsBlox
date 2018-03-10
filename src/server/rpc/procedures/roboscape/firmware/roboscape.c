#include "abdrive360.h"
#include "simpletools.h"
#include "xbee.h"

enum {
    BUFFER_SIZE = 200,
};

fdserial* xbee;
unsigned char buffer[BUFFER_SIZE];
int buffer_len;

unsigned char mac_addr[6];
unsigned char ip4_addr[4];
unsigned char ip4_port[2];

static const unsigned char server_addr[4] = { 52, 73, 65, 98 }; // netsblox.org
//static const unsigned char server_addr[4] = { 129, 59, 104, 208 }; // mmaroti.isis.vanderbilt.edu
static const unsigned char server_port[2] = { 0x07, 0xb5 }; // 1973
//static const unsigned char server_port[2] = { 0x07, 0xb4 }; // 1972

unsigned short ntohs(unsigned char* data)
{
    return (data[0] << 8) + data[1];
}

void buffer_print(int len)
{
    print("buffer %d:", len);
    if (len > BUFFER_SIZE)
        len = BUFFER_SIZE;
    for (int i = 0; i < len; i++)
        print(" %02x", buffer[i]);
    print("\n");
}

int cmp_api_response(int len, const unsigned char* prefix)
{
    if (buffer_len != len)
        return 0;
    for (int i = 0; i < 5; i++) {
        if (prefix[i] != buffer[i])
            return 0;
    }
    return 1;
}

int cmp_rx_headers(int len, unsigned char cmd)
{
    return buffer_len == len && buffer[0] == 0xb0 && buffer[11] == cmd;
}

void set_tx_headers(int time, unsigned char cmd)
{
    buffer[0] = 0x20;
    buffer[1] = 0x10;
    memcpy(buffer + 2, server_addr, 4);
    memcpy(buffer + 6, server_port, 2);
    memcpy(buffer + 8, ip4_port, 2);
    buffer[10] = 0x00;
    buffer[11] = 0x00;
    memcpy(buffer + 12, mac_addr, 6);
    memcpy(buffer + 18, &time, 4);
    buffer[22] = cmd;
    buffer_len = 23;
}

void write_le16(short data)
{
    memcpy(buffer + buffer_len, &data, 2);
    buffer_len += 2;
}

int main()
{
    input(1);
    xbee = xbee_open(1, 0, 1);
    xbee_send_api(xbee, "\x8\000IDvummiv", 10);

    xbee_send_api(xbee, "\x8\001SL", 4);
    xbee_send_api(xbee, "\x8\002SH", 4);
    xbee_send_api(xbee, "\x8\003C0", 4);
    xbee_send_api(xbee, "\x8\004MY", 4);

    int whiskers = 0;
    int slower = 0;
    while (1) {
        buffer_len = xbee_recv_api(xbee, buffer, BUFFER_SIZE, 10);

        if (buffer_len == -1) {
            if (++slower >= 100) {
                slower = 0;
                xbee_send_api(xbee, "\x8\004MY", 4);
                set_tx_headers(CNT, 'I');
                xbee_send_api(xbee, buffer, buffer_len);
            }                
        } else if (cmp_api_response(9, "\x88\001SL")) {
            memcpy(mac_addr + 2, buffer + 5, 4);
        } else if (cmp_api_response(7, "\x88\002SH")) {
            memcpy(mac_addr, buffer + 5, 2);
            print("mac:");
            for (int i = 0; i < 6; i++)
                print(" %02x", mac_addr[i]);
            print("\n");
        } else if (cmp_api_response(7, "\x88\003C0")) {
            memcpy(ip4_port, buffer + 5, 2);
        } else if (cmp_api_response(9, "\x88\004MY")) {
            memcpy(ip4_addr, buffer + 5, 4);
            print("ip4:");
            for (int i = 0; i < 4; i++)
                print("%c%d", i == 0 ? ' ' : '.', ip4_addr[i]);
            print(" %d\n", ntohs(ip4_port));
        } else if (cmp_rx_headers(16, 'B')) {
            int msec = *(short*)(buffer + 12);
            int tone = *(short*)(buffer + 14);
            toggle(27);
            freqout(2, msec, tone);
            set_tx_headers(CNT, 'B');
            write_le16(msec);
            write_le16(tone);
            xbee_send_api(xbee, buffer, buffer_len);
        } else if (cmp_rx_headers(16, 'D')) {
            int left = *(short*)(buffer + 12);
            int right = *(short*)(buffer + 14);
            toggle(27);
            drive_speed(left, right);
            set_tx_headers(CNT, 'D');
            write_le16(left);
            write_le16(right);
            xbee_send_api(xbee, buffer, buffer_len);
        } else if (buffer_len >= 0) {
            buffer_print(buffer_len);
        }
        
        int whiskers2 = 0x03 ^ ((input(3) << 1) | input(4));
        if (whiskers != whiskers2) {
            toggle(27);
            whiskers = whiskers2;
            set_tx_headers(CNT, 'W');
            buffer[buffer_len++] = whiskers;
            xbee_send_api(xbee, buffer, buffer_len);
        }          
    }
}
