/**
 * The Smithsonian Service provides access to the Smithsonan open-access EDAN database,
 * containing catalogued information on millions of historical items.
 * 
 * @alpha
 * @service
 * @category History
 */
'use strict';

const ApiConsumer = require('../utils/api-consumer');
const {DataDotGovKey} = require('../utils/api-key');
const Smithsonian = new ApiConsumer('Smithsonian', 'https://api.si.edu/openaccess/api/v1.0', {cache: {ttl: 5*60}});
ApiConsumer.setRequiredApiKey(Smithsonian, DataDotGovKey);

function listify(item) {
    return item === undefined ? [] : item instanceof Array ? item : [item];
}

// any more than 1000 results in their API restricting it down to 10
const MAX_GRAB_COUNT = 1000;

Smithsonian._raw_search = async function(term, count, skip) {
    const data = await this._requestData({path:'search', queryString:`api_key=${this.apiKey.value}&q=${term}&start=${skip}&rows=${count}`});

    const matches = [];
    for (const item of data.response.rows) {
        if (matches.length >= count) break; // if we have enough, stop adding
        skip += 1;

        const desc = item.content.descriptiveNonRepeating;
        const hasImage = 'online_media' in desc && listify(desc.online_media.media).length != 0;

        const notes = [];
        if ('notes' in item.content.freetext) {
            for (const note of listify(item.content.freetext.notes)) {
                notes.push(note.content);
            }
        }

        const physicalDescriptions = [];
        if ('physicalDescription' in item.content.freetext) {
            for (const desc of listify(item.content.freetext.physicalDescription)) {
                physicalDescriptions.push([desc.label, desc.content]);
            }
        }

        const sources = [];
        if ('dataSource' in item.content.freetext) {
            for (const src of listify(item.content.freetext.dataSource)) {
                sources.push([src.label, src.content]);
            }
        }

        const id = item.id;
        const title = item.title;
        const types = listify(item.content.indexedStructured.object_type);
        const authors = listify(item.content.indexedStructured.name);
        const topics = listify(item.content.indexedStructured.topic);

        matches.push({ id, title, types, authors, topics, notes, physicalDescriptions, sources, hasImage });
    }
    return matches;
};

/**
 * Search and return up to count matching items
 * 
 * @param {String} term Term to search for
 * @param {BoundedNumber<1,1000>=} count Maximum number of items to return
 * @param {BoundedNumber<0>=} skip Number of items to skip from beginning
 * @returns {Array} Up to count matches
 */
Smithsonian.search = function(term, count = 100, skip = 0) {
    if (skip < 0) skip = 0;
    if (count <= 0) return []; // if somehow either of these is invalid, correct it

    return this._raw_search(term, count, skip);
};

Smithsonian._raw_filter = async function(term, count, skip) {
    const batch = await this.search(term, count, skip);

    const filtered = [];
    for (const item of batch) {
        if (item.hasImage) filtered.push(item);
    }
    return filtered;
};

/**
 * Search and return up to count matching items (only ones with images)
 * 
 * @param {String} term Term to search for
 * @param {BoundedNumber<1,1000>=} count Maximum number of items to return
 * @param {BoundedNumber<0>=} skip Number of items to skip from beginning
 * @returns {Array} Up to count matches
 */
Smithsonian.searchImageContent = async function(term, count = 100, skip = 0) {
    if (skip < 0) skip = 0;
    if (count <= 0) return []; // if somehow either of these is invalid, correct it

    let matches = undefined;
    let real_skip = 0;

    // discard skip items 
    while (matches === undefined) {
        const filtered = await this._raw_filter(term, MAX_GRAB_COUNT, real_skip);
        real_skip += MAX_GRAB_COUNT;

        const len = filtered.length;
        if (len <= skip) skip -= len; // if less than skip count, we just discard all of them
        else matches = filtered.slice(skip, skip + Math.min(count, len - skip)); // otherwise we take up to count items from tail, and are done with skip logic
    }

    // take more items until we fill have count items in total
    while (matches.length < count) {
        const filtered = await this._raw_filter(term, MAX_GRAB_COUNT, real_skip);
        real_skip += MAX_GRAB_COUNT;

        const needed = count - matches.length;
        matches = matches.concat(filtered.slice(0, Math.min(filtered.length, needed))); // take at most what we need
    }

    return matches;
};

/**
 * Get the image URLs (0 or more) associated with the given object
 * 
 * @param {String} id ID of an object returned from search
 */
Smithsonian._getImageURLs = function(id) {
    return this._requestData({path:`content/${id}`, queryString:`api_key=${this.apiKey.value}`}).then(res => {
        const online_media = res.response.content.descriptiveNonRepeating.online_media;
        if (online_media === undefined) return [];

        const urls = [];
        for (const item of listify(online_media.media)) {
            const c = item.content;
            if (c !== undefined && (c.endsWith('.jpg') || c.endsWith('.png'))) urls.push(c);
            else urls.push(item.thumbnail);
        }
        return urls;
    }).catch(() => []); // any failure technically means there were no image urls
};

/**
 * Get an image associated with the given object
 * 
 * @param {String} id ID of an object returned from search
 */
Smithsonian.getImage = function(id) {
    return this._getImageURLs(id).then(urls => urls.length == 0 ? '' : this._sendImage({url:urls[0]})).catch(() => '');
};

module.exports = Smithsonian;
