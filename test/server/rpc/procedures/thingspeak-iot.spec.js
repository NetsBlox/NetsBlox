describe('thingspeak-iot', function() {
    var ThingSpeak = require('../../../../src/server/rpc/procedures/thingspeak-iot/thingspeak-iot'),
        RPCMock = require('../../../assets/mock-rpc'),
        utils = require('../../../assets/utils'),
        thingspeak = new RPCMock(ThingSpeak);
    
    before(function() {
        thingspeak = new RPCMock(ThingSpeak);
    });
    
    utils.verifyRPCInterfaces(thingspeak, [
        ['searchByTag', ['tag']],
        ['searchByLocation', ['latitude', 'longitude', 'distance']],
        ['channelFeed', ['id', 'numResult']],
        ['privateChannelFeed', ['id', 'numResult', 'apiKey']],
        ['channelDetail', ['id']]
    ]);
});