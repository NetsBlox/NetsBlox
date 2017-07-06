const ApiConsumer = require('../utils/api-consumer');
const thingspeakIoT = new ApiConsumer('thingspeakIoT',
    'https://api.thingspeak.com/channels/');

function encodeQueryData(options) {
    let ret = [];
    for (let d in options)
        ret.push(encodeURIComponent(d) + '=' + encodeURIComponent(options[d]));
    return ret.join('&');
}

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

thingspeakIoT.searchPublicChannel = function(tagString) {
    let queryOptions = {
        queryString: tagString !== '' ? 'public.json?' +
            encodeQueryData({
                tag: encodeURIComponent(tagString),
            }) : 'public.json',
    };
    let parser = data => {
        return data.channels.map(detailParser);
    };
    return this._sendStruct(queryOptions, parser);
};

thingspeakIoT.channelFeed = function(id, numResult) {
    let queryOptions = {
        queryString: id + '/feeds.json?' + encodeQueryData({
            results: numResult,
        }),
    };
    return this._sendStruct(queryOptions, feedParser)
};

thingspeakIoT.privateChannelFeed = function(id, numResult, apiKey) {
    if (apiKey !== '') {
        let queryOptions = {
            queryString: id + '/feeds.json?' + encodeQueryData({
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