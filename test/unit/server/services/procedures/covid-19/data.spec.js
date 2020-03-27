describe('COVIDData', function() {
    const utils = require('../../../../../assets/utils');
    const COVIDData = utils.reqSrc('services/procedures/covid-19/data');
    const data = new COVIDData();
    const assert = require('assert');

    it('should parse early csv correctly', function() {
        const testCSV = `Province/State,Country/Region,Last Update,Confirmed,Deaths,Recovered
Anhui,Mainland China,1/22/2020 17:00,1,,\n`;
        const [doc] = data.parse(testCSV);
        assert(doc.recovered === 0);
    });
});
