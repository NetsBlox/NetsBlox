const utils = require('../../../../assets/utils');

describe(utils.suiteName(__filename), function() {
    utils.verifyRPCInterfaces('Thingspeak', [
        ['searchByTag', ['tag', 'limit', 'updatedSince']],
        ['searchByLocation', ['latitude', 'longitude', 'distance', 'limit', 'updatedSince']],
        ['searchByTagAndLocation', ['tag','latitude', 'longitude', 'distance', 'limit', 'updatedSince']],
        ['channelFeed', ['id', 'numResult']],
        ['privateChannelFeed', ['id', 'numResult', 'apiKey']],
        ['channelDetails', ['id']]
    ]);
});
