const assert = require('assert');
const axios = require('axios');
const _ = require('lodash');
const Q = require('q');
const COUNTRY_ALIASES = require('./countries');
const BASE_URL = 'https://raw.githubusercontent.com/CSSEGISandData/COVID-19/master/csse_covid_19_data/csse_covid_19_daily_reports/';
const START_DATE = '01-22-2020';
const NULL_LAT_LNG = -9999;
const State = require('./state');

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
        this.setUpdateInterval(4*hour);
    }

    setUpdateInterval(duration) {
        if (this._intervalId) {
            clearInterval(this._intervalId);
        }
        this._intervalId = setInterval(() => this.importMissingData(), duration);
    }

    async importMissingData() {
        let day = new Date(START_DATE);
        const skipDates = await this.existingDates();
        while (!this.isToday(day)) {
            const dateString = this.getDateString(day);
            if (!skipDates.includes(dateString)) {
                const report = await this.fetchDailyReport(day);
                await this.importReport(report, day);
            }
            day = nextDay(day);
        }
    }

    async existingDates() {
        const dates = await this._model.distinct('date');
        return dates.map(d => this.getDateString(d)).sort();
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
        const {data} = await axios.get(url);
        return data;
    }

    async importReport(report, date) {
        const docs = this.parse(report);
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

    resolveCountry(countryString) {
        const match = COUNTRY_ALIASES.find(aliases => aliases
            .find(alias => equalStrings(countryString, alias))
        );
        if (match) {
            return match[0];
        }
        return removeDiacritics(countryString);
    }

    resolveState(stateString) {
        return State.fromCode(stateString.toUpperCase()) || stateString;
    }

    parseRow(row, columnNames) {
        const country = this.resolveCountry(this.getColumn(row, columnNames, 'country'));
        let state = this.getColumn(row, columnNames, 'state');
        let city = this.getColumn(row, columnNames, 'admin2') || '';
        if (country === 'US' && state.includes(',')) {
            const chunks = state.split(',').map(c => c.trim());
            if (this.resolveCountry(chunks[1]) === 'US') {
                [state] = chunks;
            } else {
                [city] = chunks;
                const stateCode = chunks[1].replace(/\./g, '')
                    .substring(0, 2);
                state = State.fromCodeSafe(stateCode);
            }
        }

        return {
            country,
            state,
            city,
            latitude: parseFloat(this.getColumn(row, columnNames, 'lat') || NULL_LAT_LNG),
            longitude: parseFloat(this.getColumn(row, columnNames, 'long') || NULL_LAT_LNG),
            confirmed: parseInt(this.getColumn(row, columnNames, 'confirmed') || '0'),
            deaths: parseInt(this.getColumn(row, columnNames, 'deaths') || '0'),
            recovered: parseInt(this.getColumn(row, columnNames, 'recovered') || '0'),
        };
    }

    formatDate(normalizedDate) {
        const [year, month, day] = normalizedDate.split('/');
        return `${month}/${day}/${year}`;
    }

    normalizeDate(dateString) {
        const date = new Date(dateString);
        const month = (date.getMonth() + 1).toString();
        const day = date.getDate().toString();
        const year = date.getFullYear();
        return `${year}/${month.padStart(2, '0')}/${day.padStart(2, '0')}`;
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
                        columns.push(chunk.trim());
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
        const query = this.getQuery(country, state, city);
        // What is the best way to handle this when there are many documents?
        //const docs = await this._model.find(query).sort({date: 1});  // FIXME

        const docs = await this.getMergedAndSortedDocs(query, type);
        if (docs.length === 0) return locationNotFound();

        return docs;

    }

    async getMergedAndSortedDocs(query, type) {
        const deferred = Q.defer();
        const stream = this._model.find(query).stream();
        const countsByDate = {};

        stream.on('data', doc => {
            const date = this.normalizeDate(doc.date);
            if (!countsByDate[date]) {
                countsByDate[date] = 0;
            }
            countsByDate[date] += doc[type];
        });

        let error;
        stream.on('error', err => error = err);
        stream.on('close', () => {
            if (error) {
                return deferred.reject(error);
            }
            const sortedCounts = Object.entries(countsByDate)
                .sort((p1, p2) => p1[0] < p2[0] ? -1 : 1)
                .map(pair => {
                    const [dateString, count] = pair;
                    return [this.formatDate(dateString), count];
                });

            deferred.resolve(sortedCounts );
        });
        return deferred.promise;
    }

    getQuery(country, state, city) {
        const query = {country: this.resolveCountry(country)};
        if (state) {
            query.state = this.resolveState(state);
        }
        if (city) {
            query.city = city;
        }
        return query;
    }

    async getAllLocations() {
        const docs = await this._model.find({}, {country: 1, state: 1, city: 1});
        const sortedDocs = _.sortBy(docs, ['country', 'state', 'city']);
        return _.sortedUniqBy(
            sortedDocs,
            doc => doc.country + doc.state + doc.city
        );
    }

    async getLocation(country, state, city) {
        const query = this.getQuery(country, state, city);
        ['latitude', 'longitude']
            .forEach(field => query[field] = {$ne: NULL_LAT_LNG});
        const location = await this._model.findOne(query);
        return location || locationNotFound();
    }
}

function nextDay(date) {
    const nextDay = new Date(date);
    nextDay.setDate(date.getDate() + 1);
    return nextDay;
}

function equalStrings(s1, s2) {
    return normalizeString(s1) === normalizeString(s2);
}

function normalizeString(string) {
    return removeDiacritics(string.toLowerCase())
        .replace(/[^a-z]/g, '');
}

function removeDiacritics(string) {
    return string.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

function locationNotFound() {
    throw new Error('Location not found.');
}

module.exports = COVIDData;
