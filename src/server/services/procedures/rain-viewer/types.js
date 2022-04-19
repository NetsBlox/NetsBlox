const types = require('../../input-types');

const TIME_OFFSETS = {
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

const COLOR_SCHEMES = {
    'Black and White': 0,
    'Original': 1,
    'Universal Blue': 2,
    'TITAN': 3,
    'The Weather Channel': 4,
    'Meteored': 5,
    'NEXRAD Level III': 6,
    'Rainbow @ SELEX-IS': 7,
    'Dark Sky': 8,
};

function defineTypes() {
    types.defineType({
        name: 'TimeOffset',
        description: 'A time offset for a weather radar forecast from the :doc:`/services/RainViewer/index` service.',
        baseType: 'Enum',
        baseParams: TIME_OFFSETS,
    });

    types.defineType({
        name: 'ColorScheme',
        description: 'A color scheme for an overlay provided by the :doc:`/services/RainViewer/index` service. For more information, check out the `Rain Viewer documentation <https://www.rainviewer.com/api/color-schemes.html>`__.',
        baseType: 'Enum',
        baseParams: COLOR_SCHEMES,
    });
}

module.exports = {
    TIME_OFFSETS,
    COLOR_SCHEMES,
    defineTypes,
};
