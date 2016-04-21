
'use strict';

var R = require('ramda'),
    convertMsgType = function(value, key) {
        return {name: key, fields: value};
    }; 

module.exports = R.mapObjIndexed(convertMsgType,
    // Message Type List
    {
        // basic events
        start: [],
        reset: [],

        // Special messages
        TicTacToe: ['role', 'row', 'column'],
        SimpleMessage: ['sender', 'body'],
        Earthquake: ['latitude', 'longitude', 'size', 'time'],
        Trivia: ['question', 'answer', 'difficulty']

    });

