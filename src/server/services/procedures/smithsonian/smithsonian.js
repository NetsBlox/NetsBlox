/**
 * The Smithsonian Service provides access to the Smithsonan open-access EDAN database,
 * containing catalogued information on millions of historical items.
 * 
 * @service
 */
'use strict';

const ApiConsumer = require('../utils/api-consumer');
const {DataDotGovKey} = require('../utils/api-key');
const Smithsonian = new ApiConsumer('Smithsonian', 'https://api.si.edu/openaccess/api/v1.0', {cache: {ttl: 5*60}});
ApiConsumer.setRequiredApiKey(Smithsonian, DataDotGovKey);

function listify(item) {
    return item === undefined ? [] : item instanceof Array ? item : [item];
}

Smithsonian._raw_search = function(term, count, skip, filter) {
    return this._requestData({path:'search', queryString:`api_key=${this.apiKey.value}&q=${term}&start=${skip}&rows=${count}`}).then(res => {
        const items = [];
        for (const item of res.response.rows) {
            if (!filter(item)) continue; // unfortunately they don't have built-in support for filtering to only with img

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

            items.push({ id, title, types, authors, topics, notes, physicalDescriptions, sources });
        }
        return items;
    });
};

/**
 * Search and return up to count matching items
 * 
 * @param {String} term Term to search for
 * @param {BoundedNumber<0>=} count Maximum number of items to return
 * @param {BoundedNumber<0>=} skip Number of items to skip from beginning
 * @returns {Array} Up to count matches, each being [id, title, types[], authors[], topics[], notes[], physicalDescriptions[], sources[]]
 */
Smithsonian.searchUnfiltered = function(term, count = 100, skip = 0) {
    return this._raw_search(term, count, skip, () => true);
};

/**
 * Search and return up to count matching items (only ones with images)
 * 
 * @param {String} term Term to search for
 * @param {BoundedNumber<0>=} count Maximum number of items to return
 * @param {BoundedNumber<0>=} skip Number of items to skip from beginning
 * @returns {Array} Up to count matches, each being [id, title, types[], authors[], topics[], notes[], physicalDescriptions[], sources[]]
 */
Smithsonian.searchFiltered = function(term, count = 100, skip = 0) {
    return this._raw_search(term, count, skip, item => {
        const desc = item.content.descriptiveNonRepeating;
        return 'online_media' in desc && listify(desc.online_media.media).length != 0;
    });
};

/**
 * Gets the image urls (0 or more) associated with the given object
 * 
 * @param {String} id ID of an object returned from search
 */
Smithsonian.imageURLs = function(id) {
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
 * Gets an image associated with the given object
 * 
 * @param {String} id ID of an object returned from search
 */
Smithsonian.getImage = function(id) {
    return this.imageURLs(id).then(urls => urls.length == 0 ? '' : this._sendImage({url:urls[0]})).catch(() => '');
};

module.exports = Smithsonian;
