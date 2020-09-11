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
 * Search results are arranged in pages - only one page is returned each call.
 * 
 * @param {String} term Search term
 * @param {BoundedNumber<1,1000>=} perPage Maximum number of items in a page of results (default 50)
 * @param {BoundedNumber<1>=} page Page number of results to get (default 1)
 * @returns {Array} Up to perPage matching objects
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

/**
 * Get details about the item.
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

    let dateIssued = mods.originInfo.dateIssued;
    if ('$' in dateIssued) dateIssued = dateIssued.$;
    else if (dateIssued instanceof Array && dateIssued.length == 2) dateIssued = `${dateIssued[0].$}-${dateIssued[1].$}`;
    else dateIssued = 'Unknown';

    const location = mods.originInfo.place.placeTerm.$;
    const publisher = mods.originInfo.publisher.$;

    const genres = [];
    for (const genre of listify(mods.genre)) {
        genres.push(genre.$);
    }

    const subjects = [];
    for (const subject of listify(mods.subject)) {
        if ('topic' in subject) {
            subjects.push(subject.topic.$);
        }
    }

    return {dateIssued, location, publisher, genres, subjects};
};

/**
 * Get the image URLs (0 or more) for the object.
 * 
 * @param {String} itemID itemID of the object
 * @returns {Array} An array of imgurls[]
 */
NYPL.getImageURLs = async function(itemID) {
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
 * 
 * @param {String} itemID itemID of the object
 */
NYPL.getImage = function(itemID) {
    return this.imageURLs(itemID).then(urls => urls.length == 0 ? '' : this._sendImage({url:this._pickImageURL(urls)})).catch(() => '');
};

module.exports = NYPL;
