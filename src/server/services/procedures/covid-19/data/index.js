const assert = require('assert');
const axios = require('axios');
const _ = require('lodash');
const COUNTRY_ALIASES = require('./countries');
const BASE_URL = 'https://raw.githubusercontent.com/CSSEGISandData/COVID-19/master/csse_covid_19_data/csse_covid_19_daily_reports/';
const START_DATE = '01-22-2020';
const NULL_LAT_LNG = -9999;

const TYPES = {
    DEATH: 'deaths',
    CONFIRMED: 'confirmed',
    RECOVERED: 'recovered',
};

class COVIDData {
    constructor(model) {
        this._model = model;
        this.types = TYPES;
        this._intervalId = null;
        const hour = 1000*60*60;
        this.setUpdateInterval(3*hour);
    }

    setUpdateInterval(duration) {
        if (this._intervalId) {
            clearInterval(this._intervalId);
        }
        this._intervalId = setInterval(() => this.checkUpdate(), duration);
    }

    async checkUpdate() {  // TODO: test me!
        const latest = await this._model.find().sort({date: 1}).limit(1);
        const needsUpdate = !latest || !this.isToday(latest.date);
        console.log('\n\n>> latest', latest);
        console.log('\n\n>> needsUpdate', needsUpdate);
        if (needsUpdate) {
            const today = new Date();
            const report = this.fetchDailyReport(today);
            await this.importReport(report, today);
        }
    }

    async importPastData() {
        let day = new Date(START_DATE);
        while (!this.isToday(day)) {
            const report = await this.fetchDailyReport(day);
            await this.importReport(report, day);
            day = nextDay(day);
        }
    }

    isToday(date) {
        const today = new Date();
        return this.getDateString(date) === this.getDateString(today);
    }

    getDateString(date) {
        const month = date.getMonth() + 1;
        const day = date.getDate();
        const year = date.getFullYear();
        return `${this.pad(month)}-${this.pad(day)}-${year}`;
    }

    pad(date) {
        return date.toString().padStart(2, '0');
    }

    async fetchDailyReport(date=new Date()) {
        date = date || new Date();
        const url = `${BASE_URL}${this.getDateString(date)}.csv`;
        console.log('fetching data for', this.getDateString(date));
        const {data} = await axios.get(url);
        return data;
    }

    async importReport(report, date) {
        const docs = this.parse(report);
        console.log('importing', docs.length, 'docs');
        docs.forEach(doc => doc.date = date);
        await this._model.insertMany(docs);
    }

    parse(data) {
        const table = this.parseCSV(data);
        const headers = table[0];
        const docs = table.slice(1)
            .map(row => this.parseRow(row, headers));
        docs.forEach(row => this.validateDoc(row));
        return docs;
    }

    validateDoc(doc) {
        this.ensureNumeric(doc, 'confirmed');
        this.ensureNumeric(doc, 'deaths');
        this.ensureNumeric(doc, 'recovered');
        assert(doc.country, `Missing country: ${JSON.stringify(doc)}`);
    }

    ensureNumeric(doc, field) {
        assert(!isNaN(doc[field]), `Missing ${field}: ${JSON.stringify(doc)}`);
    }

    parseRow(row, columnNames) {
        return {
            country: this.getColumn(row, columnNames, 'country'),
            state: this.getColumn(row, columnNames, 'state'),
            city: this.getColumn(row, columnNames, 'admin2'),
            latitude: parseFloat(this.getColumn(row, columnNames, 'lat') || NULL_LAT_LNG),
            longitude: parseFloat(this.getColumn(row, columnNames, 'long') || NULL_LAT_LNG),
            confirmed: parseInt(this.getColumn(row, columnNames, 'confirmed') || '0'),
            deaths: parseInt(this.getColumn(row, columnNames, 'deaths') || '0'),
            recovered: parseInt(this.getColumn(row, columnNames, 'recovered') || '0'),
        };
    }

    normalizeDate(dateString) {
        const date = new Date(dateString);
        return `${date.getMonth() + 1}/${date.getDate()}/${date.getFullYear()}`;
    }

    getColumn(row, columnNames, name) {
        const index = columnNames
            .findIndex(column => column.toLowerCase().includes(name));
        return row[index];
    }

    parseCSV(data) {
        const rows = data.trim().split('\n').map(line => {
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
            columns.push(chunk.trim());
            return columns;
        });

        return rows;
    }

    async getData(type, country, state, city) {
        // TODO: Find all matches, if more than one, combine them
        const query = {country};
        if (state) {
            query.state = state;
        }
        if (city) {
            query.city = city;
        }
        const docs = await this._model.find(query).sort({date: 1});
        console.log('docs:', docs);
        if (docs.length === 0) return locationNotFound();

        const countsByDate = docs
            .map(doc => [this.normalizeDate(doc.date), doc[type]])
            .reduce((counts, dateAndCount) => {
                const [docDate, docCount] = dateAndCount;
                const lastRow = counts[counts.length - 1];
                if (lastRow) {
                    const [lastDate, lastCount] = lastRow;
                    if (lastDate === docDate) {
                        lastRow[1] = lastCount + docCount;
                    } else {
                        counts.push([docDate, docCount]);
                    }
                } else {
                    counts.push([docDate, docCount]);
                }
                return counts;
            }, []);
        return countsByDate;
        //if (state !== '') {
            //const row = Data.getRow(type, country, state);
            //return addDatesToCounts(type, row.slice(4));
        //} else {
            //const rows = Data.rawData[type];
            //const matchingRows = rows.slice(1).filter(row => {
                //const [, c] = row;
                //return isCountry(c, country);
            //});

            //if (matchingRows.length === 0) {
                //return locationNotFound();
            //}

            //const counts = matchingRows.reduce((counts, row) => {
                //const values = row.slice(4);
                //return _.zipWith(counts, values,(c1=0, c2=0) => c1 + c2);
            //}, []);

            //return addDatesToCounts(type, counts);
        //}
    }
}

function nextDay(date) {
    const nextDay = new Date(date);
    nextDay.setDate(date.getDate() + 1);
    return nextDay;
}

// TODO: Update this
//Data.getRow = function(type, country, state='') {
    //const rows = Data.rawData[type];
    //return rows.slice(1).find(row => {
        //const [s, c] = row;
        //return isCountry(c, country) && equalStrings(s, state);
    //}) || locationNotFound();
//};

//Data.getAllData = function() {
    //return Object.values(Data.rawData)
        //.reduce((combined, data) => {
            //return combined.concat(data.slice(1));
        //}, []);
//};

//Data.setUpdateInterval = function(duration) {
    //if (this._intervalId) {
        //clearInterval(this._intervalId);
    //}
    //this._intervalId = setInterval(fetchLatestData, duration);
//};

//function isCountry(country, other) {
    //const validNames = [country];
    //if (COUNTRY_ALIASES[country]) {
        //validNames.push(...COUNTRY_ALIASES[country]);
    //}
    //return validNames.find(country => equalStrings(country, other));
//}

//function equalStrings(s1, s2) {
    //return normalizeString(s1) === normalizeString(s2);
//}

//function normalizeString(string) {
    //return string.toLowerCase()
        //.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
        //.replace(/[^a-z]/g, '');
//}

function addDatesToCounts(type, values) {
    const columnNames = Data.rawData[type][0];
    const dates = columnNames.slice(4);
    return _.zip(dates, values);
}

//async function fetchLatestData() {
    //await Promise.all(Object.values(Data.types).map(fetchDataFile));
//}

//async function fetchDataFile(type) {
    //const filename = `time_series_19-covid-${type}.csv`;
    //const url = `https://raw.githubusercontent.com/CSSEGISandData/COVID-19/master/csse_covid_19_data/csse_covid_19_time_series/${filename}`;
    //`https://raw.githubusercontent.com/CSSEGISandData/COVID-19/master/csse_covid_19_data/csse_covid_19_daily_reports/03-25-2020.csv`
    //const {data} = await axios.get(url);
    //Data.rawData[type] = parseDataFile(data);
//}

//function parseDataFile(data) {
    //const rows = data.trim().split('\n').map(line => {
        //const columns = [];
        //let isQuoted = false;
        //let chunk = '';

        //for (let i = 0; i < line.length; i++) {
            //switch (line[i]) {
            //case ',':
                //if (isQuoted) {
                    //chunk += ',';
                //} else {
                    //columns.push(chunk);
                    //chunk = '';
                //}
                //break;

            //case '"':
                //isQuoted = !isQuoted;
                //break;

            //default:
                //chunk += line[i];
                //break;
            //}
        //}
        //columns.push(chunk);
        //return columns;
    //});

    //return rows.map((row, index) => {
        //if (index === 0) {
            //return row;
        //}
        //return row.map((value, index) => index > 3 ? +value : value);
    //});
//}

function locationNotFound() {
    throw new Error('Location not found.');
}

//fetchLatestData();

//const hour = 1000*60*60;
//Data.setUpdateInterval(6*hour);

module.exports = COVIDData;
