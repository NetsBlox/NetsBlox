/**
 * The Metropolitan Museum of Art is one of the world's largest and finest art museums.
 * https://metmuseum.github.io
 * @service
 */

const fs = require('fs');
const MetObject = require('./database.js');
const ApiConsumer = require('../utils/api-consumer');
const MetMuseum = new ApiConsumer('metmuseum', 'https://collectionapi.metmuseum.org/public/collection/v1', {cache: {ttl: 5*60}});



const headers = fs.readFileSync(__dirname + '/metobjects.headers', {encoding: 'utf8'})
    .trim()
    .split(',');

MetMuseum.fields = function() {
    return headers;
};


/**
 * searches the met museum!
 * @param {String} field blah
 * @param {String} query blah
 * @param {Number=} limit blah
 * @returns {Array} results
 */
MetMuseum.search = async function(field, query, limit=10) {
    if (!headers.find(attr => attr === field)) throw new Error('bad field name');
    limit = Math.min(limit, 50); // limit the max requested documents

    let dbQuery = {};
    dbQuery[field] = new RegExp(`.*${query}.*`, 'i');

    let res = await MetObject.find(dbQuery).limit(limit);
    res = res.map(rec => {
        delete rec._doc._id;
        delete rec._doc.__v;
        return rec._doc;
    });

    return res;
};


/**
 * Retrieves the image links for an item
 * @param {Number} id item id
 * @returns {Array} List of images
 */
MetMuseum.getImages = function(id) {
    const queryOpts = {
        queryString: `/objects/${id}`,
    };

    // TODO limit only to public use items

    const parserFn = resp => {
        return resp.primaryImage;
    };

    return this._sendStruct(queryOpts, parserFn);
};


module.exports = MetMuseum;
