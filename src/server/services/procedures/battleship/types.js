const {SHIPS, DIRS} = require('./constants');
const types = require('../../input-types');

function registerTypes() {
    types.defineType({
        name: 'Ship',
        description: 'A ship used in Battleship.',
        baseType: 'Enum',
        baseParams: Object.keys(SHIPS),
    });

    types.defineType({
        name: 'Direction',
        description: 'A direction used in Battleship.',
        baseType: 'Enum',
        baseParams: DIRS,
    });
}

module.exports = {registerTypes};
