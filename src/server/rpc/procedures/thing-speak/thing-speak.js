/**
 * The ThingSpeak Service provides access to real-time and historical stock price data.
 * For more information, check out https://thingspeak.com/.
 *
 * Terms of use: https://thingspeak.com/pages/terms
 * @service
 */
const ApiConsumer = require('../utils/api-consumer');
const thingspeakIoT = new ApiConsumer('Thingspeak',
    'https://api.thingspeak.com/channels/');
const rpcUtils = require('../utils');

let feedParser = data => {
    let fieldMap = {};
    let channel = data.channel;
    for (var prop in channel) {
        if (channel.hasOwnProperty(prop) && prop.match(/field\d/)) {
            var matchGroup = prop.match(/field\d/)[0];
            fieldMap[matchGroup] = channel[matchGroup];
        }
    }
    return data.feeds.map(entry => {
        let resultObj = {
            Time: new Date(entry.created_at),
        };
        for (let field in fieldMap) {
            if (fieldMap.hasOwnProperty(field)) {
                resultObj[fieldMap[field]] = entry[field];
            }
        }
        return resultObj;
    });
};

let detailParser = item => {
    let metaData = {
        id: item.id,
        name: item.name,
        description: item.description,
        created_at: new Date(item.created_at),
        latitude: item.latitude,
        longitude: item.longitude,
        tags: (function(data) {
            return data.map(tag => {
                return tag.name;
            });
        })(item.tags),
    };
    if (!metaData.latitude || !metaData.longitude || metaData.latitude == 0.0){
        delete metaData.latitude;
        delete metaData.longitude;
    }
    return metaData;
};

let searchParser = responses => {
    let searchResults = responses.map(data => data.channels.map( item => {
        let details = detailParser(item);
        if (!details.latitude) return null;
        return details;
    })).reduce((results, singleRes) => results.concat(singleRes));
    return searchResults;
};

thingspeakIoT._paginatedQueryOpts = function(queryOpts, limit) {
    return this._requestData(queryOpts).then(resp => {
        const perPage = resp.pagination.per_page;
        const availablePages = Math.ceil(resp.pagination.total_entries / perPage);
        const pages = Math.min(availablePages, Math.ceil(limit/perPage));
        let queryOptsList = [];
        for(let i = 1; i <= pages; i++){
            queryOptsList.push({
                queryString: queryOpts.queryString + `&page=${i}`
            });
        }
        return queryOptsList;
    });
};

thingspeakIoT.searchByTag = function(tag, limit) {
    let queryOptions = {
        queryString: tag !== '' ? 'public.json?' +
            rpcUtils.encodeQueryData({
                tag: encodeURIComponent(tag),
            }) : 'public.json',
    };
    limit = limit || 15;
    return this._paginatedQueryOpts(queryOptions, limit).then(queryOptsList => {
        return this._sendStruct(queryOptsList, searchParser);
    });
};

thingspeakIoT.searchByLocation = function(latitude, longitude, distance, limit) {
    let queryOptions = {
        queryString: 'public.json?' +
            rpcUtils.encodeQueryData({
                latitude: latitude,
                longitude: longitude,
                distance: distance === '' ? 100 : distance
            })
    };
    limit = limit || 15;
    return this._paginatedQueryOpts(queryOptions, limit).then(queryOptsList => {
        return this._sendStruct(queryOptsList, searchParser);
    });};

thingspeakIoT.searchByTagAndLocation= function(tag, latitude, longitude, distance) {
    let queryOptions = {
        queryString: 'public.json?' +
        rpcUtils.encodeQueryData({
            latitude: latitude,
            longitude: longitude,
            distance: distance === '' ? 100 : distance
        })
    };
    return this._paginatedQueryOpts(queryOptions, 10000).then(queryOptsList => {
        return this._requestData(queryOptsList).then( resultsArr => {
            let results = searchParser(resultsArr).filter(item => item.tags.some(item => item.toLowerCase().indexOf(tag) !== -1));
            this._logger.info('responding with', results.length, 'results');
            return rpcUtils.jsonToSnapList(results);
        });
    });};

thingspeakIoT.channelFeed = function(id, numResult) {
    let queryOptions = {
        queryString: id + '/feeds.json?' + rpcUtils.encodeQueryData({
            results: numResult,
        }),
    };
    return this._sendStruct(queryOptions, feedParser);
};

thingspeakIoT.privateChannelFeed = function(id, numResult, apiKey) {
    if (apiKey !== '') {
        let queryOptions = {
            queryString: id + '/feeds.json?' + rpcUtils.encodeQueryData({
                api_key: apiKey,
                results: numResult,
            }),
        };
        return this._sendStruct(queryOptions, feedParser);
    } else {
        this.response.status(404).send('API key is blank');
    }
};

/**
 * Get various details about the channel, including location, fields, tags and name.
 * @param {Number} id channel ID
 * @returns {Object} Channel details.
 */

thingspeakIoT.channelDetails = function(id) {
    return this._requestData({queryString: id + '.json?'}).then( data => {
        let details = detailParser(data);
        return this._requestData({queryString: id + '/feeds.json?results=10'})
            .then( resp => {
                details.updated_at = new Date(resp.channel.updated_at);
                details.total_entries = resp.channel.last_entry_id;
                details.fields = [];
                for(var prop in resp.channel) {
                    if (resp.channel.hasOwnProperty(prop) && prop.match(/field\d/)) {
                        let match = prop.match(/field\d/)[0];
                        details.fields.push(resp.channel[match]);
                    }
                }
                details.feeds = feedParser(resp);
                this._logger.info(`channel ${id} details`, details);
                return rpcUtils.jsonToSnapList(details);
            });
    });
};

module.exports = thingspeakIoT;
