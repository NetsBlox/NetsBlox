const ApiConsumer = require('../utils/api-consumer');
const thingspeakIoT = new ApiConsumer('thingspeakIoT',
    'https://api.thingspeak.com/channels/');

function encodeQueryData(options) {
    let ret = [];
    for (let d in options)
        ret.push(encodeURIComponent(d) + '=' + encodeURIComponent(options[d]));
    return ret.join('&');
}

function getFieldName(data) {
    let result = {};
    for (var prop in data) {
        if (data.hasOwnProperty(prop) && prop.match(/field\d/)) {
            var matchGroup = prop.match(/field\d/)[0];
            result[matchGroup] = data[matchGroup];
        }
    }
    return result;
}

thingspeakIoT.searchPublicChannel = function(tagString) {
    let queryOptions = {
        queryString: tagString !== '' ? 'public.json?' +
            encodeQueryData({
                tag: encodeURIComponent(tagString),
            }) : 'public.json',
    };
    let parser = data => {
        return data.channels.map(item => {
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
        });
    };
    return this._sendStruct(queryOptions, parser);
};

let feedParser = data => {
    let fieldMap = getFieldName(data.channel);
    return data.feeds.map(tag => {
        let resultObj = {
            created_at: tag.created_at,
        };
        for (let field in fieldMap) {
            if (fieldMap.hasOwnProperty(field)) {
                resultObj[fieldMap[field]] = tag[field];
            }
        }
        return resultObj;
    });
};

thingspeakIoT.channelFeed = function(id, numResult) {
    let queryOptions = {
        queryString: id + '/feeds.json?' + encodeQueryData({
            results: numResult,
        }),
    };
    return feedParser
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
    let parser = item => {
        return {
            id: item.id,
            name: item.name,
            description: item.description,
            latitude: item.latitude,
            longitude: item.longitude
        };
    };
    return this._sendStruct(queryOptions, parser);
};

module.exports = thingspeakIoT;