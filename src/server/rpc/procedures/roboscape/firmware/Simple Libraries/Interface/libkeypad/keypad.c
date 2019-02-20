/*
  @file keypad.c
 
  @author Andy Lindsay
 
  @version v1.1.6
 
  @copyright
  Copyright (C) Parallax, Inc. 2017. All Rights MIT Licensed.
 
  @brief keypad library source. 
*/

#include "keypad.h"


static int rows;
static int cols;
static int *rowIo;
static int *colIo;
static int *btnVals;


void keypad_setup(int rowCount, int columnCount, int *rowPinCons, int *columnPinCons, int *buttonValues)
{
  rows = rowCount;
  cols = columnCount;
  rowIo = rowPinCons;
  colIo = columnPinCons;
  btnVals = buttonValues;
  for(int row = 0; row < rows; row++)
  {
    input(rowIo[row]);
  }      
  for(int col = 0; col < cols; col++)
  {
    input(colIo[col]);
  }
} 


int keypad_read(void)
{
  keypad_readFrom(-1);
}  


int keypad_readFrom(int button)
{
  int state = 0, n = 0;
  int row, col, rowStart, colStart;
  int elements = rows * cols;

  if(button != -1)
  {
    for(n = 0; n < elements; n++)
    {
      if(btnVals[n] == button)
      {
        n++;
        break;
      }      
    }
    
    rowStart = n / cols;
    colStart = n % cols; 
    button = -1;
  }
  else
  {
    rowStart = 0;
    colStart = 0;
  }         
  
  if(n == elements) return -1;

  for(col = 0; col < cols; col++) low(colIo[col]);    
  for(row = 0; row < rows; row++) input(rowIo[row]);    
  for(row = rowStart; row < rows; row++)
  {
    for(col = colStart; col < cols; col++)
    {
      high(rowIo[row]);
      state = input(colIo[col]);
      low(colIo[col]); 
      //print("button %c state %d row %d col %d\r", 
      //       btnVals[(row * cols) + col], state,   row,   col);
      if(state)
      {
        button = (row * cols) + col;
        break;       
      }        
      colStart = 0;
    }
    input(rowIo[row]);
    if(state) break;
  }
  //print("\r");
  if(button == -1) return button;
  else return btnVals[button];
}

