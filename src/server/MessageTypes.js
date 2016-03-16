
'use strict';

var R = require('ramda'),
    convertMsgType = function(value, key) {
        return {name: key, fields: value};
    }; 

module.exports = R.mapObjIndexed(convertMsgType,
    // Message Type List
    {
        TicTacToe: ['row', 'column'],
        SimpleMessage: ['sender', 'body'],
        message: ['msg'],
        MoveGoose: ['goose', 'row', 'column'],
        MoveFox: ['row', 'column'],
        Earthquake: ['latitude', 'longitude', 'size', 'time'],
        Trivia: ['question', 'answer', 'difficulty'],

        // basic events
        reset: [],
        join: [],
        leave: []
    });

