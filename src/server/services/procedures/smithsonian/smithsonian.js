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

/**
 * Searches the EDAN db and returns up to count ids denoting matching historical objects
 * 
 * @param {String} term Term to search for
 * @param {BoundedNumber<0>} skip Number of items to skip from search search
 * @param {BoundedNumber<0>} count Maximum number of items to return
 * @returns {Array} Up to count matches, each being [id, title, types[], authors[], topics[], notes[], physicalDescriptions[], sources[]]
 */
Smithsonian.search = function(term, skip, count) {
    return this._requestData({path:'search', queryString:`api_key=${this.apiKey.value}&q=${term}&start=${skip}&rows=${count}`}).then(res => {
        let ids = [];
        for (const item of res.response.rows) {
            if (!('online_media' in item.content.descriptiveNonRepeating)) continue; // unfortunately they don't have built-in support for filtering to only with img

            const notes = [];
            if ('notes' in item.content.freetext) {
                for (const note of listify(item.content.freetext.notes)) {
                    notes.push(note.content);
                }
            }

            const physicalDescriptions = [];
            if ('physicalDescription' in item.content.freetext) {
                for (const desc of listify(item.content.freetext.physicalDescription)) {
                    physicalDescriptions.push(`${desc.label} -- ${desc.content}`); // '--' serves as a separator for the user
                }
            }

            const sources = [];
            if ('dataSource' in item.content.freetext) {
                for (const src of listify(item.content.freetext.dataSource)) {
                    sources.push(`${src.label} -- ${src.content}`); // '--' serves as a separator for the user
                }
            }

            const entry = [
                item.id,
                item.title,
                listify(item.content.indexedStructured.object_type),
                listify(item.content.indexedStructured.name),
                listify(item.content.indexedStructured.topic),
                notes,
                physicalDescriptions,
                sources,
            ];
            ids.push(entry);
        }
        return ids;
    });
};

/**
 * Gets the image urls (0 or more) associated with the given object
 * 
 * @param {Array} entry Entry returned from search()
 */
Smithsonian.imageURLs = function(entry) {
    return this._requestData({path:`content/${entry[0]}`, queryString:`api_key=${this.apiKey.value}`}).then(res => {
        let urls = [];
        for (const item of listify(res.response.content.descriptiveNonRepeating.online_media.media)) {
            urls.push(item.thumbnail);
        }
        return urls;
    });
};

/**
 * Gets an image associated with the given object
 * 
 * @param {Array} entry Entry returned from search()
 */
Smithsonian.getImage = function(entry) {
    return this.imageURLs(entry).then(urls => this._sendImage({url:urls[0]}));
};

module.exports = Smithsonian;
