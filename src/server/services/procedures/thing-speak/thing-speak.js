/**
 * The ThingSpeak Service provides access to the ThingSpeak IoT analytics platform.
 * For more information, check out https://thingspeak.com/.
 *
 * Terms of use: https://thingspeak.com/pages/terms
 * @service
 */
const ApiConsumer = require('../utils/api-consumer');
const thingspeakIoT = new ApiConsumer('Thingspeak', 'https://api.thingspeak.com/channels/');
const rpcUtils = require('../utils');
const {RPCError} = rpcUtils;

function feedParser(data) {
    const fieldMap = {};
    const channel = data.channel;
    for (const prop in channel) {
        if (channel.hasOwnProperty(prop) && prop.match(/field\d/)) {
            const matchGroup = prop.match(/field\d/)[0];
            fieldMap[matchGroup] = channel[matchGroup];
        }
    }
    return data.feeds.map(entry => {
        const resultObj = {
            Time: new Date(entry.created_at),
        };

        for (const field in fieldMap) {
            if (fieldMap.hasOwnProperty(field)) {
                resultObj[fieldMap[field]] = entry[field];
            }
        }
        return resultObj;
    });
}
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

const TRUE = () => true;
function getUpdatedSincePred(updatedSince) {
    if (!updatedSince) return TRUE;

    const cutoff = updatedSince.getTime() / 1000;
    const now = new Date().getTime() / 1000;

    return async function (v) {
        const meta = await thingspeakIoT._requestData({ path: `${v.id}/feeds/last_data_age.json` });
        return now - +meta.last_data_age >= cutoff;
    };
}

thingspeakIoT._paginatedSearch = async function(path, query, limit=15, pred=TRUE) {
    if (limit < 1) return [];

    query.page = 1;
    const first = await this._requestData({ path, queryString: rpcUtils.encodeQueryData(query) });
    const totalPages = Math.ceil(first.pagination.total_entries / first.pagination.per_page);
    const pagesPerIter = 8;

    const final = [];
    for (let iter = 1; iter <= 128 && query.page <= totalPages; ++iter) {
        const endPage = Math.min(query.page + pagesPerIter, totalPages);
        const requests = [];
        for (; query.page <= endPage; ++query.page) {
            requests.push(this._requestData({ path, queryString: rpcUtils.encodeQueryData(query) }));
        }
        const results = await Promise.all(requests);

        const items = [];
        for (const res of results) {
            for (const item of res.channels) {
                items.push(item);
            }
        }

        const beforeInclude = final.length;
        const keepFlags = await Promise.all(items.map(pred));
        for (let i = 0; i < items.length; ++i) {
            if (!keepFlags[i]) continue;
            final.push(detailParser(items[i]));
            if (final.length >= limit) return final;
        }

        const keptFrac = (final.length - beforeInclude) / items.length;
        this._logger.info(`paginatedSearch - ${final.length} items after iter ${iter} (kept ${100 * keptFrac}%)`);
    }
    return final;
};

/**
 * Search for ThingSpeak channels by tag.
 *
 * @param {String} tag tag to search for
 * @param {Number=} limit max number of results to return (default ``15``)
 * @param {Date=} updatedSince only include results which have (some) new data since this date (default no time-based filtering)
 * @returns {Array<Object>} search results
 */
thingspeakIoT.searchByTag = function(tag, limit=15, updatedSince=null) {
    const pred = getUpdatedSincePred(updatedSince);
    return this._paginatedSearch('public.json', { tag: encodeURIComponent(tag) }, limit, pred).catch(this._handleError);
};

/**
 * Search for channels by location.
 *
 * @param {Latitude} latitude latitude to search near
 * @param {Longitude} longitude longitude to search near
 * @param {BoundedNumber<0>=} distance max distance from location in meters (default ``100000`` = 100Km)
 * @param {Number=} limit max number of results to return (default ``15``)
 * @param {Date=} updatedSince only include results which have (some) new data since this date (default no time-based filtering)
 * @returns {Array<Object>} search results
 */
thingspeakIoT.searchByLocation = function(latitude, longitude, distance=100000, limit=15, updatedSince=null) {
    distance /= 1000; // convert to Km for Thingspeak API
    const pred = getUpdatedSincePred(updatedSince);
    return this._paginatedSearch('public.json', { latitude, longitude, distance }, limit, pred).catch(this._handleError);
};

/**
 * Search for channels by tag and location.
 *
 * @param {String} tag tag to search for
 * @param {Latitude} latitude latitude to search near
 * @param {Longitude} longitude longitude to search near
 * @param {BoundedNumber<0>=} distance max distance from location in meters (default ``100000`` = 100Km)
 * @param {Number=} limit max number of results to return (default ``15``)
 * @param {Date=} updatedSince only include results which have (some) new data since this date (default no time-based filtering)
 * @returns {Array<Object>} search results
 */
thingspeakIoT.searchByTagAndLocation = function(tag, latitude, longitude, distance=100000, limit=15, updatedSince=null) {
    distance /= 1000; // convert to Km for Thingspeak API
    const updatedSincePred = getUpdatedSincePred(updatedSince);
    const pred = v => {
        if ((v.tags || []).every(t => !(t.name || '').includes(tag))) {
            return false;
        }
        return updatedSincePred(v);
    };
    return this._paginatedSearch('public.json', { latitude, longitude, distance }, limit, pred).catch(this._handleError);
};

/**
 * Get channel feed.
 *
 * @param {String} id
 * @param {Number} numResult
 */
thingspeakIoT.channelFeed = function(id, numResult) {
    const queryOptions = {
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
    const queryOptions = {
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
    const details = detailParser(data);
    const options = {
        path: id + '/feeds.json',
        queryString: '?results=10'
    };
    const resp = await this._requestData(options).catch(this._handleError);
    details.updated_at = new Date(resp.channel.updated_at);
    details.total_entries = resp.channel.last_entry_id;
    details.fields = [];
    for (const prop in resp.channel) {
        if (resp.channel.hasOwnProperty(prop) && prop.match(/field\d/)) {
            const match = prop.match(/field\d/)[0];
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
