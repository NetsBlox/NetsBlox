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
    {  // TODO: Remove this and change the project to use 'none'
        name: 'SimpleHangman',
        paradigm: 'sandbox',
        clientLibs: []
    },
    {
        name: 'Fox and Geese',
        paradigm: 'uniquerole',
        clientLibs: []
    },
    {
        name: 'None',
        paradigm: 'sandbox',
        clientLibs: []
    }
];
