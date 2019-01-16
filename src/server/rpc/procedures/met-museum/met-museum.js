/**
 * The Metropolitan Museum of Art is one of the world's largest and finest art museums.
 * @service
 */

const ApiConsumer = require('../utils/api-consumer');
const { JSDOM } = require('jsdom');
const MetMuseum = new ApiConsumer('MetMuseum', 'https://www.metmuseum.org/art/collection/search', {cache: {ttl: 5*60}});



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
