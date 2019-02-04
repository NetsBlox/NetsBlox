#!/bin/env node

// prepare my url or file

// pass onto the seed helper

// import seed helper and database model
const seeder = require('../utils/csv-toolset'); // TODO rename
const MetMuseumCol = require('./database');

seeder(MetMuseumCol);
