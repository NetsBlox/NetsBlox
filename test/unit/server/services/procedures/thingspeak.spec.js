const utils = require('../../../../assets/utils');

describe(utils.suiteName(__filename), function() {
    utils.verifyRPCInterfaces('Thingspeak', [
        ['searchByTag', ['tag', 'limit']],
        ['searchByLocation', ['latitude', 'longitude', 'distance', 'limit']],
        ['searchByTagAndLocation', ['tag','latitude', 'longitude', 'distance', 'limit']],
        ['channelFeed', ['id', 'numResult']],
        ['privateChannelFeed', ['id', 'numResult', 'apiKey']],
        ['channelDetails', ['id']]
    ]);
});
