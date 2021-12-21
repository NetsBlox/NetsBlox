const utils = require('../../../../../assets/utils');

describe(utils.suiteName(__filename), function() {
    const COVIDData = utils.reqSrc('services/procedures/covid-19/data');
    const Logger = utils.reqSrc('logger');
    const data = new COVIDData(new Logger('test:covid-19:data'));
    const assert = require('assert');

    it('should parse early csv correctly', function() {
        const testCSV = `Province/State,Country/Region,Last Update,Confirmed,Deaths,Recovered
Anhui,Mainland China,1/22/2020 17:00,1,,\n`;
        const [doc] = data.parse(testCSV);
        assert(doc.recovered === 0);
    });

    it('should resolve "Democratic Republic of the Congo"', function() {
        const country = data.resolveCountry('Democratic Republic of the Congo');
        assert.equal(country, 'Congo (Kinshasa)');
    });

    it('should remove diacritics from "Réunion"', function() {
        const country = data.resolveCountry('Réunion');
        assert.equal(country, 'Reunion');
    });

    it('should return undefined if invalid date (not throw error)', async function() {
        const result = await data.fetchDailyReport(new Date('2090'));
        assert.equal(result, undefined);
    });
});
