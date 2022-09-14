/**
 * The New York Public Library (NYPL) Service provides access to NYPL's online repository of historical items.
 * 
 * @service
 * @category History
 */
'use strict';

const ApiConsumer = require('../utils/api-consumer');
const {NewYorkPublicLibraryKey} = require('../utils/api-key');
const NYPL = new ApiConsumer('NewYorkPublicLibrary', 'http://api.repo.nypl.org/api/v1', {cache: {ttl: 5*60}});
ApiConsumer.setRequiredApiKey(NYPL, NewYorkPublicLibraryKey);

function listify(item) {
    return item === undefined ? [] : item instanceof Array ? item : [item];
}

/**
 * Search the New York Public Library collection and return matching items.
 * Because there may be many matching items, search results are arranged in pages.
 * You can specify the number of items in each page and the page number to retrieve.
 * 
 * This returns a list of up to ``perPage`` matches.
 * Each item in the list is structured data containing details about the object.
 * This includes:
 * 
 * - ``uuid`` - a general identifier for the object, needed for :func:`NewYorkPublicLibrary.getDetails`
 * - ``itemID`` - another identifier, needed for :func:`NewYorkPublicLibrary.getImage`
 * - ``title`` - the title of the object
 * - ``dateDigitized`` - a timestamp of when the object was added to the database
 * 
 * @param {String} term Search term
 * @param {BoundedNumber<1,1000>=} perPage Maximum number of items in a page of results (default 50)
 * @param {BoundedNumber<1>=} page Page number of results to get (default 1)
 * @returns {Array<Object>} An list of up to ``perPage`` matching objects
 */
NYPL.search = async function(term, perPage = 50, page = 1) {
    if (page <= 0) page = 1;
    if (perPage <= 0) return []; // if somehow either of these is invalid, correct it

    const res = await this._requestData({
        path:'items/search',
        queryString:`q=${term}&per_page=${perPage}&page=${page}&publicDomainOnly=true`,
        headers:{Authorization:`Token token=${this.apiKey.value}`},
    });
    
    const ret = [];
    for (const item of listify(res.nyplAPI.response.result)) {
        const uuid = item.uuid;
        const itemURL = item.apiItemURL;
        const itemID = itemURL.substr(itemURL.lastIndexOf('/') + 1);
        const title = item.title;
        const dateDigitized = item.dateDigitized;
        ret.push({ uuid, itemID, title, dateDigitized });
    }
    return ret;
};

NYPL._searchForKey = function(json, key) {
    for (const item of listify(json)) {
        if (key in item) return item[key];
    }
    return undefined;
};
NYPL._getPath = function(obj, path, default_val) {
    for (const p of path) {
        if (obj === undefined) return default_val;
        obj = obj[p];
    }
    return obj;
};

/**
 * Get details about the item.
 * This requires the ``uuid`` for the object, which can be retrieved from :func:`NewYorkPublicLibrary.search`.
 * 
 * @param {String} uuid uuid of the object
 * @returns {Array} Item details
 */
NYPL.getDetails = async function(uuid) {
    const res = await this._requestData({
        path:`items/mods/${uuid}`,
        headers:{Authorization:`Token token=${this.apiKey.value}`},
    });

    const mods = res.nyplAPI.response.mods;
    if (mods === undefined) return {};

    let dateIssued = this._searchForKey(mods.originInfo, 'dateIssued');
    if (dateIssued !== undefined && '$' in dateIssued) dateIssued = dateIssued.$;
    else if (dateIssued instanceof Array && dateIssued.length == 2) dateIssued = `${dateIssued[0].$}-${dateIssued[1].$}`;
    else dateIssued = 'Unknown';

    const location = this._getPath(this._searchForKey(mods.originInfo, 'place'), ['placeTerm', '$'], 'Unknown');
    const publisher = this._getPath(this._searchForKey(mods.originInfo, 'publisher'), ['$'], 'Unknown');

    const genres = [];
    for (const genre of listify(mods.genre)) {
        if ('$' in genre) genres.push(genre.$);
    }

    const subjects = [];
    for (const subject of listify(mods.subject)) {
        for (const subtopic of listify(subject.topic)) {
            if ('$' in subtopic) subjects.push(subtopic.$);
        }
    }

    return {dateIssued, location, publisher, genres, subjects};
};

/**
 * Get the image URLs (0 or more) for the object.
 * 
 * @param {String} itemID itemID of the object
 * @returns {Array} An array of img urls
 */
NYPL._getImageURLs = async function(itemID) {
    const res = await this._requestData({
        path:`items/${itemID}`,
        headers:{Authorization:`Token token=${this.apiKey.value}`},
    });

    const capture = res.nyplAPI.response.capture;
    return capture === undefined ? [] : listify(capture[0].imageLinks.imageLink); // high-res tiff is also available but omitting for safety (very large files)
};

NYPL._pickImageURL = function(urls) {
    for (const preference of ['t=w', 't=r']) {
        for (const url of urls) if (url.includes(preference)) return url;
    }
    return urls[0];
};

/**
 * Get an image of the object.
 * This requires the ``itemID`` for the object, which can be retrieved from :func:`NewYorkPublicLibrary.search`.
 * 
 * @param {String} itemID itemID of the object
 * @returns {Image} An image of the object, if one is available
 */
NYPL.getImage = function(itemID) {
    return this._getImageURLs(itemID).then(urls => urls.length == 0 ? '' : this._sendImage({url:this._pickImageURL(urls)})).catch(() => '');
};

module.exports = NYPL;
