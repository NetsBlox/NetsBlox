# Remote Procedure Calls
NetsBlox supports the use of RPC's on the server to provide scaffolding for students. 

The `procedures` directory contains logic to be executed on the server to provide assistance to students by performing some of their computation for them. For example, `TicTacToe` is an RPC which maintains the game state and determines if someone has won the game (as managing the board state and determining if someone has 3 in a row is the more complex part of creating this game).

The RPC's in `/procedures` contain code to be executed within the context of a table. That is, stateful rpcs will share state with all users at a given table.

More detailed info about creating custom RPCs can be found in the [wiki](https://github.com/NetsBlox/NetsBlox/wiki/Custom-RPCs)
