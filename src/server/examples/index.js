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
    // Dice Game
    {
        RoomName: 'Dice',
        cachedProjects: {
            p1: example('dice'),
            p2: example('dice')
        },
        primaryRole: 'p1'
    },
    // Caesar Shift
    {
        RoomName: 'Caesar Shift',
        cachedProjects: {
            eve: example('cs-eve'),
            alice: example('cs-alice'),
            bob: example('cs-bob'),
            'super eve': example('cs-super-eve')
        },
        primaryRole: 'alice'
    },
    // Pong
    {
        RoomName: 'Pong',
        cachedProjects: {
            left: example('Pong-left'),
            right: example('Pong-right')
        },
        primaryRole: 'right'
    },
    // TicTacToe (no rpcs)
    {
        RoomName: 'TicTacToe',
        cachedProjects: {
            X: example('TTT-advanced-X'),
            O: example('TTT-advanced-O')
        },
        primaryRole: 'X'
    },
    // TicTacToe
    {
        RoomName: 'Simple TicTacToe',
        cachedProjects: {
            player1: example('TicTacToe-p1'),
            player2: example('TicTacToe-p2')
        },
        primaryRole: 'player1'
    },
    {
        RoomName: 'MarcoPolo',
        cachedProjects: {
            player1: example('marco'),
            player2: example('polo')
        },
        primaryRole: 'player1'
    },
    // Single user examples (RPC's and stuff)
    {
        RoomName: 'AirQuality',
        cachedProjects: {
            AirQuality: example('Air Quality')
        },
        primaryRole: 'AirQuality'
    },
    {
        RoomName: 'Earthquakes',
        cachedProjects: {
            Earthquakes: example('Earthquakes')
        },
        primaryRole: 'Earthquakes'
    },
    {
        RoomName: 'Weather',
        cachedProjects: {
            Weather: example('Weather')
        },
        primaryRole: 'Weather'
    },
    {
        RoomName: 'SimpleHangman',
        cachedProjects: {
            Hangman: example('SimpleHangman')
        },
        primaryRole: 'Hangman'
    }
    // Add more examples?
    // Fox.xml
    // Geese.xml
    // Messaging.xml
]
.forEach(item => {
    var roles = Object.keys(item.cachedProjects),
        src;

    item.roles = {};
    for (var i = roles.length; i--;) {
        item.roles[roles[i]] = null;
        // TODO: FIXME: the cachedProjects are not the correct format
        src = item.cachedProjects[roles[i]];
        item.cachedProjects[roles[i]] = {
            SourceCode: src,
            ProjectName: roles[i],
            RoomName: item.RoomName,
            Media: '<media></media>'
        };
    }

    // Add to examples dictionary
    examples[item.RoomName] = item;
});

module.exports = Object.freeze(examples);
