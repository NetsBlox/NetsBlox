describe('COVIDData', function() {
    const utils = require('../../../../../assets/utils');
    const COVIDData = utils.reqSrc('services/procedures/covid-19/data');
    const data = new COVIDData();
    const assert = require('assert');

    it('should parse recent csv correctly', function() {
        const testCSV = 'FIPS,Admin2,Province_State,Country_Region,Last_Update,Lat,Long_,Confirmed,Deaths,Recovered,Active,Combined_Key\n' +
            '36061,New York City,New York,US,3/22/20 23:45,40.7672726,-73.97152637,9654,63,0,0,"New York City, New York, US"';
        const [doc] = data.parse(testCSV);
        assert(doc.date.toString() !== 'Invalid Date');
    });

    it('should parse early csv correctly', function() {
        const testCSV = `Province/State,Country/Region,Last Update,Confirmed,Deaths,Recovered
Anhui,Mainland China,1/22/2020 17:00,1,,\n`;
        const [doc] = data.parse(testCSV);
        assert(doc.recovered === 0);
    });
});
