describe('human-mortality-database', function() {
    const utils = require('../../../../assets/utils');

    utils.verifyRPCInterfaces('HumanMortalityDatabase', [
        ['getAllData'],
        ['getCountries'],
        ['getGenders'],
        ['getCategories'],
        ['getAllDataForCountry', ['country']],
        ['getTimeSeries', ['country', 'gender', 'category']],
    ]);
});
