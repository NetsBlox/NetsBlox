/**
 * Access the Metropolitan Museum of Art's collection.
 * For explanation on the different attributes for each object,
 * visit https://metmuseum.github.io.
 * @service
 */

const MetObject = require('./database.js');
const ApiConsumer = require('../utils/api-consumer');
const DBConsumer = require('../utils/db-consumer');
const MetApiConsumer = new ApiConsumer('MetMuseum', 'https://collectionapi.metmuseum.org/public/collection/v1', {cache: {ttl: 5*60}});
const MetMuseum = new DBConsumer('MetMuseum', MetObject);


function toTitleCase(text) {
    return text.toLowerCase()
        .split(' ')
        .map((s) => s.charAt(0).toUpperCase() + s.substring(1))
        .join(' ');
}

async function getMetObject(id) {
    let dbQuery = {
        'Object ID': id
    };
    let rec = await MetMuseum._model.findOne(dbQuery);
    if (!rec) throw new Error(`could not find an object with ID: ${id}`);
    return rec;
}


/**
 * Get a list of available attributes for museum's objects
 * @returns {Array} available headers
 */
MetMuseum.fields = function() {
    return this._fields();
};

/**
 * Search the Metropolitan Museum of Art
 * @param {String} field field to search in
 * @param {String} query text query to look for
 * @param {Number=} skip used to paginate the results, number of records to skip from the begining
 * @param {Number=} limit limit the number of returned results (maximum of 50)
 * @returns {Array} results
 */
MetMuseum.advancedSearch = function(field, query, skip, limit) {
    field = toTitleCase(field);
    return this._advancedSearch(field, query, skip, limit);
};

/**
 * Retrieves extended information about a single object
 * @param {Number} id object id
 * @returns {Array} List of images
 */
MetMuseum.getInfo = async function(id) {
    // could be updated to get info from museum's end point after it becomes stable
    let rec = await getMetObject(id);
    return this._cleanDbRec(rec);
};


/**
 * Retrieves the image links for a public domain object
 * Note: use costume loader library to load the images.
 * @param {Number} id object id
 * @returns {Array} List of images
 */
MetMuseum.getImageUrls = async function(id) {

    let object =  await getMetObject(id);

    if (object['Is Public Domain'] !== 'True') {
        throw new Error(`object ${id} is not public domain.`);
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

    return MetApiConsumer._sendStruct(queryOpts, parserFn);
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

MetMuseum._genRPCs(featuredFields);

module.exports = MetMuseum;
