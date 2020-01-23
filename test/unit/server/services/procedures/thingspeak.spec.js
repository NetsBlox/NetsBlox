describe('thing-speak', function() {
    const utils = require('../../../../assets/utils');

    utils.verifyRPCInterfaces('Thingspeak', [
        ['searchByTag', ['tag', 'limit']],
        ['searchByLocation', ['latitude', 'longitude', 'distance', 'limit']],
        ['searchByTagAndLocation', ['tag','latitude', 'longitude', 'distance']],
        ['channelFeed', ['id', 'numResult']],
        ['privateChannelFeed', ['id', 'numResult', 'apiKey']],
        ['channelDetails', ['id']]
    ]);
});
