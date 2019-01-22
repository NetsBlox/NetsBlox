/**
 * Access the Metropolitan Museum of Art's collection.
 * For explanation on the different attributes for each object,
 * visit https://metmuseum.github.io.
 * @service
 */

const fs = require('fs');
const MetObject = require('./database.js');
const ApiConsumer = require('../utils/api-consumer');
const MetMuseum = new ApiConsumer('metmuseum', 'https://collectionapi.metmuseum.org/public/collection/v1', {cache: {ttl: 5*60}});


function toTitleCase(text) {
    return text.toLowerCase()
        .split(' ')
        .map((s) => s.charAt(0).toUpperCase() + s.substring(1))
        .join(' ');
}

// converts a phrase into camel case format
function toCamelCase(text) {
    // create uppercc
    let cc = text.toLowerCase()
        .split(' ')
        .map((s) => s.charAt(0).toUpperCase() + s.substring(1))
        .join('');
    return cc;
}


function cleanDbRec(rec) {
    delete rec._doc._id;
    delete rec._doc.__v;
    return rec._doc;
}

const headers = fs.readFileSync(__dirname + '/metobjects.headers', {encoding: 'utf8'})
    .trim()
    .split(',');

/**
 * Get a list of available attributes for museum's objects
 * @returns {Array} available headers
 */
MetMuseum.fields = function() {
    return headers;
};


/**
 * Search the Metropolitan Museum of Art
 * @param {String} field field to search in
 * @param {String} query text query to look for
 * @param {Number=} page used to paginate the results, in conjunction with limit
 * @param {Number=} limit limit the number of returned results (maximum of 50)
 * @returns {Array} results
 */
MetMuseum.advancedSearch = async function(field, query, page, limit) {
    // prepare and check the input
    field = toTitleCase(field);
    if (!headers.find(attr => attr === field)) throw new Error('bad field name');
    if (page === '') page = 0;
    if (limit === '') limit = 10;
    limit = Math.min(limit, 50); // limit the max requested documents


    // build the database query
    let dbQuery = {};
    dbQuery[field] = new RegExp(`.*${query}.*`, 'i');

    let res = await MetObject.find(dbQuery).skip(page).limit(limit);

    return res.map(cleanDbRec);
};


/**
 * Retrieves extended information about a single object
 * @param {Number} id object id
 * @returns {Array} List of images
 */
MetMuseum.getInfo = async function(id) {
    // could be updated to get info from museum's end point after it becomes stable
    let dbQuery = {
        'Object ID': id
    };

    let rec = await MetObject.findOne(dbQuery);

    return cleanDbRec(rec);
};


/**
 * Retrieves the image links for a public domain object
 * @param {Number} id object id
 * @returns {Array} List of images
 */
MetMuseum.getImages = async function(id) {

    let object =  await MetObject.findOne({'Object ID': `${id}`});

    if (object['Is Public Domain'] !== 'True') {
        throw new Error(`Object ${id} is not public domain.`);
    }

    const queryOpts = {
        queryString: `/objects/${id}`,
    };

    const parserFn = resp => {
        let images = [];
        if (resp.primaryImage) {
            images.push(resp.primaryImage);
            if (resp.additionalImages) {
                images.push(...resp.additionalImages);
            }
        }
        return images;
    };

    return this._sendStruct(queryOpts, parserFn);
};


const featuredFields = [
    'Country',
    'Artist Display Bio',
    'Artist Display Name',
    'Dimensions',
    'Object Name',
    'Classification',
    'Title',
    'Credit Line',
    'Object Date',
    'Medium',
    'Repository',
    'Department',
    'Is Highlight'
];


featuredFields.forEach(field => {
    MetMuseum['searchBy' + toCamelCase(field)] = async function(query) {
        // build the database query
        let dbQuery = {};
        dbQuery[field] = new RegExp(`.*${query}.*`, 'i');
        dbQuery['Is Public Domain'] = 'True';

        let res = await MetObject.find(dbQuery).limit(20);
        res = res.map(cleanDbRec);
        return res;
    };
});

module.exports = MetMuseum;
