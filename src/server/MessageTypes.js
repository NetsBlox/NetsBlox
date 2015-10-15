
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
        MoveGoose: ['goose', 'row', 'column'],
        MoveFox: ['row', 'column'],
        Earthquake: ['latitude', 'longitude', 'size', 'time']
    });

