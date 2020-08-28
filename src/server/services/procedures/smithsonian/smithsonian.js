/**
 * The Smithsonian Service provides access to the Smithsonan open-access EDAN database,
 * containing catalogued information on millions of historical items.
 * 
 * @service
 */
'use strict';

const ApiConsumer = require('../utils/api-consumer');
const {SmithsonianKey} = require('../utils/api-key');
const Smithsonian = new ApiConsumer('Smithsonian', 'https://api.si.edu/openaccess/api/v1.0', {cache: {ttl: 5*60}});
ApiConsumer.setRequiredApiKey(Smithsonian, SmithsonianKey);

/**
 * Searches the EDAN db and returns up to count ids denoting matching historical objects
 * 
 * @param {String} term Term to search for
 * @param {BoundedNumber<0>} start Starting index of search (default 0)
 * @param {BoundedNumber<0>} count Maximum number of ids to return (default 10)
 * @returns {Array} Up to count matching ids
 */
Smithsonian.search = function(term, start, count) {
    return this._requestData({path:'search', queryString:`api_key=${this.apiKey.value}&q=${term}&start=${start}&rows=${count}`})
        .then(res => {
            let ids = [];
            for (const item of res.response.rows) {
                if ('online_media' in item.content.descriptiveNonRepeating) {
                    ids.push(item.id);
                }
            }
            return ids;
        })
        .catch(err => this.response.status(500).send(err));
};

/**
 * Looks up the entry with given id and returns its db entry
 * 
 * @param {String} id Id to look up
 */
Smithsonian._content = function(id) {
    return this._requestData({path:`content/${id}`, queryString:`api_key=${this.apiKey.value}`});
};
/**
 * Gets the content for the given id and queries the returned JSON object using the provided query
 * 
 * @param {String} id Id to look up
 * @param {String} query JSON query string to use
 */
Smithsonian._contentQuery = function(id, query) {
    return this._content(id).then(res => this.__queryJson(res, query)).catch(err => this.response.status(500).send(err));
};

/** 
 * Gets the title for the given object
 * 
 * @param {String} id Id to use (see search)
 */
Smithsonian.title = id => Smithsonian._contentQuery(id, 'response.title');
/** 
 * Gets the stored hash for the given object
 * 
 * @param {String} id Id to use (see search)
 */
Smithsonian.hash = id => Smithsonian._contentQuery(id, 'response.hash');
/** 
 * Gets the stored doc signature for the given object
 * 
 * @param {String} id Id to use (see search)
 */
Smithsonian.docSignature = id => Smithsonian._contentQuery(id, 'response.docSignature');
/** 
 * Gets the timestamp for the given object
 * 
 * @param {String} id Id to use (see search)
 */
Smithsonian.timestamp = id => Smithsonian._contentQuery(id, 'response.timestamp');
/** 
 * Gets the last time the given object was updated
 * 
 * @param {String} id Id to use (see search)
 */
Smithsonian.lastTimeUpdated = id => Smithsonian._contentQuery(id, 'response.lastTimeUpdated');
/** 
 * Gets the unit code for the given object
 * 
 * @param {String} id Id to use (see search)
 */
Smithsonian.unitCode = id => Smithsonian._contentQuery(id, 'response.unitCode');

/**
 * Gets the thumbnail urls (0 or more) associated with the given object
 * 
 * @param {String} id Id to use (see search)
 */
Smithsonian.thumbnailUrls = function(id) {
    return Smithsonian._content(id)
        .then(res => {
            let urls = [];
            for (const item of res.response.content.descriptiveNonRepeating.online_media.media) {
                urls.push(item.thumbnail);
            }
            return urls;
        })
        .catch(err => this.response.status(500).send(err));
};
/**
 * Gets a thumbnail associated with the given object
 * 
 * @param {String} id Id to use (see search)
 */
Smithsonian.thumbnail = function(id) {
    return this.thumbnailUrls(id)
        .then(urls => this._sendImage({url:urls[0]}))
        .catch(err => this.response.status(500).send(err));
};

module.exports = Smithsonian;
