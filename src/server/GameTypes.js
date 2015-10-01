// This file contains the default game types
'use strict';
module.exports = [
    {
        name: 'TicTacToe',
        paradigm: 'turnbased',
        clientLibs: ['tictactoe.xml']
    },
    {
        name: 'Text Messaging',
        paradigm: 'basic',
        clientLibs: []
    },
    {
        name: 'Hangman',
        paradigm: 'uniquerole',
        clientLibs: []
    },
    {
        name: 'SimpleHangman',
        paradigm: 'sandbox',
        clientLibs: []
    },
    {
        name: 'None',
        paradigm: 'sandbox',
        clientLibs: []
    }
];
