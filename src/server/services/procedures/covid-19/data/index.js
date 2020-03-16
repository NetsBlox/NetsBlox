const axios = require('axios');
const _ = require('lodash');
const COUNTRY_ALIASES = require('./countries');
const Data = {};
Data.types = {
    DEATH: 'Deaths',
    CONFIRMED: 'Confirmed',
    RECOVERED: 'Recovered',
};
Data.rawData = {};

Data.getData = function(type, country, state='') {
    if (state !== '') {
        const row = Data.getRow(type, country, state);
        return addDatesToCounts(type, row.slice(4));
    } else {
        const rows = Data.rawData[type];
        const matchingRows = rows.slice(1).filter(row => {
            const [, c] = row;
            return isCountry(c, country);
        });

        if (matchingRows.length === 0) {
            return locationNotFound();
        }

        const counts = matchingRows.reduce((counts, row) => {
            const values = row.slice(4);
            return _.zipWith(counts, values,(c1=0, c2=0) => c1 + c2);
        }, []);

        return addDatesToCounts(type, counts);
    }
};

Data.getRow = function(type, country, state='') {
    const rows = Data.rawData[type];
    return rows.slice(1).find(row => {
        const [s, c] = row;
        return isCountry(c, country) && equalStrings(s, state);
    }) || locationNotFound();
};

Data.getAllData = function() {
    return Object.values(Data.rawData)
        .reduce((combined, data) => {
            return combined.concat(data.slice(1));
        }, []);
};

Data.setUpdateInterval = function(duration) {
    if (this._intervalId) {
        clearInterval(this._intervalId);
    }
    this._intervalId = setInterval(fetchLatestData, duration);
};

function isCountry(country, other) {
    const validNames = [country];
    if (COUNTRY_ALIASES[country]) {
        validNames.push(...COUNTRY_ALIASES[country]);
    }
    return validNames.find(country => equalStrings(country, other));
}

function equalStrings(s1, s2) {
    return normalizeString(s1) === normalizeString(s2);
}

function normalizeString(string) {
    return string.toLowerCase().replace(/[^a-z]/g, '');
}

function addDatesToCounts(type, values) {
    const columnNames = Data.rawData[type][0];
    const dates = columnNames.slice(4);
    return _.zip(dates, values);
}

async function fetchLatestData() {
    await Promise.all(Object.values(Data.types).map(fetchDataFile));
}

async function fetchDataFile(type) {
    const filename = `time_series_19-covid-${type}.csv`;
    const url = `https://raw.githubusercontent.com/CSSEGISandData/COVID-19/master/csse_covid_19_data/csse_covid_19_time_series/${filename}`;
    const {data} = await axios.get(url);
    Data.rawData[type] = parseDataFile(data);
}

function parseDataFile(data) {
    const rows = data.split('\n').map(line => {
        const columns = [];
        let isQuoted = false;
        let chunk = '';

        for (let i = 0; i < line.length; i++) {
            switch (line[i]) {
            case ',':
                if (isQuoted) {
                    chunk += ',';
                } else {
                    columns.push(chunk);
                    chunk = '';
                }
                break;

            case '"':
                isQuoted = !isQuoted;
                break;

            default:
                chunk += line[i];
                break;
            }
        }
        columns.push(chunk);
        return columns;
    });

    return rows.map((row, index) => {
        if (index === 0) {
            return row;
        }
        return row.map((value, index) => index > 3 ? +value : value);
    });
}

function locationNotFound() {
    throw new Error('Location not found.');
}

fetchLatestData();

const hour = 1000*60*60;
Data.setUpdateInterval(6*hour);

module.exports = Data;
