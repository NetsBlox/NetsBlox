module.exports = {
    BOARD_SIZE: 100,
    SHIPS: {
        'aircraft carrier': 5,
        'battleship': 4,
        'submarine': 3,
        'destroyer': 3,
        'patrol boat': 2
    },
    DIRS: {
        north: 1,
        south: -1,
        east: -1,
        west: 1
    },
    HIT: 'hit',
    MISS: 'miss',

    // Game state
    PLACING: 'placing',
    SHOOTING: 'shooting'
};

