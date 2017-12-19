describe('thing-speak', function() {
    const utils = require('../../../../assets/utils');
    var ThingSpeak = utils.reqSrc('rpc/procedures/thing-speak/thing-speak'),
        RPCMock = require('../../../../assets/mock-rpc'),
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
