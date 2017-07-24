const ApiConsumer = require('../utils/api-consumer');
const thingspeakIoT = new ApiConsumer('thingspeakIoT',
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
    return data.feeds.map(tag => {
        let resultObj = {
            Time: tag.created_at.match(/\d{2}:\d{2}/)[0],
        };
        for (let field in fieldMap) {
            if (fieldMap.hasOwnProperty(field)) {
                resultObj[fieldMap[field]] = tag[field];
            }
        }
        return resultObj;
    });
};

let detailParser = item => {
    if (!item.latitude || !item.longitude) return null;
    return {
        id: item.id,
        name: item.name,
        description: item.description,
        latitude: item.latitude,
        longitude: item.longitude,
        tags: (function(data) {
            return data.map(tag => {
                return tag.name;
            });
        })(item.tags),
    };
};

let searchParser = responses => {
    let searchResults = responses.map(data => data.channels.map(detailParser)).reduce((results, singleRes) => results.concat(singleRes));
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

thingspeakIoT.searchByBoth= function(tag, latitude, longitude, distance, limit) {
    let queryOptions = {
        queryString: 'public.json?' +
        rpcUtils.encodeQueryData({
            tag: encodeURIComponent(tag),
            latitude: latitude,
            longitude: longitude,
            distance: distance === '' ? 100 : distance
        })
    };
    limit = limit || 15;
    return this._paginatedQueryOpts(queryOptions, limit).then(queryOptsList => {
        return this._sendStruct(queryOptsList, searchParser);
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

thingspeakIoT.channelDetail = function(id) {
    let queryOptions = {
        queryString: id + '.json?'
    };
    return this._sendStruct(queryOptions, detailParser);
};

module.exports = thingspeakIoT;
