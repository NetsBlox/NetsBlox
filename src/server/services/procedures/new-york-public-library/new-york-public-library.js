'use strict';

const ApiConsumer = require('../utils/api-consumer');
const {NewYorkPublicLibraryKey} = require('../utils/api-key');
const NYPL = new ApiConsumer('NewYorkPublicLibrary', 'http://api.repo.nypl.org/api/v1', {cache: {ttl: 5*60}});
ApiConsumer.setRequiredApiKey(NYPL, NewYorkPublicLibraryKey);

function listify(item) {
    return item === undefined ? [] : item instanceof Array ? item : [item];
}

/**
 * Searches the NYPL db an returns up to count ids denoting matching items.
 * 
 * @param {String} term Term to search for
 * @param {BoundedNumber<1>} per_page Maximum number of items to return for any given page
 * @param {BoundedNumber<1>} page Page number of results to get
 * @returns {Array} Up to per_page matching entries, each being [uuid, title, digitized date, item id, image id]
 */
NYPL.search = function(term, per_page, page) {
    return this._requestData({
        path:'items/search',
        queryString:`q=${term}&per_page=${per_page}&page=${page}&publicDomainOnly=true`,
        headers:{Authorization:`Token token=${this.apiKey.value}`},
    }).then(res => {
        const results = res.nyplAPI.response.result;
        if (results === undefined) return [];

        const ret = [];
        for (const item of listify(results)) {
            const itemURL = item.apiItemURL;
            const itemID = itemURL.substr(itemURL.lastIndexOf('/') + 1);
            ret.push([item.uuid, item.title, item.dateDigitized, itemID, item.imageID]);
        }
        return ret;
    });
};

/**
 * Gets detailed info for the given entry returned from search().
 * 
 * @param {Array} entry Entry returned from search()
 * @returns {Array} A list of [date issued, place, publisher, genres[], subjects[]]
 */
NYPL.details = function(entry) {
    return this._requestData({
        path:`items/mods/${entry[0]}`,
        headers:{Authorization:`Token token=${this.apiKey.value}`},
    }).then(res => {
        const mods = res.nyplAPI.response.mods;

        let dateIssued = mods.originInfo.dateIssued;
        if ('$' in dateIssued) {
            dateIssued = dateIssued.$;
        }
        else if (dateIssued instanceof Array && dateIssued.length == 2) {
            dateIssued = `${dateIssued[0].$}-${dateIssued[1].$}`;
        }
        else {
            dateIssued = 'Unknown';
        }

        const place = mods.originInfo.place.placeTerm.$;
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

        return [dateIssued, place, publisher, genres, subjects];
    });
};

/**
 * Gets the image links associated with the given entry returned from search().
 * 
 * @param {Array} entry An entry returned from search()
 * @returns {Array} An array of imgurls[]
 */
NYPL.imageURLs = function(entry) {
    return this._requestData({
        path:`items/${entry[3]}`,
        headers:{Authorization:`Token token=${this.apiKey.value}`},
    }).then(res => {
        return listify(res.nyplAPI.response.capture[0].imageLinks.imageLink); // high-res tiff is also available but omitting for safety (very large files)
    });
};

/**
 * Gets an image for the given entry returned from search().
 * 
 * @param {Array} entry An entry returned from search()
 */
NYPL.getImage = function(entry) {
    return this.imageURLs(entry).then(urls => this._sendImage({url:urls[0]}));
};

module.exports = NYPL;
