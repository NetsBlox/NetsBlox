/**
 * The Project Gutenberg service provides access to public domain books. For more information, check out https://project-gutenberg.org/.
 *
 * @alpha
 * @service
 */

const logger = require('../utils/logger')('project-gutenberg');
const ProjectGutenberg = {};
const metadata = require('./metadata');
const h = require('./helpers');
const Storage = require('../../storage');
const axios = require('axios');
const _ = require('lodash');
const ProjectGutenbergStorage = Storage.createCollection(`netsblox:services:project-gutenberg`);
const {BookNotFound} = require('./errors');
// TODO: add initialize fn to services? add optional configurations for services?

ProjectGutenbergStorage.findOne({}).then(async result => {
    if (!result) {
        logger.info('No data found in database, importing metadata.');
        const docs = await metadata.getMetadataDocs();
        await ProjectGutenbergStorage.insertMany(docs);
    }
});

/**
 * Get the full text for a given book.
 *
 * @param {String} ID Book ID
 * @returns {String}
 */
ProjectGutenberg.getText = async function(id) {
    const url = 'TODO';  // TODO
    const response = await axios.get(url);
    // TODO: handle errors
    if (response.status === 404) {
        throw new BookNotFound(id);
    }
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
    return _.pick(info, ['id', 'title', 'short title', 'author', 'contributor', 'language']);
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

async function getTitles(title) {
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
