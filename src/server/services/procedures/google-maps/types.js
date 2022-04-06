const types = require('../../input-types');

const TIME_OFFSET_MAP = {
    '-120min': ['past', 0],
    '-110min': ['past', 1],
    '-100min': ['past', 2],
    '-90min': ['past', 3],
    '-80min': ['past', 4],
    '-70min': ['past', 5],
    '-60min': ['past', 6],
    '-50min': ['past', 7],
    '-40min': ['past', 8],
    '-30min': ['past', 9],
    '-20min': ['past', 10],
    '-10min': ['past', 11],
    'now':    ['past', 12],
    '+10min': ['nowcast', 0],
    '+20min': ['nowcast', 1],
    '+30min': ['nowcast', 2],
};

function defineTypes() {
    types.defineType({
        name: 'TimeOffset',
        description: 'A time offset for a weather radar forecast from the :doc:`/services/GoogleMaps/index` service.',
        baseType: 'Enum',
        baseParams: TIME_OFFSET_MAP,
    });
}

module.exports = {
    TIME_OFFSET_MAP,
    defineTypes,
};