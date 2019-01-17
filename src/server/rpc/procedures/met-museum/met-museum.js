/**
 * The Metropolitan Museum of Art is one of the world's largest and finest art museums.
 * @service
 */

const fs = require('fs');
const MetObject = require('./database.js');
const ApiConsumer = require('../utils/api-consumer');
const { JSDOM } = require('jsdom');
const MetMuseum = new ApiConsumer('metmuseum', 'https://www.metmuseum.org/art/collection/search', {cache: {ttl: 5*60}});



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
        queryString: `/${id}`,
    };

    // TODO limit only to public use items

    const parserFn = resp => {
        let images = [];
        let dom = new JSDOM(resp);
        const carouselImages = dom.window.document.querySelectorAll('.met-carousel img');
        carouselImages.forEach(el => images.push(el.getAttribute('data-largeimage')));

        if (!images.length) {
            const mainImageEl = dom.window.document.getElementById('artwork__image');
            images.push(mainImageEl.src);
        }
        return images;
    };

    return this._sendStruct(queryOpts, parserFn);
};


module.exports = MetMuseum;
