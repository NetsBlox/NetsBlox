const utils = require('../../../../assets/utils');

describe(utils.suiteName(__filename), function() {
    utils.verifyRPCInterfaces('HumanMortalityDatabase', [
        ['getAllData'],
        ['getCountries'],
        ['getGenders'],
        ['getCategories'],
        ['getAllDataForCountry', ['country']],
        ['getTimeSeries', ['country', 'gender', 'category']],
    ]);
});
