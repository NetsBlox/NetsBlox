#!/bin/env node

const seeder = require('../utils/csv-toolset');
const MetMuseumCol = require('./database');

seeder(MetMuseumCol, {url: 'https://media.githubusercontent.com/media/metmuseum/openaccess/master/MetObjects.csv'});
