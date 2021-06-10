/**
 * The Project Gutenberg service provides access to public domain books. For more information, check out https://project-gutenberg.org/.
 *
 * @alpha
 * @service
 */

const logger = require('../utils/logger')('project-gutenberg');
const metadata = require('./metadata');
const Storage = require('../../storage');
const _ = require('lodash');
const ProjectGutenbergStorage = Storage.createCollection('netsblox:services:project-gutenberg');
const {BookNotFound} = require('./errors');
const axios = require('axios');
const ProjectGutenberg = {};

ProjectGutenberg.initialize = function() {
    ProjectGutenbergStorage.findOne({}).then(async result => {
        if (!result) {
            logger.info('No data found in database, importing metadata.');
            const docs = await metadata.getMetadataDocs();
            await ProjectGutenbergStorage.insertMany(docs);
        }
    });
};

/**
 * Get the URL for the full text of a given book.
 *
 * @param {String} ID Book ID
 * @returns {String}
 */
ProjectGutenberg.getText = async function(id) {
    const {url} = await this.getInfo(id);
    const response = await axios({url, method: 'GET'});
    return response.data;
};

/**
 * Get information about a given book including title and author.
 *
 * @param {String} ID Book ID
 * @returns {Array}
 */
ProjectGutenberg.getInfo = async function(id) {
    const info = await ProjectGutenbergStorage.findOne({id},  {_id: 0});
    if (!info) {
        throw new BookNotFound(id);
    }
    return _.pick(info, ['id', 'title', 'short title', 'author', 'contributor', 'language', 'url']);
};

/**
 * Search for a book given title text and optional advanced options. Returns a list of book IDs.
 *
 * @param {String} text
 * @returns {Array<string>}
 */
ProjectGutenberg.search = async function(text) {
    const ids = await search(text);
    return ids;
};

let titles;
const titlesP = metadata.getMetadataDocs()
    .then(docs => titles = docs.filter(doc => doc.title).map(doc => [normalize(doc.title + doc.author), doc.id]));

function normalize(text) {
    return text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
}

async function getTitles() {
    if (titles) {
        return titles;
    }
    return titlesP;
}

async function search(title) {
    title = normalize(title);
    const titles = await getTitles();
    const matches = titles
        .filter(pair => pair[0].includes(title))
        .map(pair => pair[1]);

    return matches;
}

module.exports = ProjectGutenberg;
