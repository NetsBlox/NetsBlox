// This file contains the default game types
'use strict';
var _ = require('lodash'),
    R = require('ramda'),
    DEFAULT_GAME_TYPE = {
        name: 'None',
        paradigm: 'sandbox',
        clientLibs: [],
        messageTypes: []
    };

var convertMsgType = function(value, key) {
    return {name: key, fields: value};
}; 

var Messages = R.mapObjIndexed(convertMsgType,
    // Message Type List
    {
        TicTacToe: ['row', 'column'],
        SimpleMessage: ['sender', 'body'],
        MoveGoose: ['goose', 'row', 'column'],
        MoveFox: ['row', 'column']
    });

module.exports = [
    {
        name: 'TicTacToe',
        paradigm: 'twoplayer',
        clientLibs: ['tictactoe.xml'],
        messageTypes: [Messages.TicTacToe]
    },
    {
        name: 'Text Messaging',
        paradigm: 'basic',
        messageTypes: [Messages.SimpleMessage]
    },
    //{
        //name: 'Hangman',
        //paradigm: 'uniquerole'
    //},
    {  // TODO: Remove this and change the project to use 'none'
        name: 'SimpleHangman',
        paradigm: 'sandbox'
    },
    {
        name: 'Fox and Geese',
        paradigm: 'uniquerole',
        messageTypes: [Messages.MoveGoose, Messages.MoveFox]
    },
    {
        name: 'None',
        paradigm: 'sandbox'
    }
].map(msgType => _.extend({}, DEFAULT_GAME_TYPE, msgType));
