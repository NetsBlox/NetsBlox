// This file will prepare the raw source code from the examples directory
var fs = require('fs'),
    path = require('path');

var example = function(name) {
    name = path.join(__dirname, name + '.xml');
    return fs.readFileSync(name, 'utf8');
};

// Create the dictionary of examples
var examples = {};

// Multiplayer examples
[
    // Pong
    {
        tableName: 'Pong',
        cachedProjects: {
            left: example('Pong-left'),
            right: example('Pong-right')
        },
        primarySeat: 'right'
    },
    // TicTacToe
    {
        tableName: 'TicTacToe',
        cachedProjects: {
            player1: example('TicTacToe-p1'),
            player2: example('TicTacToe-p2')
        },
        primarySeat: 'player1'
    },
    {
        tableName: 'MarcoPolo',
        cachedProjects: {
            player1: example('marco'),
            player2: example('polo')
        },
        primarySeat: 'player1'
    },
    // Single user examples (RPC's and stuff)
    {
        tableName: 'AirQuality',
        cachedProjects: {
            AirQuality: example('Air Quality')
        },
        primarySeat: 'AirQuality'
    },
    {
        tableName: 'Earthquakes',
        cachedProjects: {
            Earthquakes: example('Earthquakes')
        },
        primarySeat: 'Earthquakes'
    },
    {
        tableName: 'Weather',
        cachedProjects: {
            Weather: example('Weather')
        },
        primarySeat: 'Weather'
    },
    {
        tableName: 'SimpleHangman',
        cachedProjects: {
            Hangman: example('SimpleHangman')
        },
        primarySeat: 'Hangman'
    }
    // Add more examples?
    // Fox.xml
    // Geese.xml
    // Messaging.xml
]
.forEach(item => {
    // Add seatOwners
    var seats = Object.keys(item.cachedProjects),
        src;

    item.seatOwners = {};
    item.seats = {};
    for (var i = seats.length; i--;) {
        item.seatOwners[seats[i]] = null;
        item.seats[seats[i]] = null;
        // TODO: FIXME: the cachedProjects are not the correct format
        src = item.cachedProjects[seats[i]];
        item.cachedProjects[seats[i]] = {
            SourceCode: src,
            ProjectName: seats[i],
            TableName: item.tableName,
            Media: '<media></media>'
        };
    }

    // Add to examples dictionary
    examples[item.tableName] = item;
})

module.exports = Object.freeze(examples);
