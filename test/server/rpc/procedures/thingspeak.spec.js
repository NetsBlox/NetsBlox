describe('thing-speak', function() {
    var ThingSpeak = require('../../../../src/server/rpc/procedures/thing-speak/thing-speak'),
        RPCMock = require('../../../assets/mock-rpc'),
        utils = require('../../../assets/utils'),
        thingspeak = new RPCMock(ThingSpeak);

    before(function() {
        thingspeak = new RPCMock(ThingSpeak);
    });

    utils.verifyRPCInterfaces(thingspeak, [
        ['searchByTag', ['tag', 'limit']],
        ['searchByLocation', ['latitude', 'longitude', 'distance', 'limit']],
        ['searchByTagAndLocation', ['tag','latitude', 'longitude', 'distance']],
        ['channelFeed', ['id', 'numResult']],
        ['privateChannelFeed', ['id', 'numResult', 'apiKey']],
        ['channelDetails', ['id']]
    ]);
});
