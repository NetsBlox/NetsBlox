#include <ctype.h>
#include "simpletext.h"

/*
void set_endChars(text_t *text, char *endCharArray)
{
  memcpy(text->ec, endCharArray, 3);
}

void set_endCharSequence(text_t *text, char *endCharSeqArray)
{
  memcpy(text->ecs, endCharSeqArray, 3);
}
*/

void set_endChars(text_t *text, char cA, char cB)
{
  text->ecA = cA;
  text->ecB = cB;
}

void set_endCharSequence(text_t *text, char cA, char cB)
{
  text->ecsA = cA;
  text->ecsB = cB;
}

