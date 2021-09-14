const utils = require('../../../../assets/utils');

describe(utils.suiteName(__filename), function() {
    utils.verifyRPCInterfaces('FBICrimeData', [
        ['nationalArrestCount', ['offense', 'category', 'startYear', 'endYear', 'ageCategory']],
        ['nationalOffenseCount', ['offense', 'category']],
        ['nationalSupplementalCount', ['offense', 'category', 'startYear', 'endYear']],
        ['nationalVictimCount', ['offense', 'category']],

        ['regionalArrestCount', ['region', 'offense', 'category', 'startYear', 'endYear']],
        ['regionalOffenseCount', ['region', 'offense', 'category']],
        ['regionalVictimCount', ['region', 'offense', 'category']],

        ['stateArrestCount', ['state', 'category', 'startYear', 'endYear']],
        ['stateOffenseCount', ['state', 'offense', 'category']],
        ['stateSupplementalCount', ['state', 'offense', 'category', 'startYear', 'endYear']],
        ['stateVictimCount', ['state', 'offense', 'category']],
    ]);
});
