/**
 * The Pixabay Service provides access to free images released under Creative Commons CC0.
 * For more information, check out https://pixabay.com
 * @service
 * @category Media
 */

const ApiConsumer = require('../utils/api-consumer');
const pixabay = new ApiConsumer('Pixabay', 'https://pixabay.com/api/?');
const {PixabayKey} = require('../utils/api-key');
ApiConsumer.setRequiredApiKey(pixabay, PixabayKey);
const rpcUtils = require('../utils');

function parserFnGen(maxHeight) {
    let optimalSize;
    if (!maxHeight || maxHeight > 640) {
        optimalSize = ['_640', '_640'];
    } else if (maxHeight < 360) {
        optimalSize = ['_640', '_180'];
    } else {
        optimalSize = ['_640', '_340'];
    }
    return data => {
        return data.hits.map(item => {
            return {
                image_url: item.webformatURL.replace(optimalSize[0], optimalSize[1]),
                tags: item.tags.split(', '),
                type: item.type
            };
        });
    };
}

pixabay._encodeQueryOptions = function(keywords, type, minHeight=0, self) {
    if (self === 'searchAll') {
        type = 'all';
    } else if (self === 'searchPhoto') {
        type = 'photo';
    } else if (self === 'searchIllustration') {
        type = 'illustration';
    }
    const query = encodeURIComponent(keywords);
    return {
        queryString: rpcUtils.encodeQueryData({
            key: this.apiKey.value,
            q: query,
            image_type: type,
            safesearch: true,
            min_height: minHeight
        }),
        cacheKey: {query, type, minHeight}
    };
};


/**
 * Search Pixabay for a photo matching the keywords.
 * This is identical to :func:`Pixabay.searchAll` except that only photos are returned.
 * 
 * @param {String} keywords Search query
 * @param {Number=} maxHeight Restrict query to images smaller than ``maxHeight``
 * @param {Number=} minHeight Restrict query to images larger than ``minHeight``
 * @returns {Array<Object>} list of matching images
 */
pixabay.searchPhoto = function (keywords, maxHeight, minHeight) {
    return this._sendStruct(this._encodeQueryOptions(keywords, null, minHeight, 'searchPhoto'), parserFnGen(maxHeight));
};

/**
 * Search Pixabay for an illustration matching the keywords.
 * This is identical to :func:`Pixabay.searchAll` except that only illustrations are returned.
 * 
 * @param {String} keywords Search query
 * @param {Number=} maxHeight Restrict query to images smaller than ``maxHeight``
 * @param {Number=} minHeight Restrict query to images larger than ``minHeight``
 * @returns {Array<Object>} list of matching images
 */
pixabay.searchIllustration = function (keywords, maxHeight, minHeight) {
    return this._sendStruct(this._encodeQueryOptions(keywords, null, minHeight, 'searchIllustration'), parserFnGen(maxHeight));
};

/**
 * Search Pixabay for an image matching the keywords.
 * The returned data is a list of structeud data objects containing information about each matching image.
 * Notably, the ``image_url`` field of each match can be passed to :func:`Pixabay.getImage`.
 * 
 * @param {String} keywords Search query
 * @param {Number=} maxHeight Restrict query to images smaller than ``maxHeight``
 * @param {Number=} minHeight Restrict query to images larger than ``minHeight``
 * @returns {Array<Object>} list of matching images
 */
pixabay.searchAll = function (keywords, maxHeight, minHeight) {
    return this._sendStruct(this._encodeQueryOptions(keywords, null, minHeight, 'searchAll'), parserFnGen(maxHeight));
};

/**
 * Retrieve an image from Pixabay from the URL
 * 
 * @param {String} url URL of the image to retrieve
 * @returns {Image} the requested image
 */
pixabay.getImage = function(url){
    return this._sendImage({url});
};

module.exports = pixabay;
