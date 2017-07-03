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

thingspeakIoT.publicChannel = function(tagString) {
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

thingspeakIoT.channelFeed = function(id, numResult) {
    let queryOptions = {
        queryString: id + '/feeds.json?' + encodeQueryData({
            results: numResult,
        }),
    };
    let parser = data => {
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
    return this._sendStruct(queryOptions, parser);
};

module.exports = thingspeakIoT;