/**
 * The ThingSpeak Service provides access to the ThingSpeak IoT analytics platform.
 * For more information, check out https://thingspeak.com/.
 *
 * Terms of use: https://thingspeak.com/pages/terms
 * @service
 */
const ApiConsumer = require('../utils/api-consumer');
const thingspeakIoT = new ApiConsumer('Thingspeak',
    'https://api.thingspeak.com/channels/');
const rpcUtils = require('../utils');
const {RPCError} = rpcUtils;

let feedParser = data => {
    let fieldMap = {};
    let channel = data.channel;
    for (var prop in channel) {
        if (!!Object.getOwnPropertyDescriptor(channel, prop) && prop.match(/field\d/)) {
            var matchGroup = prop.match(/field\d/)[0];
            fieldMap[matchGroup] = channel[matchGroup];
        }
    }
    return data.feeds.map(entry => {
        let resultObj = {
            Time: new Date(entry.created_at),
        };
        for (let field in fieldMap) {
            if (Object.getOwnPropertyDescriptor(fieldMap, field)) {
                resultObj[fieldMap[field]] = entry[field];
            }
        }
        return resultObj;
    });
};

function detailParser(item) {
    const dat = {
        id: item.id,
        name: item.name,
        description: item.description,
        created_at: new Date(item.created_at),
        latitude: item.latitude,
        longitude: item.longitude,
        tags: item.tags.map(t => t.name),
    };
    if (!dat.latitude || !dat.longitude || dat.latitude == 0.0) {
        delete dat.latitude;
        delete dat.longitude;
    }
    return dat;
}

thingspeakIoT._paginatedSearch = async function(path, query, limit=15) {
    if (limit < 1) return [];

    query.page = 1;
    const first = await this._requestData({ path, queryString: rpcUtils.encodeQueryData(query) });
    const totalPages = Math.ceil(first.pagination.total_entries / first.pagination.per_page);
    const pages = Math.min(totalPages, Math.ceil(limit / first.pagination.per_page));
    
    const requests = [];
    for (query.page = 1; query.page <= pages; ++query.page) {
        requests.push(this._requestData({ path, queryString: rpcUtils.encodeQueryData(query) }));
    }
    const results = await Promise.all(requests);

    const items = [];
    for (const res of results) {
        for (const item of res.channels) {
            items.push(detailParser(item));
            if (items.length >= limit) break;
        }
    }
    return items;
};

/**
 * Search for ThingSpeak channels by tag.
 *
 * @param {String} tag
 * @param {Number=} limit
 */
thingspeakIoT.searchByTag = function(tag, limit) {
    return this._paginatedSearch('public.json', { tag: encodeURIComponent(tag) }, limit).catch(this._handleError);
};

/**
 * Search for channels by location.
 *
 * @param {Latitude} latitude
 * @param {Longitude} longitude
 * @param {BoundedNumber<0>=} distance
 * @param {Number=} limit
 */
thingspeakIoT.searchByLocation = function(latitude, longitude, distance, limit) {
    return this._paginatedSearch('public.json', { latitude, longitude, distance: distance !== undefined ? distance:  100 }, limit).catch(this._handleError);
};

/**
 * Search for channels by tag and location.
 *
 * @param {String} tag
 * @param {Latitude} latitude
 * @param {Longitude} longitude
 * @param {BoundedNumber<0>=} distance
 * @param {Number=} limit
 */
thingspeakIoT.searchByTagAndLocation = async function(tag, latitude, longitude, distance, limit=15) {
    if (limit < 1) return [];
    const res = await this._paginatedSearch('public.json', { latitude, longitude, distance: distance !== undefined ? distance : 100 }, 10000).catch(this._handleError);

    const items = [];
    for (const item of res) {
        if (item.tags.some(t => t.includes(tag))) {
            items.push(item);
            if (items.length >= limit) break;
        }
    }
    return items;
};

/**
 * Get channel feed.
 *
 * @param {String} id
 * @param {Number} numResult
 */
thingspeakIoT.channelFeed = function(id, numResult) {
    let queryOptions = {
        path: id + '/feeds.json',
        queryString: '?' + rpcUtils.encodeQueryData({
            results: numResult,
        }),
    };
    return this._sendStruct(queryOptions, feedParser).catch(this._handleError);
};

/**
 * Request data from a private channel
 *
 * @param {String} id ID of the private channel feed
 * @param {Number} numResult Number of results to fetch
 * @param {String} apiKey Thingspeak API key
 */
thingspeakIoT.privateChannelFeed = function(id, numResult, apiKey) {
    let queryOptions = {
        path: id + '/feeds.json',
        queryString: '?' + rpcUtils.encodeQueryData({
            api_key: apiKey,
            results: numResult,
        }),
    };
    return this._sendStruct(queryOptions, feedParser).catch(this._handleError);
};

/**
 * Get various details about the channel, including location, fields, tags and name.
 * @param {Number} id channel ID
 * @returns {Object} Channel details.
 */
thingspeakIoT.channelDetails = async function(id) {
    const data = await this._requestData({path: id + '.json'}).catch(this._handleError);
    let details = detailParser(data);
    const options = {
        path: id + '/feeds.json',
        queryString: '?results=10'
    };
    const resp = await this._requestData(options).catch(this._handleError);
    details.updated_at = new Date(resp.channel.updated_at);
    details.total_entries = resp.channel.last_entry_id;
    details.fields = [];
    for(let prop in resp.channel) {
        if (!!Object.getOwnPropertyDescriptor(resp.channel, prop) && prop.match(/field\d/)) {
            let match = prop.match(/field\d/)[0];
            details.fields.push(resp.channel[match]);
        }
    }
    details.feeds = feedParser(resp);
    this._logger.info(`channel ${id} details`, details);
    return rpcUtils.jsonToSnapList(details);
};

thingspeakIoT._handleError = function (err) {
    throw new RPCError(err?.error?.error);
};

module.exports = thingspeakIoT;
