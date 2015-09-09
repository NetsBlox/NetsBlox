# Remote Procedure Calls
NetsBlox supports the use of RPC's on the server to provide scaffolding for students. 

The `procedures` directory contains logic to be executed on the server to provide assistance to students by performing some of their computation for them. For example, `TicTacToe` is an RPC which maintains the game state and determines if someone has won the game (as managing the board state and determining if someone has 3 in a row is the more complex part of creating this game).

The RPC's in `/procedures` contain code to be executed within a group. That is, their variables are shared among the members of the group (created by the `Communication Paradigms`) and each group has it's own context.
