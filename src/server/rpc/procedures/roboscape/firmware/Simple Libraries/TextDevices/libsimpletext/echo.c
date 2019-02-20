#include <ctype.h>
#include "simpletext.h"

void terminal_setEcho(text_t *text, int state)
{
  text->terminalEcho = state;
}

int terminal_checkEcho(text_t *text)
{
  return text->terminalEcho;
}

